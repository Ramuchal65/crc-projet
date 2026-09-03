-- ============================================================
-- Pilotage CRC — brique Gantt : date de début optionnelle
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

alter table tasks
  add column if not exists start_date date;
