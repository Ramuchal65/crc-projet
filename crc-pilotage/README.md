# Pilotage CRC — Brique 1

Import de CR par IA + liste de tâches. Stack : Next.js 14 + Supabase + Gemini.

## Ce qui fonctionne dans cette brique

- Coller un CR (structuré ou en texte libre) → extraction IA en tâches + risques
- Prévisualisation éditable avant enregistrement (titre, responsable, priorité, échéance)
- Liste des tâches groupées par statut

## Pas encore fait (bricks suivantes)

- Comptes salariés / connexion (auth Supabase)
- Édition des tâches depuis la liste (statut, ordre par glisser-déposer)
- Mapping responsable → salarié réel (actuellement stocké en texte libre)
- Affichage des risques dans la liste de tâches

## Déploiement

1. **Supabase** : exécuter `supabase/migrations/0001_init.sql` dans le SQL Editor
2. **Vercel** : renseigner les 3 variables d'environnement (voir `.env.example`)
   - `GEMINI_API_KEY` : clé API Gemini (console.cloud.google.com ou aistudio.google.com)
3. **GitHub** : uploader tous les fichiers de ce repo
