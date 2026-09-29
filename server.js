// Serveur statique minimal, sans dépendance, pour lancer le portfolio en local.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      let filePath = path.join(ROOT, decodeURIComponent(pathname));

      // Empêche de sortir du dossier public (path traversal)
      if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
        send(res, 403, 'Accès interdit');
        return log(req, 403);
      }

      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
      const content = await fs.readFile(filePath);
      const type = MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(content);
      log(req, 200);
    } catch {
      send(res, 404, 'Page introuvable');
      log(req, 404);
    }
  });
}

function send(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function log(req, status) {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${status}`);
}

// Démarre le serveur uniquement si le fichier est exécuté directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Portfolio disponible sur http://localhost:${port}`);
  });
}
