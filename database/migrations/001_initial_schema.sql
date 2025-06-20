-- Migration initiale pour LogOn Password Manager
-- Création des tables principales avec sécurité renforcée

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    auth_hash VARCHAR(255) NOT NULL, -- Hash Argon2 de la clé d'authentification
    salt BYTEA NOT NULL, -- Sel unique de 32 bytes
    recovery_code_hash VARCHAR(255) NOT NULL, -- Hash du code de récupération
    recovery_code_salt BYTEA NOT NULL, -- Sel dédié pour le code de récupération
    totp_secret VARCHAR(255), -- Secret TOTP chiffré (optionnel)
    totp_enabled BOOLEAN DEFAULT FALSE,
    key_version INTEGER DEFAULT 1, -- Version des clés pour les migrations
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login_at);

-- Table des groupes
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    encrypted_description TEXT, -- Description chiffrée côté client
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_key_version INTEGER DEFAULT 1, -- Version de la clé de groupe
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les groupes
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_created_at ON groups(created_at);
CREATE INDEX idx_groups_active ON groups(is_active);

-- Table des membres de groupes
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'admin' ou 'member'
    encrypted_group_key TEXT NOT NULL, -- Clé de groupe chiffrée avec la clé publique du membre
    key_version INTEGER DEFAULT 1,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_access_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT group_members_role_check CHECK (role IN ('admin', 'member')),
    CONSTRAINT group_members_unique UNIQUE(group_id, user_id)
);

-- Index pour les membres de groupes
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(role);

-- Table des entrées (mots de passe, notes, etc.)
CREATE TABLE entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL si entrée de groupe
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- NULL si entrée personnelle
    title_encrypted TEXT NOT NULL, -- Titre chiffré côté client
    data_encrypted TEXT NOT NULL, -- Données chiffrées (JSON)
    iv BYTEA NOT NULL, -- Vecteur d'initialisation (12 bytes pour GCM)
    auth_tag BYTEA NOT NULL, -- Tag d'authentification GCM (16 bytes)
    type VARCHAR(20) NOT NULL DEFAULT 'password', -- 'password', 'note', 'card', 'identity'
    encryption_version INTEGER DEFAULT 1, -- Version du chiffrement
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    
    CONSTRAINT entries_type_check CHECK (type IN ('password', 'note', 'card', 'identity')),
    CONSTRAINT entries_owner_check CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR 
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Index pour les entrées
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_group_id ON entries(group_id);
CREATE INDEX idx_entries_type ON entries(type);
CREATE INDEX idx_entries_created_at ON entries(created_at);
CREATE INDEX idx_entries_last_accessed ON entries(last_accessed_at);

-- Table des permissions par entrée (pour masquer certaines entrées)
CREATE TABLE entry_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_edit BOOLEAN DEFAULT FALSE,
    granted_by UUID REFERENCES users(id), -- Qui a accordé cette permission
    granted_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT entry_permissions_unique UNIQUE(entry_id, user_id)
);

-- Index pour les permissions
CREATE INDEX idx_entry_permissions_entry_id ON entry_permissions(entry_id);
CREATE INDEX idx_entry_permissions_user_id ON entry_permissions(user_id);

-- Table des sessions (complément Redis pour persistance)
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Index pour les sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_active ON sessions(is_active);

-- Table des logs d'audit
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'create_entry', 'view_entry', etc.
    resource_type VARCHAR(50), -- 'user', 'entry', 'group', etc.
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB, -- Détails additionnels de l'action
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les logs d'audit
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer un log d'audit
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        ip_address, user_agent, details, success
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_ip_address, p_user_agent, p_details, p_success
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les statistiques utilisateur
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_login_at,
    COUNT(DISTINCT e.id) FILTER (WHERE e.user_id = u.id) as personal_entries_count,
    COUNT(DISTINCT gm.group_id) as groups_count,
    COUNT(DISTINCT ge.id) FILTER (WHERE gm.user_id = u.id) as group_entries_count,
    MAX(e.last_accessed_at) as last_entry_access
FROM users u
LEFT JOIN entries e ON e.user_id = u.id
LEFT JOIN group_members gm ON gm.user_id = u.id AND gm.is_active = TRUE
LEFT JOIN entries ge ON ge.group_id = gm.group_id
GROUP BY u.id, u.email, u.created_at, u.last_login_at;

-- Vue pour les statistiques de groupe
CREATE VIEW group_stats AS
SELECT 
    g.id,
    g.name,
    g.created_at,
    COUNT(DISTINCT gm.user_id) FILTER (WHERE gm.is_active = TRUE) as members_count,
    COUNT(DISTINCT gm.user_id) FILTER (WHERE gm.role = 'admin' AND gm.is_active = TRUE) as admin_count,
    COUNT(DISTINCT e.id) as entries_count,
    MAX(e.last_accessed_at) as last_entry_access
FROM groups g
LEFT JOIN group_members gm ON gm.group_id = g.id
LEFT JOIN entries e ON e.group_id = g.id
WHERE g.is_active = TRUE
GROUP BY g.id, g.name, g.created_at;

-- Politique de sécurité des lignes (RLS) - optionnel mais recommandé
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE users IS 'Utilisateurs du système avec authentification zéro-connaissance';
COMMENT ON TABLE groups IS 'Groupes pour le partage sécurisé de mots de passe';
COMMENT ON TABLE group_members IS 'Membres des groupes avec clés de groupe chiffrées';
COMMENT ON TABLE entries IS 'Entrées chiffrées (mots de passe, notes, cartes)';
COMMENT ON TABLE entry_permissions IS 'Permissions granulaires par entrée et utilisateur';
COMMENT ON TABLE sessions IS 'Sessions utilisateur pour backup Redis';
COMMENT ON TABLE audit_logs IS 'Logs d''audit pour le monitoring de sécurité';

COMMENT ON COLUMN users.auth_hash IS 'Hash Argon2 de la clé d''authentification dérivée côté client';
COMMENT ON COLUMN users.salt IS 'Sel unique de 32 bytes pour la dérivation de clés';
COMMENT ON COLUMN entries.data_encrypted IS 'Données chiffrées AES-256-GCM côté client';
COMMENT ON COLUMN entries.iv IS 'Vecteur d''initialisation unique de 12 bytes';
COMMENT ON COLUMN entries.auth_tag IS 'Tag d''authentification GCM de 16 bytes';
