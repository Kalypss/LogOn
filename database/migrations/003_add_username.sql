-- Migration pour ajouter la colonne username
-- LogOn Password Manager - Migration 003

-- Ajouter la colonne username à la table users
ALTER TABLE users ADD COLUMN username VARCHAR(50);

-- Créer un index pour optimiser les recherches par username
CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;

-- Ajouter une contrainte d'unicité pour éviter les doublons de username
-- (optionnel, peut être activé si nécessaire)
-- ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username);

-- Note: Le username est optionnel et peut être NULL
-- Si l'utilisateur ne fournit pas de username, l'email sera utilisé comme identifiant
