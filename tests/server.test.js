import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('la page d\'accueil répond en 200 avec du HTML', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
});

test('la feuille de style est servie avec le bon type MIME', async () => {
  const res = await fetch(`${baseUrl}/css/style.css`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/css/);
});

test('le script est servi avec le bon type MIME', async () => {
  const res = await fetch(`${baseUrl}/js/main.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
});

test('une page inexistante renvoie 404', async () => {
  const res = await fetch(`${baseUrl}/nexiste-pas.html`);
  assert.equal(res.status, 404);
});

test('impossible de lire un fichier hors du dossier public', async () => {
  const res = await fetch(`${baseUrl}/..%2fpackage.json`);
  assert.ok([403, 404].includes(res.status), `statut reçu : ${res.status}`);
});

test('une URL mal encodée ne fait pas planter le serveur', async () => {
  const res = await fetch(`${baseUrl}/%E0%A4%A`);
  assert.equal(res.status, 404);
});
