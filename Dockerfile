# Image de production du portfolio : site statique servi par Nginx
FROM nginx:alpine

COPY public/ /usr/share/nginx/html/

EXPOSE 80

# Vérifie que Nginx répond (visible dans `docker ps`)
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1
