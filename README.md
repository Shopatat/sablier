# Le sablier du tombeau

Minuteur pomodoro en forme de sablier pyramidal, ambiance tombeau égyptien.
Appli web sans installation : du HTML, du CSS et du JavaScript, rien à compiler.

## Mettre l'appli en ligne avec GitHub Pages

1. Crée un nouveau dépôt sur GitHub (par exemple `sablier`).
2. Envoie tous les fichiers de ce dossier à la racine du dépôt (`index.html` doit être à la racine).
3. Dans le dépôt : **Settings → Pages**, source **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Au bout d'une minute ou deux, l'appli est dispo sur `https://<ton-pseudo>.github.io/sablier/`.

## L'installer sur l'iPhone

Ouvre l'adresse dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**.
L'appli s'ouvre alors en plein écran avec son icône, et marche hors ligne après la première ouverture.

## Organisation des fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page et la structure de l'interface |
| `css/style.css` | Tout le style (décor, boutons, panneau de réglages) |
| `js/reglages.js` | Réglages par défaut, sauvegarde, état du minuteur |
| `js/sablier3d.js` | Le moteur 3D qui dessine le sablier et le sable |
| `js/son.js` | Gong, carillon et bruit du sable (sons générés, aucun fichier audio) |
| `js/minuteur.js` | Logique du pomodoro, retournement, affichage du temps |
| `js/interface.js` | Panneau de réglages, boutons, raccourcis clavier |
| `js/decor.js` | Torches qui vacillent et poussière qui flotte |
| `js/demarrage.js` | Lancement de l'appli et mode hors ligne |
| `sw.js` | Service worker : met l'appli en cache pour le hors ligne |
| `manifest.webmanifest` | Nom, couleurs et icônes pour l'écran d'accueil |
| `fonts/` | Les polices Marcellus et Jost, embarquées pour marcher hors ligne |

Les scripts sont chargés dans cet ordre dans `index.html` et partagent leurs variables. Garde cet ordre.

## Après une modification

Change la valeur de `VERSION` en haut de `sw.js` (par exemple `sablier-v2`).
Sans ça, les téléphones qui ont déjà l'appli continuent d'afficher l'ancienne version.

## Tester sur l'ordinateur

Le mode hors ligne ne marche pas en ouvrant `index.html` directement (adresse en `file://`).
Pour tout tester, lance un petit serveur dans le dossier : `python3 -m http.server`, puis ouvre `http://localhost:8000`.
