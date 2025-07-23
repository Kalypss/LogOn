-- Migration de correction: Ajout de la colonne is_active si manquante
-- Cette migration est idempotente et peut être exécutée plusieurs fois

-- Ajout de la colonne is_active aux utilisateurs si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        
        -- Mettre à jour tous les utilisateurs existants comme actifs
        UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
        
        -- Créer l'index si nécessaire
        CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
        
        RAISE NOTICE 'Colonne is_active ajoutée à la table users';
    ELSE
        RAISE NOTICE 'Colonne is_active existe déjà dans la table users';
    END IF;
END $$;

-- Vérification et correction des autres colonnes critiques
DO $$
BEGIN
    -- Vérifier que toutes les colonnes nécessaires existent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
    END IF;
END $$;
