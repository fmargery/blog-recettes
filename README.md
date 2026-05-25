# Blog Recettes

Petit carnet personnel de recettes.

## Fonctionnalites actuelles

- Liste publique des recettes
- Recherche par mot-cle
- Recherche par ingredient
- Zone admin locale
- Import d'une recette depuis un texte colle
- Reformattage automatique de base
- Ajout, modification et suppression de recettes

## Ouvrir le site en local

Double-cliquer sur `index.html`.

## Publier avec GitHub Pages

1. Creer un depot GitHub nomme `blog-recettes`.
2. Ajouter les fichiers `index.html`, `styles.css`, `app.js` et `README.md`.
3. Aller dans `Settings` > `Pages`.
4. Choisir la branche `main` et le dossier racine.
5. Ouvrir l'adresse HTTPS fournie par GitHub Pages.

## Limite actuelle

Les recettes sont enregistrees dans le navigateur avec `localStorage`.
Pour synchroniser les recettes entre plusieurs appareils, il faudra ajouter une base de donnees.

## Activer Supabase

1. Creer un projet sur Supabase.
2. Ouvrir le SQL Editor.
3. Copier le contenu de `supabase-schema.sql`.
4. Executer le script SQL.
5. Dans `Project Settings` > `API`, copier:
   - Project URL
   - anon public key
6. Coller ces valeurs dans `supabase-config.js`.
7. Republier les fichiers sur GitHub.

Tant que `supabase-config.js` est vide, le site continue de fonctionner en mode local.

## Admin temporaire sans connexion

Pour eviter le blocage de connexion email pendant les tests, le site peut fonctionner avec un admin ouvert.

Executer `supabase-open-admin.sql` dans le SQL Editor Supabase pour autoriser temporairement l'ajout, la modification et la suppression sans connexion.

Attention: toute personne qui connait l'URL du site pourra modifier les recettes. Cette configuration est pratique pour tester, mais elle devra etre remplacee par une vraie gestion des droits.

## Activer la reecriture IA

Le site appelle une Supabase Edge Function nommee `rewrite-recipe`.

1. Dans Supabase, executer `supabase-ai-schema-update.sql` dans le SQL Editor.
2. Creer une Edge Function `rewrite-recipe`.
3. Copier le contenu de `supabase/functions/rewrite-recipe/index.ts` dans cette fonction.
4. Ajouter un secret Supabase nomme `OPENAI_API_KEY` avec ta cle API OpenAI.
5. Deployer la fonction.
6. Republier `index.html`, `app.js`, `styles.css` et `supabase-config.js` sur GitHub.

La cle OpenAI doit rester dans Supabase. Ne jamais la mettre dans GitHub Pages, `app.js` ou `supabase-config.js`.
