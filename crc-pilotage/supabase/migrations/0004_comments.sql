-- ============================================================
-- Pilotage CRC — brique commentaires sur les tâches
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_task on task_comments(task_id);

alter table task_comments enable row level security;

-- TEMPORAIRE, comme les autres tables — à durcir à la brique auth salariés
create policy "temp_open_task_comments" on task_comments
  for all using (true) with check (true);
