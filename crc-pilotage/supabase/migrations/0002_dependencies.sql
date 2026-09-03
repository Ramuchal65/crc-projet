-- ============================================================
-- Pilotage CRC — brique dépendances entre tâches
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

create table if not exists task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create index if not exists idx_deps_task on task_dependencies(task_id);
create index if not exists idx_deps_depends_on on task_dependencies(depends_on_task_id);

alter table task_dependencies enable row level security;

-- TEMPORAIRE, comme les autres tables — à durcir à la brique auth salariés
create policy "temp_open_task_dependencies" on task_dependencies
  for all using (true) with check (true);
