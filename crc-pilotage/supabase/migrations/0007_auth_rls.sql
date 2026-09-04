-- ============================================================
-- Pilotage — brique comptes salariés + équipes (remplace la
-- version précédente de cette migration, jamais déployée)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- Équipes et appartenance
-- ----------------------------------------------------------------
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#3E6FA8',
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, employee_id)
);

-- Chaque projet appartient désormais à une équipe
alter table projects add column if not exists team_id uuid references teams(id);

-- Équipe CRC créée pour rattacher tes projets existants (rien ne se perd)
insert into teams (name)
select 'CRC'
where not exists (select 1 from teams where name = 'CRC');

update projects
set team_id = (select id from teams where name = 'CRC')
where team_id is null;

-- ----------------------------------------------------------------
-- Fonctions utilitaires pour la RLS (security definer : évite les
-- vérifications récursives sur les tables elles-mêmes protégées par RLS)
-- ----------------------------------------------------------------
create or replace function is_member_of_team(check_team_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1
    from team_members tm
    join employees e on e.id = tm.employee_id
    where tm.team_id = check_team_id
      and e.auth_user_id = auth.uid()
  );
$$;

create or replace function is_member_of_project(check_project_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1
    from projects p
    join team_members tm on tm.team_id = p.team_id
    join employees e on e.id = tm.employee_id
    where p.id = check_project_id
      and e.auth_user_id = auth.uid()
  );
$$;

create or replace function is_member_of_task_project(check_task_id uuid)
returns boolean
language sql security definer stable as $$
  select is_member_of_project(project_id)
  from tasks where id = check_task_id;
$$;

-- ----------------------------------------------------------------
-- RLS — on retire les policies temporaires ouvertes à tous
-- ----------------------------------------------------------------
drop policy if exists "temp_open_employees" on employees;
drop policy if exists "temp_open_projects" on projects;
drop policy if exists "temp_open_cr_imports" on cr_imports;
drop policy if exists "temp_open_tasks" on tasks;
drop policy if exists "temp_open_risks" on risks;
drop policy if exists "temp_open_task_dependencies" on task_dependencies;
drop policy if exists "temp_open_task_comments" on task_comments;

alter table teams enable row level security;
alter table team_members enable row level security;

-- Annuaire salariés et liste des équipes : visibles par tout salarié
-- connecté (nécessaire pour les écrans d'assignation et de création de
-- projet). L'isolation réelle se fait au niveau des projets/tâches.
create policy "auth_all_employees" on employees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth_all_teams" on teams
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth_all_team_members" on team_members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Projets et tâches : visibles/modifiables uniquement par les membres
-- de l'équipe à laquelle ils appartiennent
create policy "team_scoped_projects" on projects
  for all using (is_member_of_team(team_id)) with check (is_member_of_team(team_id));

create policy "team_scoped_cr_imports" on cr_imports
  for all using (is_member_of_project(project_id)) with check (is_member_of_project(project_id));

create policy "team_scoped_tasks" on tasks
  for all using (is_member_of_project(project_id)) with check (is_member_of_project(project_id));

create policy "team_scoped_risks" on risks
  for all using (is_member_of_project(project_id)) with check (is_member_of_project(project_id));

create policy "team_scoped_task_dependencies" on task_dependencies
  for all using (is_member_of_task_project(task_id)) with check (is_member_of_task_project(task_id));

create policy "team_scoped_task_comments" on task_comments
  for all using (is_member_of_task_project(task_id)) with check (is_member_of_task_project(task_id));

-- ----------------------------------------------------------------
-- Rappel : pense à t'ajouter (et tes 2 collègues DPI) comme membres
-- de l'équipe CRC en plus de DPI, via la page Équipe une fois connecté.
-- ----------------------------------------------------------------
