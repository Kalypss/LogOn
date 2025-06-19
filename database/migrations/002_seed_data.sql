-- Données de test pour le développement
-- NE PAS UTILISER EN PRODUCTION

-- Utilisateur de test avec mot de passe "test123"
-- Auth hash généré avec la clé dérivée de "test123" + sel
INSERT INTO users (
    id,
    email, 
    auth_hash, 
    salt,
    recovery_code_hash,
    recovery_code_salt,
    created_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'test@logon.local',
    '$argon2id$v=19$m=65536,t=3,p=4$randomsalt123456789012345678901234$hash123456789012345678901234567890123456789012',
    decode('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'),
    '$argon2id$v=19$m=65536,t=3,p=4$recoverysalt123456789012345678901234$recoveryhash123456789012345678901234567890123',
    decode('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 'hex'),
    NOW() - INTERVAL '30 days'
);

-- Utilisateur admin de test
INSERT INTO users (
    id,
    email, 
    auth_hash, 
    salt,
    recovery_code_hash,
    recovery_code_salt,
    totp_enabled,
    created_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'admin@logon.local',
    '$argon2id$v=19$m=65536,t=3,p=4$adminsalt123456789012345678901234$adminhash123456789012345678901234567890123',
    decode('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'hex'),
    '$argon2id$v=19$m=65536,t=3,p=4$adminrecovery123456789012345678901234$adminrecoveryhash123456789012345678901',
    decode('efcdab9087654321efcdab9087654321efcdab9087654321efcdab9087654321', 'hex'),
    TRUE,
    NOW() - INTERVAL '7 days'
);

-- Groupe de test
INSERT INTO groups (
    id,
    name,
    encrypted_description,
    created_by,
    created_at
) VALUES (
    '660f9511-f3ac-52e5-b827-557666551111',
    'Équipe Développement',
    'encrypted_description_base64_here',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '5 days'
);

-- Membres du groupe
INSERT INTO group_members (
    group_id,
    user_id,
    role,
    encrypted_group_key,
    joined_at
) VALUES 
(
    '660f9511-f3ac-52e5-b827-557666551111',
    '550e8400-e29b-41d4-a716-446655440001',
    'admin',
    'encrypted_group_key_for_admin_base64_here',
    NOW() - INTERVAL '5 days'
),
(
    '660f9511-f3ac-52e5-b827-557666551111',
    '550e8400-e29b-41d4-a716-446655440000',
    'member',
    'encrypted_group_key_for_member_base64_here',
    NOW() - INTERVAL '3 days'
);

-- Entrées de test (personnelles)
INSERT INTO entries (
    id,
    user_id,
    title_encrypted,
    data_encrypted,
    iv,
    auth_tag,
    type,
    created_at
) VALUES 
(
    '770f9511-f3ac-52e5-b827-557666552222',
    '550e8400-e29b-41d4-a716-446655440000',
    'encrypted_title_github_base64',
    'encrypted_data_github_credentials_base64',
    decode('112233445566778899aabbcc', 'hex'),
    decode('aabbccddeeff00112233445566778899', 'hex'),
    'password',
    NOW() - INTERVAL '2 days'
),
(
    '770f9511-f3ac-52e5-b827-557666552223',
    '550e8400-e29b-41d4-a716-446655440000',
    'encrypted_title_bank_base64',
    'encrypted_data_bank_info_base64',
    decode('ccbbaa998877665544332211', 'hex'),
    decode('99887766554433221100ffee', 'hex'),
    'card',
    NOW() - INTERVAL '1 day'
);

-- Entrée de groupe
INSERT INTO entries (
    id,
    group_id,
    title_encrypted,
    data_encrypted,
    iv,
    auth_tag,
    type,
    created_at
) VALUES (
    '770f9511-f3ac-52e5-b827-557666552224',
    '660f9511-f3ac-52e5-b827-557666551111',
    'encrypted_title_shared_server_base64',
    'encrypted_data_server_credentials_base64',
    decode('ffeeddccbbaa998877665544', 'hex'),
    decode('4433221100ffeeddccbbaa99', 'hex'),
    'password',
    NOW() - INTERVAL '1 day'
);

-- Logs d'audit de test
INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    success,
    created_at
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'login',
    'user',
    '550e8400-e29b-41d4-a716-446655440000',
    '127.0.0.1',
    TRUE,
    NOW() - INTERVAL '1 hour'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'create_entry',
    'entry',
    '770f9511-f3ac-52e5-b827-557666552224',
    '127.0.0.1',
    TRUE,
    NOW() - INTERVAL '1 day'
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'view_entry',
    'entry',
    '770f9511-f3ac-52e5-b827-557666552222',
    '127.0.0.1',
    TRUE,
    NOW() - INTERVAL '30 minutes'
);

-- Session de test (normalement gérée par Redis)
INSERT INTO sessions (
    id,
    user_id,
    session_data,
    ip_address,
    user_agent,
    expires_at
) VALUES (
    'test_session_123456789',
    '550e8400-e29b-41d4-a716-446655440000',
    '{"authenticated": true, "loginTime": "2025-06-20T10:00:00Z"}',
    '127.0.0.1',
    'Mozilla/5.0 (Test Browser)',
    NOW() + INTERVAL '1 day'
);

-- Mise à jour des statistiques
UPDATE users SET last_login_at = NOW() - INTERVAL '1 hour' 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

UPDATE entries SET 
    last_accessed_at = NOW() - INTERVAL '30 minutes',
    access_count = 5
WHERE id = '770f9511-f3ac-52e5-b827-557666552222';
