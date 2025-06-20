# Dockerfile pour le frontend Nuxt.js
# Multi-stage build avec optimisations pour développement et production

# Stage de base avec Node.js
FROM node:20-alpine AS base
WORKDIR /app

# Installation des dépendances système
RUN apk add --no-cache libc6-compat

# Copie des fichiers de configuration
COPY package*.json ./
COPY nuxt.config.ts ./
COPY tsconfig.json ./

# Stage de développement
FROM base AS development
ENV NODE_ENV=development

# Installation de toutes les dépendances
RUN npm install

# Copie du code source
COPY . .

# Port d'écoute
EXPOSE 3000 24678

# Commande de développement
CMD ["npm", "run", "dev"]

# Stage de build
FROM base AS build
ENV NODE_ENV=production

# Installation des dépendances
RUN npm install

# Copie du code source
COPY . .

# Build de l'application
RUN npm run build

# Stage de production
FROM node:20-alpine AS production
WORKDIR /app

# Installation des dépendances système minimales
RUN apk add --no-cache dumb-init

# Création d'un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nuxt -u 1001

# Copie des fichiers de production
COPY --from=build --chown=nuxt:nodejs /app/.output ./.output
COPY --from=build --chown=nuxt:nodejs /app/package*.json ./

# Installation des dépendances de production uniquement
RUN npm ci --only=production && npm cache clean --force

# Changement vers l'utilisateur non-root
USER nuxt

# Port d'écoute
EXPOSE 3000

# Variables d'environnement
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# Commande de production
CMD ["dumb-init", "node", ".output/server/index.mjs"]
