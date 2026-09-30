# Image de l'application : serveur Node.js sans dépendance qui sert public/
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Aucune dépendance npm (pas de package-lock.json) : pas de `npm ci`, on copie les sources
COPY package.json server.js ./
COPY public/ ./public/

# Ne tourne pas en root
USER node

EXPOSE 3000

# Vérifie que le serveur répond (utilisé par `depends_on: condition: service_healthy`)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=2s \
  CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
