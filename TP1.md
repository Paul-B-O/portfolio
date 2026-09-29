# TP #1 : Audit DevOps du projet

---

# Objectif du TP

## Ce que vous allez produire

À la fin de ce TP :

- Votre dépôt Git est dans un état propre et documenté
- Vous avez rempli votre **grille d'audit DevOps**
- Vous avez identifié vos **3 priorités d'amélioration**
- Un `README.md` clair existe avec les instructions de démarrage

---

# Grille d'audit DevOps

## À remplir pour votre projet

Notez chaque point : ✅ OK · ⚠️ partiel · ❌ absent

**Git**

- [ ] Dépôt GitHub existant et accessible
- [ ] `.gitignore` adapté à la stack (pas de `node_modules`, `vendor`, `.env`...)
- [ ] Historique de commits lisible (pas de "fix", "wip", "aaaa")
- [ ] Branche `main` protégée (no direct push)

**Build & Run**

- [ ] L'app démarre en une seule commande documentée
- [ ] Les dépendances sont listées (`package.json`, `composer.json`, `requirements.txt`...)
- [ ] Pas de chemin absolu codé en dur (ex: `C:\\Users\\moi\\...`)

**Tests**

- [ ] Des tests existent
- [ ] Les tests s'exécutent en une commande

**Déploiement**

- [ ] La méthode de déploiement actuelle est connue et documentée
- [ ] Un environnement de staging existe (différent de la prod)

**Monitoring**

- [ ] L'URL de production est monitorée
- [ ] Les logs sont accessibles

---

# Étape 1 — Remplir la grille

## Audit honnête de votre dépôt

1. Ouvrez votre dépôt sur GitHub
2. Remplissez la grille slide précédente
3. Comptez vos ✅ / ⚠️ / ❌
4. Notez vos **3 priorités concrètes** (les ❌ les plus bloquants)

> Ne trichez pas — personne ne voit votre grille sauf vous. L'objectif est de savoir d'où on part.

---

# Étape 2 — Nettoyer le `.gitignore`

## Ce qui ne doit jamais être versionné

Vérifiez que votre `.gitignore` exclut au minimum :

**Node.js**

```
node_modules/
.env
.env.local
dist/
```

**PHP / Laravel**

```
vendor/
.env
storage/logs/
public/storage
```

**Python**

```
__pycache__/
*.pyc
.env
venv/
.venv/
```

Si des fichiers exclus sont déjà trackés, les retirer du tracking :

```bash
git rm -r --cached node_modules/
git commit -m "chore: remove tracked node_modules"
```

---

# Étape 3 — Écrire un README utile

## Le README est la porte d'entrée du projet

Un README professionnel contient au minimum :

````markdown
# Nom du projet

Description en 2 lignes.

## Prérequis

- Node.js 20+
- PostgreSQL 15+

## Installation

```bash
git clone <https://github.com/>...
cd mon-projet
cp .env.example .env
npm install
npm run dev
````

## Structure du projet

Décrire les dossiers principaux.

## Contributeurs

Un autre développeur doit pouvoir démarrer le projet en lisant seulement ce fichier.