-- ============================================================
-- Pilotage — brique rôles : admin vs salarié réellement appliqués
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Bootstrap : le premier compte activé (le tien, actuellement seul
-- connecté) devient admin. Si ce n'est pas le bon compte une fois
-- exécuté, ajuste manuellement : update employees set role='admin'
-- where email = 'ton.email@structure.fr';
update employees set role = 'admin'
where id = (
  select id from employees
  where auth_user_id is not null
  order by created_at asc
  limit 1
);

create or replace function is_admin()
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from employees
    where auth_user_id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------
-- Employees : tout le monde lit l'annuaire ; seul un admin crée/
-- supprime des fiches ou change un rôle ; chacun peut modifier sa
-- propre fiche (son nom) sans pouvoir se rendre admin lui-même côté
-- interface (la restriction stricte au niveau colonne n'est pas
-- couverte par la RLS — limite acceptée à ce stade, utilisateurs
-- internes de confiance uniquement).
-- ----------------------------------------------------------------
drop policy if exists "auth_all_employees" on employees;

create policy "read_employees" on employees
  for select using (auth.role() = 'authenticated');

create policy "admin_insert_employees" on employees
  for insert with check (is_admin());

create policy "admin_delete_employees" on employees
  for delete using (is_admin());

create policy "update_own_or_admin_employees" on employees
  for update using (auth_user_id = auth.uid() or is_admin())
  with check (auth_user_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------
-- Teams : tout le monde lit, seul un admin crée/modifie/supprime
-- ----------------------------------------------------------------
drop policy if exists "auth_all_teams" on teams;

create policy "read_teams" on teams
  for select using (auth.role() = 'authenticated');

create policy "admin_write_teams" on teams
  for insert with check (is_admin());

create policy "admin_update_teams" on teams
  for update using (is_admin()) with check (is_admin());

create policy "admin_delete_teams" on teams
  for delete using (is_admin());

-- ----------------------------------------------------------------
-- Team members : tout le monde lit (annuaire des appartenances),
-- seul un admin ajoute/retire un salarié d'une équipe
-- ----------------------------------------------------------------
drop policy if exists "auth_all_team_members" on team_members;

create policy "read_team_members" on team_members
  for select using (auth.role() = 'authenticated');

create policy "admin_insert_team_members" on team_members
  for insert with check (is_admin());

create policy "admin_delete_team_members" on team_members
  for delete using (is_admin());
