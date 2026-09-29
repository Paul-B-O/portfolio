# Portfolio BTS SIO

Portfolio web statique présenté pour l'épreuve E5 du BTS SIO : parcours, compétences, réalisations professionnelles, tableau de synthèse et veille technologique.
Le site est testé et déployé automatiquement sur GitHub Pages à chaque push sur `main`.

## Prérequis

- Node.js 20+ (aucune dépendance npm à installer)
- Git

## Installation

```bash
git clone https://github.com/<utilisateur>/portfolio-bts-sio.git
cd portfolio-bts-sio
cp .env.example .env   # optionnel : change le port (3000 par défaut)
npm start
```

Le portfolio est alors disponible sur <http://localhost:3000>.

| Commande      | Rôle                                                    |
| ------------- | ------------------------------------------------------- |
| `npm start`   | Lance le serveur local                                  |
| `npm run dev` | Lance le serveur et le redémarre à chaque modification  |
| `npm test`    | Exécute tous les tests (serveur + contenu de la page)   |

Pour changer le port sans fichier `.env` : `PORT=8080 npm start`.

## Tests

Les tests utilisent le runner intégré de Node.js (`node:test`), sans dépendance :

- `tests/server.test.js` : le serveur répond en 200, sert les bons types MIME, renvoie 404 et bloque l'accès hors de `public/`.
- `tests/content.test.js` : présence des sections exigées pour l'E5, des 6 compétences du bloc 1, cohérence du tableau de synthèse, liens internes valides, pas de chemin absolu codé en dur.

## Déploiement

Le déploiement est entièrement automatisé avec GitHub Actions :

1. **CI** (`.github/workflows/ci.yml`) : lance `npm test` sur chaque pull request et chaque push hors `main`.
2. **Deploy** (`.github/workflows/deploy.yml`) : sur push dans `main`, lance les tests puis publie le dossier `public/` sur GitHub Pages. Si un test échoue, rien n'est déployé.

Mise en place (une seule fois) : dans le dépôt GitHub, **Settings → Pages → Source : GitHub Actions**.

URL de production : `https://<utilisateur>.github.io/portfolio-bts-sio/`

### Protéger la branche `main`

**Settings → Branches → Add branch ruleset** sur `main` :

- Require a pull request before merging
- Require status checks to pass → `test`
- Block force pushes

## Structure du projet

```
.
├── public/                 # Site publié (seul dossier déployé)
│   ├── index.html          # Page unique du portfolio
│   ├── css/style.css       # Styles (thème clair/sombre, responsive)
│   └── js/main.js          # Menu mobile
├── tests/                  # Tests automatisés (node:test)
├── .github/workflows/      # CI et déploiement GitHub Pages
├── server.js               # Serveur statique local, sans dépendance
├── AUDIT.md                # Grille d'audit DevOps (TP1)
└── package.json            # Scripts npm
```

## Personnaliser le portfolio

Tout le contenu est dans `public/index.html` : remplacer `Prénom Nom`, l'option (SISR/SLAM), les stages, les réalisations (RP1 à RP4) et cocher les compétences couvertes dans le tableau de synthèse. Relancer `npm test` pour vérifier que la page reste cohérente.

## Conventions de commit

Les messages suivent [Conventional Commits](https://www.conventionalcommits.org/fr/) :
`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `style:`, `refactor:`.

## Contributeurs

- Prénom Nom — BTS SIO, IIA
