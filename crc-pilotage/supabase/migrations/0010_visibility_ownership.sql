-- ============================================================
-- Pilotage — brique visibilité des tâches + droits de statut
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- Schéma
-- ----------------------------------------------------------------

-- Visibilité par défaut d'un projet : ruisselle sur ses tâches sauf
-- surcharge individuelle
alter table projects
  add column if not exists default_visibility text not null default 'public'
  check (default_visibility in ('public', 'private'));

-- Surcharge par tâche : null = hérite du projet
alter table tasks
  add column if not exists visibility text
  check (visibility in ('public', 'private'));

-- Assignation à un vrai compte salarié (distinct de responsible_name_raw,
-- qui reste le texte brut issu des CR importés)
alter table tasks
  add column if not exists assignee_employee_id uuid references employees(id);

-- ----------------------------------------------------------------
-- Fonctions
-- ----------------------------------------------------------------

create or replace function current_employee_id()
returns uuid
language sql security definer stable as $$
  select id from employees where auth_user_id = auth.uid();
$$;

create or replace function can_see_task(check_task_id uuid)
returns boolean
language sql security definer stable as $$
  select
    is_member_of_project(t.project_id)
    and (
      coalesce(t.visibility, p.default_visibility) = 'public'
      or t.created_by = current_employee_id()
      or t.assignee_employee_id = current_employee_id()
      or is_admin()
    )
  from tasks t
  join projects p on p.id = t.project_id
  where t.id = check_task_id;
$$;

-- ----------------------------------------------------------------
-- RLS tâches : on sépare SELECT (respecte la visibilité) du reste
-- (édition ouverte à toute l'équipe du projet, sauf le statut —
-- voir le trigger plus bas)
-- ----------------------------------------------------------------
drop policy if exists "team_scoped_tasks" on tasks;

create policy "select_tasks" on tasks
  for select using (can_see_task(id));

create policy "insert_tasks" on tasks
  for insert with check (is_member_of_project(project_id));

create policy "update_tasks" on tasks
  for update using (is_member_of_project(project_id)) with check (is_member_of_project(project_id));

create policy "delete_tasks" on tasks
  for delete using (is_member_of_project(project_id));

-- Commentaires : mêmes règles de visibilité que la tâche parente
drop policy if exists "team_scoped_task_comments" on task_comments;

create policy "visibility_scoped_task_comments" on task_comments
  for all using (can_see_task(task_id)) with check (can_see_task(task_id));

-- ----------------------------------------------------------------
-- Restriction du changement de statut : seuls le créateur, la
-- personne assignée, ou un admin peuvent faire évoluer le statut
-- d'une tâche. Les tâches sans créateur ni assigné défini (ex:
-- importées avant cette brique) restent ouvertes à toute l'équipe,
-- pour ne rien casser rétroactivement.
-- ----------------------------------------------------------------
create or replace function check_task_status_change()
returns trigger
language plpgsql as $$
declare
  my_id uuid;
begin
  if NEW.status is distinct from OLD.status then
    if OLD.created_by is null and OLD.assignee_employee_id is null then
      return NEW; -- tâche sans propriétaire défini : ouverte à tous
    end if;
    my_id := current_employee_id();
    if not (
      OLD.created_by = my_id
      or OLD.assignee_employee_id = my_id
      or is_admin()
    ) then
      raise exception 'Seuls le créateur, la personne assignée ou un admin peuvent changer le statut de cette tâche.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_check_task_status_change on tasks;
create trigger trg_check_task_status_change
  before update on tasks
  for each row execute function check_task_status_change();
