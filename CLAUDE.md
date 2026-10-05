# Notes pour Claude Code

- Appli web perso, en français, pour Fabien. Interface et commentaires en français, tutoiement dans les textes.
- Pas de framework ni d'étape de build : HTML + CSS + JS classiques, servis tels quels par GitHub Pages.
- Les fichiers de `js/` sont des scripts classiques (pas des modules) qui partagent le même espace global, chargés dans l'ordre défini dans `index.html`. Pas de doublon de nom de variable entre fichiers.
- Le sablier est dessiné sur un canvas par `js/sablier3d.js` (projection, éclairage et tri des faces faits à la main). Ne pas revenir à de la 3D en CSS : Safari affiche mal les faces qui se croisent.
- À chaque changement de fichier, incrémenter `VERSION` dans `sw.js` et garder la liste `FILES` à jour.
- Tester sur mobile en portrait (iPhone d'abord) : zones sûres (`env(safe-area-inset-*)`) et appli lancée depuis l'écran d'accueil.
- Préférences de design : interface sombre (usage le soir), effets réservés aux moments clés, rien de trop chargé.
