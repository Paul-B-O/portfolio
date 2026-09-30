import { test, expect } from '@playwright/test';

// Scénario 2 (équivalent « page protégée ») : le serveur ne sert que le dossier public/
test.describe('Accès interdit côté serveur', () => {
  test('une tentative de sortie du dossier public/ est refusée', async ({ request }) => {
    const response = await request.get('/..%2fserver.js');

    // 403 renvoyé par server.js ; derrière Nginx, la requête est rejetée dès le proxy (400)
    expect([400, 403]).toContain(response.status());
    expect(await response.text()).not.toContain('createServer');
  });

  test('les fichiers du projet hors de public/ ne sont pas servis', async ({ request }) => {
    for (const file of ['/server.js', '/package.json', '/.env', '/Dockerfile']) {
      const response = await request.get(file);
      expect(response.status(), file).toBe(404);
    }
  });

  test('une page inconnue renvoie une erreur 404', async ({ request }) => {
    const response = await request.get('/page-qui-n-existe-pas');

    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('Page introuvable');
  });
});
