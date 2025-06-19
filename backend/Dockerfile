# Dockerfile pour le backend Node.js/Express
# Multi-stage build optimisé pour développement et production

# Stage de base avec Node.js
FROM node:20-alpine AS base
WORKDIR /app

# Installation des dépendances système pour les packages natifs
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copie des fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./

# Stage de développement
FROM base AS development
ENV NODE_ENV=development

# Installation de toutes les dépendances (dev incluses)
RUN npm ci --include=dev

# Copie du code source
COPY . .

# Port d'écoute
EXPOSE 3001 9229

# Commande de développement avec hot-reload
CMD ["npm", "run", "dev"]

# Stage de build
FROM base AS build
ENV NODE_ENV=production

# Installation des dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copie du code source
COPY . .

# Compilation TypeScript
RUN npm run build

# Stage de production
FROM node:20-alpine AS production
WORKDIR /app

# Installation des dépendances système minimales
RUN apk add --no-cache dumb-init

# Création d'un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S logon -u 1001

# Copie des fichiers de production depuis le stage build
COPY --from=build --chown=logon:nodejs /app/dist ./dist
COPY --from=build --chown=logon:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=logon:nodejs /app/package*.json ./

# Création des dossiers nécessaires
RUN mkdir -p logs && chown -R logon:nodejs logs

# Changement vers l'utilisateur non-root
USER logon

# Port d'écoute
EXPOSE 3001

# Commande de production avec dumb-init pour la gestion des signaux
CMD ["dumb-init", "node", "dist/index.js"]
