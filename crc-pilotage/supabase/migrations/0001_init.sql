-- ============================================================
-- Pilotage CRC — schéma initial (brique 1)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Salariés (liés à un compte auth Supabase une fois qu'ils se connectent)
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text unique,
  role text not null default 'salarie', -- 'admin' | 'salarie'
  created_at timestamptz not null default now()
);

-- Projets (le pilotage CRC est un projet, d'autres pourront s'ajouter)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Import brut d'un CR, avant ou après extraction — traçabilité
create table if not exists cr_imports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  raw_text text not null,
  imported_by uuid references employees(id),
  cr_title text,
  cr_date date,
  created_at timestamptz not null default now()
);

-- Tâches
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  cr_import_id uuid references cr_imports(id) on delete set null, -- null si saisie manuelle
  ref_source text, -- ex "T01", l'identifiant original du CR si présent
  title text not null,
  description text,
  responsible_employee_id uuid references employees(id),
  responsible_name_raw text, -- fallback si le nom n'a pas pu être matché à un salarié
  task_type text, -- 'technique' | 'decisionnel' | libre
  priority text not null default 'moyenne', -- 'haute' | 'moyenne' | 'basse'
  status text not null default 'a_faire', -- 'a_faire' | 'en_cours' | 'fait' | 'bloque'
  due_date_raw text, -- ce qui était écrit dans le CR ("Sept. 2026", "avant sept.")
  due_date date, -- normalisée, nullable si ambiguë
  order_index int not null default 0,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Risques / points de vigilance, éventuellement liés à une tâche
create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  cr_import_id uuid references cr_imports(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  level text not null, -- 'critique' | 'eleve' | 'modere'
  description text not null,
  impact text,
  recommendation text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_risks_project on risks(project_id);

-- ============================================================
-- RLS — TEMPORAIRE pour la brique 1 (pas encore d'authentification).
-- Ouvert à tous (y compris anonyme) pour que tu puisses tester le
-- flux d'import dès maintenant. À DURCIR dans la brique "auth salariés"
-- (remplacer `using (true)` par des policies basées sur auth.uid()).
-- ============================================================

alter table employees enable row level security;
alter table projects enable row level security;
alter table cr_imports enable row level security;
alter table tasks enable row level security;
alter table risks enable row level security;

create policy "temp_open_employees" on employees for all using (true) with check (true);
create policy "temp_open_projects" on projects for all using (true) with check (true);
create policy "temp_open_cr_imports" on cr_imports for all using (true) with check (true);
create policy "temp_open_tasks" on tasks for all using (true) with check (true);
create policy "temp_open_risks" on risks for all using (true) with check (true);

-- ============================================================
-- Données de départ
-- ============================================================
insert into projects (name, description)
values ('Pilotage CRC', 'Suivi des chantiers et actions du Centre de Ressources et de Compétences')
on conflict do nothing;
