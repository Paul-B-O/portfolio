# TP6 — Tests end-to-end avec Playwright (local + GitHub Actions)

Compte rendu réalisé le 30/09/2026 sur CachyOS, Node.js 26, Playwright 1.63.0.

Objectif : tester le portfolio comme un utilisateur, dans un vrai navigateur, en local et à chaque Pull Request, avec un check obligatoire avant de fusionner dans `main`.

## Travail à rendre

| Élément | Valeur |
| --- | --- |
| Pull Request | <https://github.com/Paul-B-O/portfolio/pull/6> |
| Exécution du check E2E | <https://github.com/Paul-B-O/portfolio/actions/runs/36729120208> |
| Résultat | `e2e (chromium)`, `e2e (firefox)`, `e2e (webkit)` et `e2e` : réussis |

## Adaptation au projet

Le sujet vise une application Symfony avec connexion, base de données et formulaires. Le portfolio est un site statique : pas de compte, pas de BDD, rien à créer. Les trois scénarios imposés sont remplacés par les parcours clés réels de la page :

| Scénario du sujet | Équivalent dans le portfolio | Pourquoi c'est l'équivalent |
| --- | --- | --- |
| Connexion | **Parcours de lecture** : les sections de l'E5 s'affichent, un clic dans le menu amène à la section et la surligne | C'est le parcours d'entrée de l'utilisateur (le jury) |
| Page protégée | **Accès interdit côté serveur** : sortie du dossier `public/` refusée, fichiers du projet non servis, 404 | C'est le vrai contrôle d'accès de l'application (`server.js`) |
| Création d'un objet métier | **Menu mobile** : ouverture puis fermeture après le choix d'un lien | C'est la principale interaction qui modifie l'état de la page |

Côté infrastructure :

- **Pas de base de données**, donc pas de service MySQL, de migrations ni de fixtures.
- **À la place**, les tests de la CI tournent contre la stack Docker Compose du TP4 (Nginx → Node) : on teste ce qui est réellement déployé, reverse proxy compris.

## 1) Installation de Playwright

```console
$ npm i -D @playwright/test
added 3 packages, and audited 4 packages in 5s
found 0 vulnerabilities

$ npx playwright --version
Version 1.63.0

$ npx playwright install chromium firefox webkit
BEWARE: your OS is not officially supported by Playwright; downloading fallback build for ubuntu24.04-x64.
```

`@playwright/test` est une dépendance de développement uniquement : le serveur et l'image Docker restent sans dépendance (le `Dockerfile` ne lance pas `npm install`).

Structure :

```
tests/
  e2e/
    navigation.spec.ts       # scénario 1 : parcours de lecture
    access-control.spec.ts   # scénario 2 : accès interdit
    mobile-menu.spec.ts      # scénario 3 : menu mobile
  content.test.js            # tests unitaires existants (npm test)
  server.test.js
playwright.config.ts
```

Les tests unitaires (`npm test`, motif `tests/**/*.test.js`) et les tests E2E (`npm run test:e2e`, fichiers `*.spec.ts`) cohabitent sans se mélanger.

### playwright.config.ts

Écarts avec le modèle du sujet :

- **`webServer`** : lance `node server.js` sur le port 3100 au lieu de `php -S`. Le port 3100 évite le conflit avec un `npm start` déjà lancé sur 3000.
- **`E2E_BASE_URL`** : si cette variable est définie, Playwright ne démarre aucun serveur et teste l'URL donnée. La CI s'en sert pour viser la stack Compose ; en local, on peut aussi viser `http://localhost:8081`.
- **`projects`** : Chromium, Firefox et WebKit (bonus « matrice de navigateurs »).
- **`forbidOnly` en CI** : un `test.only` oublié fait échouer la CI au lieu de sauter silencieusement les autres tests.

## 2) Les tests E2E

### Sélecteurs stables : data-testid

La page n'avait aucun `data-testid`. Ils ont été ajoutés dans `public/index.html` :

| Élément | `data-testid` |
| --- | --- |
| Bouton du menu mobile | `menu-toggle` |
| Menu de navigation | `main-nav` |
| Chaque section | `section-presentation`, `section-parcours`, … `section-contact` |
| Tableau de synthèse | `synthese-table` |

Les attributs sont placés après l'`id` : les tests unitaires existants cherchent `<section id="...">` et continuent de passer.

Les liens et boutons sont ciblés par leur rôle et leur texte (`getByRole('link', { name: 'Réalisations' })`), comme le ferait un utilisateur.

### Scénario 1 : parcours de lecture (`navigation.spec.ts`)

- La page a le bon titre, les 7 sections de l'E5 et le tableau de synthèse sont visibles.
- Un clic sur « Réalisations » dans le menu change l'URL en `#realisations`, fait défiler la page jusqu'à la section, et le lien passe en actif (`aria-current="true"`, classe `active`). C'est la fonctionnalité de la PR #2.

### Scénario 2 : accès interdit côté serveur (`access-control.spec.ts`)

- `GET /..%2fserver.js` (tentative de sortie de `public/`) est refusé et ne renvoie jamais le code source.
- `/server.js`, `/package.json`, `/.env` et `/Dockerfile` renvoient 404 : seuls les fichiers de `public/` sont servis.
- Une page inconnue renvoie 404 avec le message « Page introuvable ».

Le code de refus dépend de qui bloque la requête :

```console
$ curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:3101/..%2fserver.js'   # Node seul
403
$ curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:8090/..%2fserver.js'   # derrière Nginx
400
```

Nginx rejette la requête avant même de la transmettre à Node. Le test accepte donc 400 ou 403, et vérifie dans les deux cas que le contenu de `server.js` n'est pas renvoyé.

### Scénario 3 : menu mobile (`mobile-menu.spec.ts`)

En affichage téléphone (390 × 844) :

- Au départ, le bouton « Menu » est visible (`aria-expanded="false"`) et le menu est caché.
- Un clic ouvre le menu (`aria-expanded="true"`).
- Un clic sur « Contact » amène à `#contact` et referme le menu.

Sur ordinateur, le menu est affiché directement et le bouton est caché.

## 3) Exécution en local

```console
$ npm run test:e2e -- --project=chromium
Running 7 tests using 3 workers
  ✓  [chromium] › access-control.spec.ts › une tentative de sortie du dossier public/ est refusée (20ms)
  ✓  [chromium] › access-control.spec.ts › les fichiers du projet hors de public/ ne sont pas servis (14ms)
  ✓  [chromium] › access-control.spec.ts › une page inconnue renvoie une erreur 404 (8ms)
  ✓  [chromium] › navigation.spec.ts › la page d'accueil affiche toutes les sections de l'épreuve E5 (260ms)
  ✓  [chromium] › mobile-menu.spec.ts › le menu s'ouvre puis se referme après le choix d'un lien (318ms)
  ✓  [chromium] › mobile-menu.spec.ts › le menu est affiché directement, sans bouton (143ms)
  ✓  [chromium] › navigation.spec.ts › un clic dans le menu amène à la section et la surligne (510ms)
  7 passed (1.4s)

$ npm run test:e2e -- --project=firefox
  7 passed (3.9s)
```

Contre la stack Docker Compose :

```console
$ docker compose up -d --build --wait
$ E2E_BASE_URL=http://localhost:8090 npx playwright test --project=chromium
  7 passed (1.2s)
```

Rapport HTML : `npm run test:e2e:report`, qui lance `npx playwright show-report`.

### WebKit sur CachyOS

WebKit ne démarre pas en local : il lui manque des bibliothèques Ubuntu (`libicu74`, `libflite1`, `libmanette-0.2-0`…), et `playwright install-deps` ne fonctionne que sur Debian/Ubuntu. Solution : lancer les tests dans l'image Docker officielle de Playwright, qui contient les navigateurs et leurs dépendances :

```console
$ docker run --rm --network host --user "$(id -u):$(id -g)" -e HOME=/tmp \
    -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.63.0-noble \
    npx playwright test --project=webkit
  7 passed (2.2s)
```

Bilan local : **21 tests sur 21** (7 scénarios × 3 navigateurs).

### Contre-épreuve : le test détecte bien une régression

Un test qui passe toujours ne prouve rien. Le menu mobile a été cassé volontairement : `menu.classList.toggle('open')` remplacé par `false` dans `main.js`.

```console
$ npx playwright test --project=chromium
  ✘  [chromium] › mobile-menu.spec.ts › le menu s'ouvre puis se referme après le choix d'un lien (5.4s)
    Error: expect(locator).toHaveAttribute(expected) failed
    test-results/mobile-menu-Menu-mobile-le-ad10f-me-après-le-choix-d-un-lien-chromium/test-failed-1.png
  1 failed
```

Le test échoue, avec une capture d'écran. `main.js` a ensuite été restauré.

## 4) GitHub Actions : `.github/workflows/pr-e2e.yml`

Déclenché sur chaque Pull Request vers `main` :

1. **Job `browsers`** : une matrice de 3 jobs, `e2e (chromium)`, `e2e (firefox)` et `e2e (webkit)`. Chaque job :
   - installe Node 22 et les dépendances (`npm ci`) ;
   - installe son navigateur (`npx playwright install --with-deps`) ;
   - démarre la stack avec `docker compose up -d --build --wait` ;
   - lance `npx playwright test --project=<navigateur>` avec `E2E_BASE_URL=http://localhost:8080`.
   
   Le rapport HTML est publié comme artefact **à chaque exécution**, même en succès (bonus), et les logs Docker sont affichés en cas d'échec.
2. **Job `e2e`** : il attend la matrice et ne réussit que si les 3 navigateurs ont réussi. C'est le **seul check à rendre obligatoire**. Son nom ne change pas si on ajoute ou retire un navigateur.

Écarts avec le modèle du sujet :

| Modèle du sujet | Workflow du projet | Raison |
| --- | --- | --- |
| Service `mysql:8`, PHP, Composer, migrations, fixtures | supprimés | Pas de BDD ni de PHP |
| `php -S` lancé en arrière-plan puis `sleep 2` | `docker compose up --wait` | On teste la stack de production ; `--wait` attend l'état `healthy` au lieu d'un délai arbitraire |
| `node-version: '20'` | `22` | Node 20 n'est plus maintenu, et `node --test` a besoin de Node 21+ |
| Rapport publié seulement en cas d'échec | publié à chaque fois | Bonus traçabilité |
| Un seul navigateur | matrice de 3 navigateurs | Bonus matrice |

### Résultat sur la PR #6

```console
$ gh pr checks 6
docker          pass  28s
e2e             pass   4s
e2e (chromium)  pass  1m50s
e2e (firefox)   pass  1m32s
e2e (webkit)    pass  1m41s
test            pass   8s

$ gh api repos/Paul-B-O/portfolio/actions/runs/36729120208/artifacts
playwright-report-chromium  203967 octets
playwright-report-firefox   204019 octets
playwright-report-webkit    203985 octets
```

## 4.2) Rendre le check obligatoire

Le dépôt utilise un **ruleset** (« protect main »), le successeur des « Branch protection rules » du sujet. Il existait déjà mais était désactivé.

**Settings → Rules → Rulesets → protect main** :

1. **Enforcement status** : `Active`.
2. Cocher **Require status checks to pass**, puis **Add checks** → `e2e` (et `test` pour les tests unitaires).
3. Conserver « Require a pull request before merging » et « Block force pushes ».
4. **Save changes**.

Une PR dont un test E2E échoue ne peut alors plus être fusionnée dans `main`.
