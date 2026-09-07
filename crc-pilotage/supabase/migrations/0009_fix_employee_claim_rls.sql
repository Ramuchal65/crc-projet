-- ============================================================
-- Pilotage — correctif : la RLS des rôles (migration précédente)
-- bloquait par erreur la toute première liaison d'un compte salarié
-- (auth_user_id passant de null à sa vraie valeur), puisqu'à cet
-- instant précis la personne n'est ni admin, ni déjà propriétaire
-- de la ligne. On autorise explicitement ce cas de "réclamation"
-- d'une fiche pré-créée, en vérifiant que l'email correspond bien
-- à celui du compte qui se connecte.
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

drop policy if exists "update_own_or_admin_employees" on employees;

create policy "update_own_or_admin_or_claim_employees" on employees
  for update using (
    auth_user_id = auth.uid()
    or is_admin()
    or (auth_user_id is null and lower(email) = lower(auth.jwt() ->> 'email'))
  )
  with check (
    auth_user_id = auth.uid()
    or is_admin()
  );

-- Même souci pour la création automatique de secours (si personne n'a
-- pré-créé la fiche) : elle exigeait is_admin(), impossible pour
-- quelqu'un qui n'a pas encore de fiche du tout.
drop policy if exists "admin_insert_employees" on employees;

create policy "self_register_or_admin_insert_employees" on employees
  for insert with check (
    is_admin()
    or (auth_user_id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'))
  );
