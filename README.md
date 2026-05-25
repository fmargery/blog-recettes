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
