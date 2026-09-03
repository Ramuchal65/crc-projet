-- ============================================================
-- Pilotage CRC — brique sous-tâches (checklist)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

alter table tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

-- Format attendu de chaque élément : { "id": "...", "title": "...", "done": false }
