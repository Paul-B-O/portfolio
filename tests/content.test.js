import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

test('la page est en français et responsive', () => {
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<title>[^<]+<\/title>/);
});

test('les sections attendues pour l\'épreuve E5 sont présentes', () => {
  const sections = ['presentation', 'parcours', 'competences', 'realisations', 'synthese', 'veille', 'contact'];
  for (const id of sections) {
    assert.match(html, new RegExp(`<section id="${id}"`), `section #${id} manquante`);
  }
});

test('le tableau de synthèse couvre les 6 compétences du bloc 1', () => {
  const competences = [
    'Gérer le patrimoine informatique',
    'Répondre aux incidents et aux demandes d\'assistance et d\'évolution',
    'Développer la présence en ligne de l\'organisation',
    'Travailler en mode projet',
    'Mettre à disposition des utilisateurs un service informatique',
    'Organiser son développement professionnel',
  ];
  for (const competence of competences) {
    assert.ok(html.includes(competence), `compétence manquante : ${competence}`);
  }
});

test('chaque réalisation du tableau existe dans la page', () => {
  const colonnes = [...html.matchAll(/<th scope="col">(RP\d+)<\/th>/g)].map((m) => m[1]);
  assert.ok(colonnes.length > 0, 'aucune réalisation dans le tableau');
  for (const rp of colonnes) {
    assert.match(html, new RegExp(`id="${rp.toLowerCase()}"`), `${rp} absente des réalisations`);
  }
});

test('les ancres internes pointent vers un id existant', () => {
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  for (const id of anchors) {
    assert.match(html, new RegExp(`id="${id}"`), `ancre #${id} cassée`);
  }
});

test('les fichiers locaux référencés existent', () => {
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, ref)), `fichier introuvable : ${ref}`);
  }
});

test('les images ont un texte alternatif', () => {
  const images = html.match(/<img\b[^>]*>/g) ?? [];
  for (const img of images) {
    assert.match(img, /\balt="/, `image sans alt : ${img}`);
  }
});

test('aucun chemin absolu codé en dur', () => {
  for (const file of ['index.html', 'css/style.css', 'js/main.js']) {
    const content = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
    assert.doesNotMatch(content, /[A-Z]:\\|\/home\/|\/Users\//, `chemin absolu dans ${file}`);
  }
});

test('chaque section est accessible depuis le menu', () => {
  const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
  const sections = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
  for (const id of sections) {
    assert.ok(nav.includes(`href="#${id}"`), `section #${id} absente du menu`);
  }
});

test('le menu mobile reste visible sans JavaScript', () => {
  const css = fs.readFileSync(path.join(PUBLIC_DIR, 'css/style.css'), 'utf8');
  assert.doesNotMatch(css, /^\s*\.nav \{[^}]*display: none/m, 'le menu est masqué même sans JavaScript');
  assert.match(css, /\.js \.nav \{ display: none; \}/);
});
