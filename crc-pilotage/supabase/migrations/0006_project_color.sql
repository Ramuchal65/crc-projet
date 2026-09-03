-- ============================================================
-- Pilotage CRC — brique couleur de projet personnalisable
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

alter table projects
  add column if not exists color text not null default '#3E6FA8';
