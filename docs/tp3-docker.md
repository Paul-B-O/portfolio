# TP3 — Prise en main de Docker

Compte rendu réalisé le 29/09/2026 sur CachyOS, Docker Engine 29.7.2.

L'image créée dans les parties 5 et 6 est celle du portfolio : le `Dockerfile` est à la racine du dépôt et sert le dossier `public/` (qui contient `index.html`) avec Nginx.

## 1) Installation et vérification

```console
$ docker version --format '{{.Client.Version}} / {{.Server.Version}}'
29.7.2 / 29.7.2

$ docker run --rm hello-world
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

## 2) Premier conteneur : Nginx

```console
$ docker run --name web1 -p 8080:80 -d nginx:alpine
fa2fd44bb9db943d243b39271682d4d755355e89842a003fbcba659ab8b5cc83

$ docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS        PORTS                                     NAMES
fa2fd44bb9db   nginx:alpine   "/docker-entrypoint.…"   1 second ago   Up 1 second   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp   web1

$ curl -s http://localhost:8080 | grep -o '<title>.*</title>'
<title>Welcome to nginx!</title>

$ docker stop web1
web1
$ docker start web1
web1
```

## 3) MySQL et persistance avec un volume

Le port 3306 de la machine étant déjà utilisé par un MySQL local, le conteneur est exposé sur le port **3308**.

```console
$ mkdir -p mysql-data
$ docker run --name mysql1 -d -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=tp \
    -p 3308:3306 -v "$(pwd)/mysql-data:/var/lib/mysql" mysql:8

$ docker exec mysql1 mysql -uroot -proot tp -e "CREATE TABLE etudiant(id INT PRIMARY KEY, nom VARCHAR(50));
    INSERT INTO etudiant VALUES (1,'Paul'); SELECT * FROM etudiant;"
id	nom
1	Paul

$ ls -la mysql-data
-rw-r----- 1 999 adm 56       auto.cnf
-rw-r----- 1 999 adm 12582912 ibdata1
drwxr-x--- 2 999 adm 160      mysql
-rw-r----- 1 999 adm 32505856 mysql.ibd
drwxr-x--- 2 999 adm 2300     performance_schema
drwxr-x--- 2 999 adm 60       tp
...
```

Suppression du conteneur, puis recréation avec le même dossier :

```console
$ docker rm -f mysql1
mysql1
$ docker run --name mysql1 -d -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=tp \
    -p 3308:3306 -v "$(pwd)/mysql-data:/var/lib/mysql" mysql:8

$ docker exec mysql1 mysql -uroot -proot tp -e 'SELECT * FROM etudiant;'
id	nom
1	Paul
```

**Constat :** la table et la ligne insérées survivent à la suppression du conteneur, car les données sont écrites dans `mysql-data/` sur la machine hôte et non dans le conteneur.

Option avec un volume nommé :

```console
$ docker volume create mysql_data
$ docker run --name mysql2 -d -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=tp \
    -p 3307:3306 -v mysql_data:/var/lib/mysql mysql:8
$ docker volume inspect mysql_data
[
    {
        "Driver": "local",
        "Mountpoint": "/var/lib/docker/volumes/mysql_data/_data",
        "Name": "mysql_data",
        "Scope": "local"
    }
]
```

## 3 bis) Commandes de gestion

```console
$ docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
NAMES     IMAGE          STATUS
mysql2    mysql:8        Up 9 seconds
mysql1    mysql:8        Up 11 seconds
web1      nginx:alpine   Up About a minute

$ docker logs web1 | tail -1
/docker-entrypoint.sh: Configuration complete; ready for start up

$ docker restart web1
web1

$ docker images
IMAGE                ID             DISK USAGE   CONTENT SIZE
hello-world:latest   5e2309035332   25.9kB       9.49kB
mysql:8              0744ee5ef89c   1.12GB       255MB
nginx:alpine         df221db836e1   94.4MB       27.2MB
```

## 4) Introspection

```console
$ docker inspect web1 | head -12
[
    {
        "Id": "fa2fd44bb9db943d243b39271682d4d755355e89842a003fbcba659ab8b5cc83",
        "Path": "/docker-entrypoint.sh",
        "Args": ["nginx", "-g", "daemon off;"],
        "State": {
            "Status": "running",
            "Running": true,
            ...

$ docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web1
172.17.0.2

$ docker inspect -f '{{json .HostConfig.PortBindings}}' web1
{"80/tcp":[{"HostIp":"","HostPort":"8080"}]}

$ docker inspect -f '{{json .Config.Env}}' web1
["PATH=/usr/local/sbin:...","NGINX_VERSION=1.31.6",...]
```

> La commande du sujet `docker inspect -f '.NetworkSettings.IPAddress'` ne fonctionne pas telle quelle : il manque les accolades `{{ }}` du template Go, et depuis Docker 29 l'adresse IP n'est plus à la racine de `NetworkSettings`. Elle se trouve dans `NetworkSettings.Networks.<réseau>.IPAddress`.

```console
$ docker top web1
UID    PID     PPID    CMD
root   66228   66201   nginx: master process nginx -g daemon off;
101    66316   66228   nginx: worker process
...

$ docker stats web1 --no-stream
CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT     MEM %   NET I/O      BLOCK I/O     PIDS
fa2fd44bb9db   web1   0.00%   10.25MiB / 15.32GiB   0.07%   266B / 84B   1.31MB / 0B   13

$ docker exec -it web1 sh
/ # uname -a
Linux fa2fd44bb9db 7.2.0-1-cachyos #1 SMP PREEMPT_DYNAMIC x86_64 Linux
/ # ps aux
PID   USER     TIME  COMMAND
    1 root      0:00 nginx: master process nginx -g daemon off;
   22 nginx     0:00 nginx: worker process
/ # ls -la /usr/share/nginx/html
-rw-r--r--    1 root     root           497 50x.html
-rw-r--r--    1 root     root           896 index.html
/ # exit

$ docker cp web1:/etc/nginx/nginx.conf ./nginx.conf
$ head -3 nginx.conf
user  nginx;
worker_processes  auto;
```

**Remarques :**
- Le noyau affiché dans le conteneur est celui de l'hôte (`7.2.0-1-cachyos`) : un conteneur partage le noyau de la machine, contrairement à une VM.
- Dans le conteneur, Nginx a le PID 1 ; vu depuis l'hôte (`docker top`), c'est le PID 66228. Le conteneur a son propre espace de processus.

## 5) Créer son image : le portfolio

`Dockerfile` :

```dockerfile
FROM nginx:alpine

COPY public/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
```

Un `.dockerignore` exclut `.git`, les tests et la documentation du contexte de build.

```console
$ docker build -t portfolio:1.0 .
Step 1/4 : FROM nginx:alpine
Step 2/4 : COPY public/ /usr/share/nginx/html/
Step 3/4 : EXPOSE 80
Step 4/4 : HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
Successfully built 89bd0e302707
Successfully tagged portfolio:1.0

$ docker images | grep portfolio
portfolio:1.0   89bd0e302707   93.6MB   26.3MB
```

## 6) Lancer un conteneur depuis son image

```console
$ docker run --name portfolio1 -p 8081:80 -d portfolio:1.0
5350af482f73c632d84f64d7669534ce023517c021f5cdea7150abc94d8342db

$ curl -s http://localhost:8081/ | grep -o '<title>.*</title>'
<title>Portfolio BTS SIO — Prénom Nom</title>

$ docker exec portfolio1 ls /usr/share/nginx/html
50x.html
css
index.html
js

$ docker logs portfolio1
172.17.0.1 - - [29/Sep/2026:14:06:26 +0000] "GET / HTTP/1.1" 200 7984 "-" "curl/8.21.0" "-"
172.17.0.1 - - [29/Sep/2026:14:06:26 +0000] "GET /css/style.css HTTP/1.1" 200 3246 "-" "curl/8.21.0" "-"

$ docker stop portfolio1 && docker rm portfolio1
```

## 7) Publier sur Docker Hub

```bash
docker login
docker tag portfolio:1.0 <identifiant_dockerhub>/portfolio:1.0
docker tag portfolio:1.0 <identifiant_dockerhub>/portfolio:latest
docker push <identifiant_dockerhub>/portfolio:1.0
docker push <identifiant_dockerhub>/portfolio:latest
```

Vérification après suppression de l'image locale :

```bash
docker rmi <identifiant_dockerhub>/portfolio:1.0
docker pull <identifiant_dockerhub>/portfolio:1.0
docker run --name portfolio2 -p 8082:80 -d <identifiant_dockerhub>/portfolio:1.0
```

## Questions de validation

**1. Quelle différence entre image et conteneur ?**
Une **image** est un modèle en lecture seule : un système de fichiers en couches (application, dépendances, configuration) plus une commande de démarrage. Un **conteneur** est une instance en cours d'exécution de cette image : il ajoute une couche inscriptible et un processus isolé. On peut lancer plusieurs conteneurs à partir d'une même image, comme plusieurs objets créés à partir d'une classe.

**2. À quoi sert `-p 8081:80` ? Dans quel sens va le mapping ?**
Il publie un port du conteneur sur la machine hôte. Le format est `HÔTE:CONTENEUR` : les requêtes arrivant sur le port **8081 de l'hôte** sont redirigées vers le port **80 du conteneur**, où écoute Nginx. Sans cette option, le site ne serait joignable que depuis le réseau interne de Docker.

**3. Différence entre `docker run` et `docker start` ?**
`docker run` **crée un nouveau conteneur** à partir d'une image (et la télécharge si besoin), puis le démarre. Les options comme `-p`, `-v` ou `-e` se fixent à ce moment-là. `docker start` **redémarre un conteneur existant** qui a été arrêté, avec la configuration et les données qu'il avait déjà.

**4. Quelle commande donne la configuration complète d'un conteneur ?**
`docker inspect <conteneur>`, qui renvoie tout en JSON (état, réseau, ports, volumes, variables d'environnement…). On peut filtrer un champ avec `-f`, par exemple `docker inspect -f '{{json .HostConfig.PortBindings}}' web1`.

**5. Pourquoi tagger une image avant un `docker push` ?**
Le nom de l'image indique à Docker **où la pousser** : `<identifiant>/<dépôt>:<version>`. Une image nommée seulement `portfolio:1.0` n'appartient à aucun namespace, et Docker Hub refuserait le push. Le tag porte aussi la **version** (`1.0`, `latest`), ce qui permet de déployer ou de revenir à une version précise.
