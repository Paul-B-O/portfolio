# Grille d'audit DevOps

Audit du projet Portfolio BTS SIO — 29/09/2026.

Légende : ✅ OK · ⚠️ partiel · ❌ absent

## Git

| Point                                                    | État | Commentaire                                                  |
| -------------------------------------------------------- | :--: | ------------------------------------------------------------ |
| Dépôt GitHub existant et accessible                      |  ⚠️  | Dépôt local initialisé, remote GitHub à créer et pousser     |
| `.gitignore` adapté à la stack                           |  ✅  | `node_modules/`, `.env`, `dist/`, logs, fichiers d'éditeur   |
| Historique de commits lisible                            |  ✅  | Conventional Commits (`feat:`, `test:`, `ci:`, `docs:`…)     |
| Branche `main` protégée                                  |  ❌  | À activer sur GitHub (procédure dans le README)              |

## Build & Run

| Point                                                    | État | Commentaire                                                  |
| -------------------------------------------------------- | :--: | ------------------------------------------------------------ |
| L'app démarre en une seule commande documentée           |  ✅  | `npm start`                                                  |
| Les dépendances sont listées                             |  ✅  | `package.json` (aucune dépendance externe, Node.js 20+)      |
| Pas de chemin absolu codé en dur                         |  ✅  | Vérifié automatiquement par un test                          |

## Tests

| Point                                                    | État | Commentaire                                                  |
| -------------------------------------------------------- | :--: | ------------------------------------------------------------ |
| Des tests existent                                       |  ✅  | 14 tests : serveur + contenu E5                              |
| Les tests s'exécutent en une commande                    |  ✅  | `npm test`, également lancés par la CI                        |

## Déploiement

| Point                                                    | État | Commentaire                                                  |
| -------------------------------------------------------- | :--: | ------------------------------------------------------------ |
| Méthode de déploiement connue et documentée              |  ✅  | GitHub Actions → GitHub Pages, documenté dans le README      |
| Un environnement de staging existe                       |  ❌  | Seule la prod existe ; le local sert de pré-production       |

## Monitoring

| Point                                                    | État | Commentaire                                                  |
| -------------------------------------------------------- | :--: | ------------------------------------------------------------ |
| L'URL de production est monitorée                        |  ❌  | Aucun outil de supervision                                   |
| Les logs sont accessibles                                |  ⚠️  | Logs du serveur local sur la sortie standard, logs des déploiements dans l'onglet Actions ; pas de logs d'accès en prod (GitHub Pages) |

## Bilan

| ✅ | ⚠️ | ❌ |
| :-: | :-: | :-: |
| 8  | 2  | 3  |

## 3 priorités d'amélioration

1. **Protéger la branche `main`** : pousser le dépôt sur GitHub puis imposer les pull requests et le passage du check `test` avant fusion, pour qu'aucun code non testé n'arrive en production.
2. **Monitorer l'URL de production** : ajouter une sonde de disponibilité (UptimeRobot, ou un workflow GitHub Actions planifié qui vérifie un code HTTP 200) avec alerte par email.
3. **Créer un environnement de staging** : déployer une branche `develop` sur un second hébergement (Netlify / Vercel preview, ou un second dépôt Pages) pour valider les changements avant la prod.
