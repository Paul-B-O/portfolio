# TP5 — Build automatique de l'image Docker avec GitHub Actions (GHCR)

Compte rendu réalisé le 30/09/2026.

Objectif : à chaque push sur `main`, un workflow GitHub Actions construit l'image à partir du `Dockerfile` et la pousse sur GitHub Container Registry, avec le SHA du commit comme tag.

## Travail à rendre

| Élément             | Valeur |
| ------------------- | ------ |
| Exécution Actions   | <https://github.com/Paul-B-O/portfolio/actions/runs/36715489218> |
| Paquet GHCR         | <https://github.com/Paul-B-O/portfolio/pkgs/container/portfolio> |
| Tag SHA produit     | `4c09f96b0defd3e71093ed1ce5ebf89843e4964f` |
| Image complète      | `ghcr.io/paul-b-o/portfolio:4c09f96b0defd3e71093ed1ce5ebf89843e4964f` |
| Digest              | `sha256:866bda7dd25a39bb77f0c5c8b71e65a32c877831667157128bd796183f4b1b7b` |

## Prérequis : remettre `main` en état

Deux problèmes empêchaient de faire le TP directement :

1. **`main` n'avait pas de `Dockerfile`** : il était resté sur la branche `feature/docker` (TP3 et TP4). Il a été fusionné avec la PR #3.
2. **Les tests échouaient sur GitHub depuis le début**, sur toutes les branches, `main` comprise, et le site n'était jamais redéployé :

   ```
   > node --test "tests/**/*.test.js"
   Could not find '/home/runner/work/portfolio/portfolio/tests/**/*.test.js'
   ```

   `node --test` ne comprend les motifs `**` qu'à partir de Node.js 21, or la CI tournait en Node.js 20. En local (Node.js 26), les tests passaient, d'où le problème passé inaperçu. Correction : `node-version: 22` dans `ci.yml` et `deploy.yml`, et `engines.node` passé à `>=22`. C'est la LTS en cours, et la version de l'image Docker.

## Étape 1 — Registre GHCR

- GitHub Actions est déjà activé sur le dépôt (workflows CI et Deploy).
- Les permissions `contents: read` et `packages: write` sont déclarées dans le workflow.
- L'authentification utilise le `GITHUB_TOKEN` injecté automatiquement : aucun secret à créer.

## Étapes 2 et 3 — Le workflow

Fichier `.github/workflows/docker-build-main.yml` :

```yaml
name: Build & Push Docker image (main)

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

env:
  # GHCR impose un nom en minuscules (le propriétaire du dépôt est Paul-B-O)
  IMAGE: ghcr.io/paul-b-o/portfolio

jobs:
  # L'image n'est publiée que si les tests passent
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Ignoré par `act` en local (ACT=true) : on teste le build sans rien publier
      - name: Log in to GHCR
        if: ${{ !env.ACT }}
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: ${{ !env.ACT }}
          tags: |
            ${{ env.IMAGE }}:${{ github.sha }}
          labels: |
            org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}
            org.opencontainers.image.revision=${{ github.sha }}
```

Écarts avec le modèle du sujet :

| Modèle du sujet | Workflow du projet | Raison |
| --- | --- | --- |
| `ghcr.io/worktogether-web:<sha>` | `ghcr.io/paul-b-o/portfolio:<sha>` | Le nom doit être `ghcr.io/<propriétaire>/<dépôt>` |
| — | nom écrit en minuscules | GHCR refuse les majuscules : `${{ github.repository }}` donnerait `Paul-B-O/portfolio` |
| Étape `setup-qemu-action` | supprimée | QEMU ne sert qu'aux images multi-architecture (bonus) |
| — | job `test` + `needs: test` | On ne publie pas une image dont les tests échouent |
| — | labels OCI `source` et `revision` | Relie le paquet au dépôt et trace le commit dans l'image |
| — | `if: ${{ !env.ACT }}` | Permet de tester avec `act` sans publier depuis la machine |

### Points à comprendre

- `on: push: branches: [main]` : le workflow part à chaque push sur `main`, y compris la fusion d'une Pull Request.
- `${{ github.sha }}` : SHA complet (40 caractères) du commit poussé. Chaque image est donc liée à un commit précis et on peut retrouver exactement le code qu'elle contient.
- `GITHUB_TOKEN` : jeton temporaire créé par GitHub pour chaque exécution, limité aux permissions déclarées (`packages: write`), et expiré à la fin du job.

## Test local avec act

```console
$ act -l -W .github/workflows/docker-build-main.yml
Stage  Job ID          Job name        Workflow name                     Workflow file          Events
0      test            test            Build & Push Docker image (main)  docker-build-main.yml  push
1      build-and-push  build-and-push  Build & Push Docker image (main)  docker-build-main.yml  push

$ echo '{"ref":"refs/heads/main"}' > event-main.json
$ act push -W .github/workflows/docker-build-main.yml -e event-main.json \
    -P ubuntu-latest=catthehacker/ubuntu:act-latest
[.../test]   | # tests 15
[.../test]   ✅  Success - Main npm test
[.../test] 🏁  Job succeeded
[.../build-and-push]   ✅  Success - Main Set up Docker Buildx
[.../build-and-push]   ✅  Success - Main Build and push
[.../build-and-push] 🏁  Job succeeded
```

- `-e event-main.json` simule un push sur `main`, sinon le filtre `branches: [main]` ne correspond pas.
- `-P ... act-latest` choisit l'image « Medium » du runner, qui contient Docker Buildx.
- `act` définit `ACT=true` : l'étape de login est sautée et `push` vaut `false`. L'image est construite mais rien n'est publié.

## Étape 4 — Publier une version

Plutôt qu'un `git push origin main` direct, le push passe par des Pull Requests, qui font tourner la CI avant la fusion :

1. PR #3 `feature/docker` → `main` : `Dockerfile`, `compose.yml` et la correction Node.js 22.
2. PR #4 `ci/docker-build-main` → `main` : le workflow. Sa fusion (commit `4c09f96`) est le push qui a déclenché le build.

```console
$ gh run view 36715489218
✓ main Build & Push Docker image (main) · 36715489218
Triggered via push

JOBS
✓ test in 6s
✓ build-and-push in 25s
```

Extrait du log du job `build-and-push` :

```
#11 pushing layers 2.9s done
#11 pushing manifest for ghcr.io/paul-b-o/portfolio:4c09f96b0defd3e71093ed1ce5ebf89843e4964f@sha256:866bda7dd25a... 1.2s done
```

Le workflow Deploy, qui échouait depuis le début à cause de Node.js 20, réussit aussi sur ce commit.

## Étape 5 — Vérifier l'image publiée

Le paquet `portfolio` apparaît dans l'onglet **Packages** du dépôt, avec le tag du SHA. Il est public : on le télécharge sans `docker login`.

```console
$ docker pull ghcr.io/paul-b-o/portfolio:4c09f96b0defd3e71093ed1ce5ebf89843e4964f
Digest: sha256:866bda7dd25a39bb77f0c5c8b71e65a32c877831667157128bd796183f4b1b7b
Status: Downloaded newer image for ghcr.io/paul-b-o/portfolio:4c09f96b0defd3e71093ed1ce5ebf89843e4964f

$ docker run -d --rm --name tp5-check -p 8083:3000 ghcr.io/paul-b-o/portfolio:4c09f96b0defd3e71093ed1ce5ebf89843e4964f
$ docker ps --filter name=tp5-check --format '{{.Status}}\t{{.Ports}}'
Up 3 seconds (healthy)	0.0.0.0:8083->3000/tcp, [::]:8083->3000/tcp

$ curl -s http://localhost:8083/ | grep -o '<title>.*</title>'
<title>Portfolio BTS SIO — Prénom Nom</title>

$ docker image inspect ghcr.io/paul-b-o/portfolio:4c09f96b... \
    --format '{{index .Config.Labels "org.opencontainers.image.source"}} {{index .Config.Labels "org.opencontainers.image.revision"}}'
https://github.com/Paul-B-O/portfolio 4c09f96b0defd3e71093ed1ce5ebf89843e4964f
```

Le `docker run ... --help` du sujet ne s'applique pas ici : l'image est un serveur web, on vérifie donc qu'elle démarre, passe `healthy` et sert la page.

## Points d'attention relevés par GitHub

Annotations affichées sur l'exécution (avertissements, pas d'erreur) :

- Les actions `actions/checkout@v4`, `setup-node@v4` et `docker/*` ciblent Node.js 20, déprécié sur les runners : GitHub les force sur Node.js 24. À terme, passer à leurs versions majeures suivantes.
- Le label `ubuntu-latest` passera à Ubuntu 26 à partir du 19 octobre 2026.
