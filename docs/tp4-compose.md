# TP4 — Conteneurisation du projet

Compte rendu réalisé le 30/09/2026 sur CachyOS, Docker Engine 29.7.2, Docker Compose 5.5.0.

Objectif : lancer tout le portfolio avec une seule commande (`docker compose up`), sans rien installer d'autre que Docker.

## Étape 1 — Services du projet

Le portfolio est un site statique (`public/`) servi par un serveur Node.js sans dépendance (`server.js`). Il n'y a ni base de données ni cache : on n'ajoute pas de service qui ne servirait à rien.

| Service | Image de base              | Port                              | Données persistantes ?                  |
| ------- | -------------------------- | --------------------------------- | --------------------------------------- |
| `app`   | à construire (`node:22-alpine`) | 3000, réseau interne uniquement | Non (le site est dans l'image)          |
| `proxy` | `nginx:alpine`             | 80, publié sur `${HTTP_PORT}` (8080 par défaut) | Non                       |
| Base de données | —                  | —                                 | Pas nécessaire : site statique          |
| Cache / Queue   | —                  | —                                 | Pas nécessaire                          |

Schéma des connexions :

```
navigateur ──http://localhost:8080──▶ proxy (nginx:alpine, :80) ──http://app:3000──▶ app (node server.js)
                                        │                                          │
                                        └── nginx/default.conf (monté en lecture)  └── ./public monté en lecture (dev)
```

Seul `proxy` est publié sur la machine hôte ; `app` n'est joignable que par le réseau Compose, via son nom de service `app`.

## Étape 2 — Dockerfile de l'application

Le `Dockerfile` du TP3 servait `public/` avec Nginx. Il est remplacé par une image Node.js, adaptée de celle du sujet :

```docker
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Aucune dépendance npm (pas de package-lock.json) : pas de `npm ci`, on copie les sources
COPY package.json server.js ./
COPY public/ ./public/

# Ne tourne pas en root
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=2s \
  CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
```

Écarts avec le modèle du sujet :

- **`node:22-alpine` au lieu de `node:20-alpine`** : Node 20 n'est plus maintenu depuis avril 2026, Node 22 est la LTS en cours.
- **Pas de `npm ci`** : le projet n'a aucune dépendance et pas de `package-lock.json`, `npm ci` échouerait.
- **`HEALTHCHECK`** : Compose s'en sert pour ne démarrer le proxy que quand l'app répond vraiment.
- **Arrêt propre** : `node` tourne en PID 1 dans le conteneur et ignore `SIGTERM` par défaut, donc `docker stop` attendait 10 s avant de tuer le processus. `server.js` gère maintenant `SIGTERM` : l'arrêt passe à 0,15 s.

`.dockerignore` exclut du contexte de build tout ce qui n'est pas copié (`.git`, `tests`, `docs`, `nginx`, `.env`…).

```console
$ docker build -t portfolio-app:dev .
Successfully built f564af6ef319
Successfully tagged portfolio-app:dev

$ docker images portfolio-app:dev --format '{{.Repository}}:{{.Tag}} {{.Size}}'
portfolio-app:dev 238MB

$ docker image inspect portfolio-app:dev --format '{{.Config.User}}'
node
```

## Étape 3 — compose.yml

```yaml
services:
  app:
    build: .
    image: portfolio-app:dev
    env_file:
      - path: .env
        required: false
    environment:
      PORT: "3000"   # port interne fixe : c'est celui qu'attend nginx/default.conf
    expose:
      - "3000"
    volumes:
      - ./public:/app/public:ro   # hot-reload en dev (supprimer en prod)
    restart: unless-stopped

  proxy:
    image: nginx:alpine
    ports:
      - "${HTTP_PORT:-8080}:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      app:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
      ...
    restart: unless-stopped
```

- Pas de section `volumes:` nommée : aucune donnée à persister.
- `nginx/default.conf` fait `proxy_pass http://app:3000` et transmet les en-têtes `Host`, `X-Real-IP`, `X-Forwarded-For` et `X-Forwarded-Proto`.
- `PORT` est fixé à 3000 dans le conteneur, même si le `.env` contient une autre valeur pour `npm start`, pour rester cohérent avec la conf Nginx.

### Problème rencontré : proxy `unhealthy`

Au premier lancement, le site répondait mais le proxy restait `unhealthy` et `docker compose up --wait` échouait au bout d'une minute :

```console
$ docker inspect tp1-proxy-1 --format '{{json .State.Health.Log}}'
1 wget: can't connect to remote host: Connection refused

$ docker compose exec proxy wget -q --spider http://127.0.0.1/ && echo IPV4_OK
IPV4_OK
```

Dans le conteneur, `localhost` résout d'abord en `::1` (IPv6), alors que la conf ne contenait que `listen 80;` (IPv4). Correction : ajout de `listen [::]:80;`. Les deux services passent ensuite `healthy` en 5 secondes.

### Lancement

```console
$ docker compose up -d --build --wait
 Container tp1-app-1 Healthy
 Container tp1-proxy-1 Healthy

$ docker compose ps
NAME          IMAGE               STATUS                        PORTS
tp1-app-1     portfolio-app:dev   Up About a minute (healthy)   3000/tcp
tp1-proxy-1   nginx:alpine        Up About a minute (healthy)   0.0.0.0:8081->80/tcp, [::]:8081->80/tcp

$ curl -s http://localhost:8081/ | grep -o '<title>.*</title>'
<title>Portfolio BTS SIO — Prénom Nom</title>

$ curl -si http://localhost:8081/ | grep Server
Server: nginx/1.31.6

$ curl -s -m 2 http://localhost:3000/ || echo "port 3000 non publié sur l'hôte"
port 3000 non publié sur l'hôte

$ docker compose exec app id
uid=1000(node) gid=1000(node) groups=1000(node)

$ docker compose logs app
app-1  | 2026-09-30T07:47:34.136Z GET /css/style.css 200
app-1  | 2026-09-30T07:47:34.141Z GET /nope 404
```

Le port 8081 vient du `.env` local : le 8080 était déjà pris par le conteneur `web1` du TP3.

Hot-reload vérifié : une ligne ajoutée à `public/index.html` apparaît dans `curl` sans rebuild ni redémarrage.

## Étape 4 — Variables d'environnement

```console
$ cat .env.example
# Port du serveur Node lancé en local avec `npm start`
PORT=3000

# Port de la machine hôte sur lequel Docker Compose publie le reverse proxy Nginx
HTTP_PORT=8080

$ git check-ignore -v .env
.gitignore:5:.env	.env
```

- `.env.example` est versionné, `.env` est local et ignoré par Git.
- Le projet n'a aucun secret (pas de base de données, pas d'API), donc aucune valeur sensible à vider.
- Si `.env` est absent, Compose démarre quand même : `env_file` est marqué `required: false` et `HTTP_PORT` vaut 8080 par défaut.

## Vérification croisée : clone propre

Pour simuler un autre développeur : clone de la branche dans un dossier vide, sans `.env` existant et sans Node.js, avec un autre nom de projet et le port 8082 :

```console
$ git clone -b feature/docker <dépôt> clone-test && cd clone-test
$ cp .env.example .env && sed -i 's/HTTP_PORT=8080/HTTP_PORT=8082/' .env
$ docker compose -p tp4-clone up -d --build --wait
 Container tp4-clone-app-1 Healthy
 Container tp4-clone-proxy-1 Healthy

$ docker compose -p tp4-clone ps
SERVICE   STATUS                   PORTS
app       Up 5 seconds (healthy)   3000/tcp
proxy     Up 2 seconds (healthy)   0.0.0.0:8082->80/tcp, [::]:8082->80/tcp

$ curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:8082/
HTTP 200
```

## Intégration continue

Le job `docker` de `.github/workflows/ci.yml` testait l'ancienne image Nginx (`-p 8080:80`). Il démarre maintenant toute la stack :

```yaml
- run: cp .env.example .env
- run: docker compose up -d --build --wait
- run: curl --fail http://localhost:8080/
- if: failure()
  run: docker compose logs
```

`--wait` fait échouer le job si un service n'atteint pas l'état `healthy`.

## Fichiers produits

| Fichier               | Rôle                                                 |
| --------------------- | ---------------------------------------------------- |
| `Dockerfile`          | Image Node.js de l'application                       |
| `compose.yml`         | Services `app` et `proxy`                            |
| `nginx/default.conf`  | Configuration du reverse proxy                       |
| `.env.example`        | Modèle des variables (versionné)                     |
| `.env`                | Valeurs locales (non versionné)                      |
| `.dockerignore`       | Contexte de build réduit                             |
