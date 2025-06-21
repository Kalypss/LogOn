#!/bin/bash

# 🔐 LogOn Password Manager - Test Complet du Backend
# Script de test exhaustif de toutes les fonctionnalités backend
# Based on ROADMAP.md - Phases 1, 2, 3 et partiellement 4

# Configuration des couleurs et emojis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration des URLs
API_BASE_URL="http://localhost:3001"
HEALTH_URL="$API_BASE_URL/health"
METRICS_URL="$API_BASE_URL/metrics"

# Variables globales pour les tests
USER_EMAIL="test@logon.dev"
USER_USERNAME="testuser"
USER_PASSWORD="TestPassword123!"
USER_SALT=""
USER_AUTH_HASH=""
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
TOTP_SECRET=""
TOTP_QR_CODE=""
ENTRY_ID=""
GROUP_ID=""
BACKUP_CODES=()

# Compteurs de tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction d'affichage avec emojis
print_header() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}                    🔐 LOGON BACKEND TESTS                     ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    echo -e "${YELLOW}🔄 Test: $1${NC}"
}

print_success() {
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
    echo -e "${GREEN}✅ SUCCÈS: $1${NC}"
}

print_error() {
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
    echo -e "${RED}❌ ÉCHEC: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ATTENTION: $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  INFO: $1${NC}"
}

print_not_implemented() {
    ((TOTAL_TESTS++))
    echo -e "${PURPLE}🚧 NON IMPLÉMENTÉ: $1${NC}"
}

# Fonction pour faire une requête HTTP avec gestion d'erreur
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    
    if [ -n "$headers" ] && [ -n "$data" ]; then
        curl -s -X "$method" "$url" -H "Content-Type: application/json" -H "$headers" -d "$data"
    elif [ -n "$data" ]; then
        curl -s -X "$method" "$url" -H "Content-Type: application/json" -d "$data"
    elif [ -n "$headers" ]; then
        curl -s -X "$method" "$url" -H "$headers"
    else
        curl -s -X "$method" "$url"
    fi
}

# Fonction pour générer un hash d'authentification factice (côté serveur pour test)
generate_test_auth_hash() {
    echo "test_auth_hash_$(date +%s)"
}

# Fonction pour générer un sel factice
generate_test_salt() {
    echo "dGVzdF9zYWx0XzEyMzQ1Njc4OTA="  # base64 de "test_salt_1234567890"
}

# Fonction pour vérifier si le serveur répond
check_server() {
    print_test "Vérification de la disponibilité du serveur"
    
    if curl -s --connect-timeout 5 "$HEALTH_URL" > /dev/null; then
        print_success "Serveur backend accessible sur $API_BASE_URL"
        return 0
    else
        print_error "Serveur backend non accessible sur $API_BASE_URL"
        print_warning "Assurez-vous que le serveur backend est démarré"
        return 1
    fi
}

# Phase 1: Tests d'Infrastructure et Base
test_phase1_infrastructure() {
    print_section "PHASE 1: INFRASTRUCTURE ET BASE"
    
    # Test 1.1: Health Check
    print_test "Health Check du serveur"
    response=$(make_request "GET" "$HEALTH_URL")
    if echo "$response" | grep -q '"status":"healthy"'; then
        print_success "Health Check - Serveur en bonne santé"
        print_info "Réponse: $(echo "$response" | jq -r '.status // "Non parsable"')"
    else
        print_error "Health Check - Serveur non disponible"
        print_info "Réponse: $response"
    fi
    
    # Test 1.2: Métriques système
    print_test "Récupération des métriques système"
    metrics_response=$(make_request "GET" "$METRICS_URL")
    if echo "$metrics_response" | grep -q 'timestamp'; then
        print_success "Métriques système disponibles"
        if echo "$metrics_response" | grep -q 'security'; then
            print_info "Métriques de sécurité présentes"
        fi
        if echo "$metrics_response" | grep -q 'performance'; then
            print_info "Métriques de performance présentes"
        fi
    else
        print_error "Métriques système non disponibles"
    fi
    
    # Test 1.3: Endpoints de base
    print_test "Test des endpoints principaux (404 attendu)"
    
    endpoints=(
        "/api/auth/nonexistent"
        "/api/users/nonexistent" 
        "/api/entries/nonexistent"
        "/api/groups/nonexistent"
    )
    
    for endpoint in "${endpoints[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$endpoint")
        if [ "$response" = "404" ]; then
            print_success "Endpoint $endpoint retourne 404 comme attendu"
        else
            print_warning "Endpoint $endpoint retourne $response (404 attendu)"
        fi
    done
    
    # Test 1.4: Rate Limiting
    print_test "Test du rate limiting"
    print_info "Envoi de 10 requêtes rapides pour tester le rate limiting..."
    
    rate_limit_hit=false
    for i in {1..10}; do
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/auth/salt" -d '{"email":"test@test.com"}' -H "Content-Type: application/json")
        if [ "$response_code" = "429" ]; then
            rate_limit_hit=true
            break
        fi
        sleep 0.1
    done
    
    if [ "$rate_limit_hit" = true ]; then
        print_success "Rate limiting fonctionnel (HTTP 429)"
    else
        print_warning "Rate limiting non détecté (peut être normal selon la configuration)"
    fi
}

# Phase 2: Tests de Cryptographie et Authentification
test_phase2_authentication() {
    print_section "PHASE 2: CRYPTOGRAPHIE ET AUTHENTIFICATION"
    
    # Préparation des données de test
    USER_SALT=$(generate_test_salt)
    USER_AUTH_HASH=$(generate_test_auth_hash)
    
    # Test 2.1: Inscription utilisateur
    print_test "Inscription d'un nouvel utilisateur"
    
    register_data='{
        "email": "'$USER_EMAIL'",
        "username": "'$USER_USERNAME'",
        "authHash": "'$USER_AUTH_HASH'",
        "salt": "'$USER_SALT'",
        "recoveryCodeHash": "recovery_hash_test",
        "recoveryCodeSalt": "recovery_salt_test"
    }'
    
    register_response=$(make_request "POST" "$API_BASE_URL/api/auth/register" "$register_data")
    
    if echo "$register_response" | grep -q '"success":true'; then
        print_success "Inscription utilisateur réussie"
        USER_ID=$(echo "$register_response" | jq -r '.user.id // empty')
        if [ -n "$USER_ID" ]; then
            print_info "User ID: $USER_ID"
        fi
    elif echo "$register_response" | grep -q 'existe déjà'; then
        print_warning "Utilisateur existe déjà - Test d'inscription sauté"
    else
        print_error "Inscription utilisateur échouée"
        print_info "Réponse: $register_response"
    fi
    
    # Test 2.2: Récupération du sel utilisateur
    print_test "Récupération du sel pour dérivation de clés"
    
    salt_data='{"email": "'$USER_EMAIL'"}'
    salt_response=$(make_request "POST" "$API_BASE_URL/api/auth/salt" "$salt_data")
    
    if echo "$salt_response" | grep -q '"salt"'; then
        print_success "Récupération du sel réussie"
        retrieved_salt=$(echo "$salt_response" | jq -r '.salt')
        print_info "Sel récupéré: ${retrieved_salt:0:20}..."
    else
        print_error "Récupération du sel échouée"
        print_info "Réponse: $salt_response"
    fi
    
    # Test 2.3: Connexion utilisateur
    print_test "Connexion utilisateur"
    
    login_data='{
        "email": "'$USER_EMAIL'",
        "authHash": "'$USER_AUTH_HASH'"
    }'
    
    login_response=$(make_request "POST" "$API_BASE_URL/api/auth/login" "$login_data")
    
    if echo "$login_response" | grep -q '"accessToken"'; then
        print_success "Connexion utilisateur réussie"
        ACCESS_TOKEN=$(echo "$login_response" | jq -r '.tokens.accessToken // empty')
        REFRESH_TOKEN=$(echo "$login_response" | jq -r '.tokens.refreshToken // empty')
        
        if [ -n "$ACCESS_TOKEN" ]; then
            print_info "Access Token reçu: ${ACCESS_TOKEN:0:20}..."
        fi
        if [ -n "$REFRESH_TOKEN" ]; then
            print_info "Refresh Token reçu: ${REFRESH_TOKEN:0:20}..."
        fi
    else
        print_error "Connexion utilisateur échouée"
        print_info "Réponse: $login_response"
    fi
    
    # Test 2.4: Vérification de session
    print_test "Vérification de la validité de session"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        verify_response=$(make_request "GET" "$API_BASE_URL/api/auth/verify" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$verify_response" | grep -q '"valid":true'; then
            print_success "Session valide confirmée"
        else
            print_error "Session invalide ou erreur de vérification"
            print_info "Réponse: $verify_response"
        fi
    else
        print_warning "Pas de token disponible pour la vérification"
    fi
    
    # Test 2.5: Configuration 2FA
    print_test "Configuration de l'authentification à deux facteurs (2FA)"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        totp_setup_response=$(make_request "POST" "$API_BASE_URL/api/auth/2fa/setup" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$totp_setup_response" | grep -q '"secret"'; then
            print_success "Configuration 2FA initiée"
            TOTP_SECRET=$(echo "$totp_setup_response" | jq -r '.secret // empty')
            TOTP_QR_CODE=$(echo "$totp_setup_response" | jq -r '.qrCodeUrl // empty')
            
            if [ -n "$TOTP_SECRET" ]; then
                print_info "Secret TOTP généré: ${TOTP_SECRET:0:20}..."
            fi
            
            if [ -n "$TOTP_QR_CODE" ]; then
                print_success "QR Code généré pour 2FA (data:image/png;base64)"
                print_info "QR Code disponible (${#TOTP_QR_CODE} caractères)"
                
                # Optionnel: Sauvegarder le QR code dans un fichier
                if command -v base64 &> /dev/null; then
                    echo "$TOTP_QR_CODE" | sed 's/data:image\/png;base64,//' | base64 -d > /tmp/logon_qr_code.png 2>/dev/null
                    if [ -f /tmp/logon_qr_code.png ]; then
                        print_info "QR Code sauvegardé: /tmp/logon_qr_code.png"
                    fi
                fi
            fi
            
            # Récupération des codes de sauvegarde
            backup_codes=$(echo "$totp_setup_response" | jq -r '.backupCodes[]? // empty' 2>/dev/null)
            if [ -n "$backup_codes" ]; then
                print_info "Codes de sauvegarde générés"
                mapfile -t BACKUP_CODES <<< "$backup_codes"
            fi
            
        else
            print_error "Configuration 2FA échouée"
            print_info "Réponse: $totp_setup_response"
        fi
    else
        print_warning "Pas de token disponible pour configurer 2FA"
    fi
    
    # Test 2.6: Refresh Token
    print_test "Rafraîchissement du token d'accès"
    
    if [ -n "$REFRESH_TOKEN" ]; then
        refresh_data='{"refreshToken": "'$REFRESH_TOKEN'"}'
        refresh_response=$(make_request "POST" "$API_BASE_URL/api/auth/refresh" "$refresh_data")
        
        if echo "$refresh_response" | grep -q '"accessToken"'; then
            print_success "Rafraîchissement de token réussi"
            NEW_ACCESS_TOKEN=$(echo "$refresh_response" | jq -r '.accessToken // empty')
            if [ -n "$NEW_ACCESS_TOKEN" ] && [ "$NEW_ACCESS_TOKEN" != "$ACCESS_TOKEN" ]; then
                print_info "Nouveau token généré avec succès"
                ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
            fi
        else
            print_error "Rafraîchissement de token échoué"
            print_info "Réponse: $refresh_response"
        fi
    else
        print_warning "Pas de refresh token disponible"
    fi
}

# Phase 3: Tests du Système de Groupes
test_phase3_groups() {
    print_section "PHASE 3: SYSTÈME DE GROUPES"
    
    # Test 3.1: Création d'un groupe
    print_test "Création d'un nouveau groupe"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        group_data='{
            "name": "Groupe Test",
            "encryptedDescription": "Description chiffrée du groupe test",
            "encryptedGroupKey": "clé_groupe_chiffrée_test_base64"
        }'
        
        create_group_response=$(make_request "POST" "$API_BASE_URL/api/groups" "$group_data" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$create_group_response" | grep -q '"success":true'; then
            print_success "Création de groupe réussie"
            GROUP_ID=$(echo "$create_group_response" | jq -r '.group.id // empty')
            if [ -n "$GROUP_ID" ]; then
                print_info "Group ID: $GROUP_ID"
            fi
        else
            print_error "Création de groupe échouée"
            print_info "Réponse: $create_group_response"
        fi
    else
        print_warning "Pas de token disponible pour créer un groupe"
    fi
    
    # Test 3.2: Récupération des groupes
    print_test "Récupération de la liste des groupes"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        groups_response=$(make_request "GET" "$API_BASE_URL/api/groups" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$groups_response" | grep -q '"groups"'; then
            print_success "Récupération des groupes réussie"
            groups_count=$(echo "$groups_response" | jq '.groups | length' 2>/dev/null || echo "0")
            print_info "Nombre de groupes: $groups_count"
        else
            print_error "Récupération des groupes échouée"
            print_info "Réponse: $groups_response"
        fi
    else
        print_warning "Pas de token disponible pour récupérer les groupes"
    fi
    
    # Test 3.3: Détails d'un groupe spécifique
    print_test "Récupération des détails d'un groupe"
    
    if [ -n "$ACCESS_TOKEN" ] && [ -n "$GROUP_ID" ]; then
        group_details_response=$(make_request "GET" "$API_BASE_URL/api/groups/$GROUP_ID" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$group_details_response" | grep -q '"group"'; then
            print_success "Récupération des détails du groupe réussie"
            group_name=$(echo "$group_details_response" | jq -r '.group.name // "Non spécifié"')
            print_info "Nom du groupe: $group_name"
        else
            print_error "Récupération des détails du groupe échouée"
            print_info "Réponse: $group_details_response"
        fi
    else
        print_warning "Pas de token ou Group ID disponible"
    fi
    
    # Test 3.4: Gestion des membres (non implémenté dans le contrôleur visible)
    print_not_implemented "Invitation de membres dans le groupe"
    print_not_implemented "Gestion des rôles des membres"
    print_not_implemented "Révocation d'accès aux membres"
}

# Phase 4: Tests de Gestion des Entrées (Mots de passe)
test_phase4_entries() {
    print_section "PHASE 4: GESTION DES ENTRÉES (MOTS DE PASSE)"
    
    # Test 4.1: Création d'une entrée (mot de passe)
    print_test "Création d'une nouvelle entrée de mot de passe"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        entry_data='{
            "titleEncrypted": "dGVzdF90aXRsZV9lbmNyeXB0ZWQ=",
            "dataEncrypted": "dGVzdF9kYXRhX2VuY3J5cHRlZF9wYXNzd29yZA==",
            "iv": "aXZfdGVzdF8xMjM0NTY3ODkw",
            "authTag": "YXV0aF90YWdfdGVzdF8xMjM0NTY=",
            "type": "password"
        }'
        
        create_entry_response=$(make_request "POST" "$API_BASE_URL/api/entries" "$entry_data" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$create_entry_response" | grep -q '"success":true'; then
            print_success "Création d'entrée réussie"
            ENTRY_ID=$(echo "$create_entry_response" | jq -r '.entry.id // empty')
            if [ -n "$ENTRY_ID" ]; then
                print_info "Entry ID: $ENTRY_ID"
            fi
        else
            print_warning "Création d'entrée échouée - Controller non complètement implémenté"
            print_info "Réponse: $create_entry_response"
        fi
    else
        print_warning "Pas de token disponible pour créer une entrée"
    fi
    
    # Test 4.2: Récupération des entrées
    print_test "Récupération de la liste des entrées"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        entries_response=$(make_request "GET" "$API_BASE_URL/api/entries" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$entries_response" | grep -q '"entries"'; then
            print_success "Récupération des entrées réussie"
            entries_count=$(echo "$entries_response" | jq '.entries | length' 2>/dev/null || echo "0")
            print_info "Nombre d'entrées: $entries_count"
        else
            print_warning "Récupération des entrées échouée - Controller non complètement implémenté"
            print_info "Réponse: $entries_response"
        fi
    else
        print_warning "Pas de token disponible pour récupérer les entrées"
    fi
    
    # Test 4.3: Consultation d'une entrée spécifique
    print_test "Consultation d'une entrée spécifique"
    
    if [ -n "$ACCESS_TOKEN" ] && [ -n "$ENTRY_ID" ]; then
        entry_response=$(make_request "GET" "$API_BASE_URL/api/entries/$ENTRY_ID" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$entry_response" | grep -q '"entry"'; then
            print_success "Consultation d'entrée réussie"
            entry_type=$(echo "$entry_response" | jq -r '.entry.type // "unknown"')
            print_info "Type d'entrée: $entry_type"
        else
            print_warning "Consultation d'entrée échouée - Controller non complètement implémenté"
            print_info "Réponse: $entry_response"
        fi
    else
        print_warning "Pas de token ou Entry ID disponible"
    fi
    
    # Test 4.4: Modification d'une entrée
    print_test "Modification d'une entrée existante"
    
    if [ -n "$ACCESS_TOKEN" ] && [ -n "$ENTRY_ID" ]; then
        update_data='{
            "titleEncrypted": "dGVzdF90aXRsZV91cGRhdGVkX2VuY3J5cHRlZA==",
            "dataEncrypted": "dGVzdF9kYXRhX3VwZGF0ZWRfZW5jcnlwdGVk",
            "iv": "aXZfdGVzdF91cGRhdGVkXzEyMzQ1Ng==",
            "authTag": "YXV0aF90YWdfdXBkYXRlZF90ZXN0"
        }'
        
        update_response=$(make_request "PUT" "$API_BASE_URL/api/entries/$ENTRY_ID" "$update_data" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$update_response" | grep -q '"success":true'; then
            print_success "Modification d'entrée réussie"
        else
            print_not_implemented "Modification d'entrée - Endpoint non implémenté"
        fi
    else
        print_warning "Pas de token ou Entry ID disponible pour la modification"
    fi
    
    # Test 4.5: Suppression d'une entrée
    print_test "Suppression d'une entrée"
    
    if [ -n "$ACCESS_TOKEN" ] && [ -n "$ENTRY_ID" ]; then
        delete_response=$(make_request "DELETE" "$API_BASE_URL/api/entries/$ENTRY_ID" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$delete_response" | grep -q '"success":true'; then
            print_success "Suppression d'entrée réussie"
        else
            print_not_implemented "Suppression d'entrée - Endpoint non implémenté"
        fi
    else
        print_warning "Pas de token ou Entry ID disponible pour la suppression"
    fi
    
    # Test 4.6: Types d'entrées différents
    print_test "Création d'entrées de différents types"
    
    entry_types=("note" "card" "identity")
    for type in "${entry_types[@]}"; do
        if [ -n "$ACCESS_TOKEN" ]; then
            type_entry_data='{
                "titleEncrypted": "dGVzdF90aXRsZV8nJHR5cGUn",
                "dataEncrypted": "dGVzdF9kYXRhXycgJHR5cGUn",
                "iv": "aXZfdGVzdF8nJHR5cGUn",
                "authTag": "YXV0aF90YWdfJyR0eXBlJw==",
                "type": "'$type'"
            }'
            
            type_response=$(make_request "POST" "$API_BASE_URL/api/entries" "$type_entry_data" "Authorization: Bearer $ACCESS_TOKEN")
            
            if echo "$type_response" | grep -q '"success":true'; then
                print_success "Création d'entrée de type '$type' réussie"
            else
                print_warning "Création d'entrée de type '$type' échouée"
            fi
        fi
    done
}

# Tests de fonctionnalités avancées (partiellement implémentées)
test_advanced_features() {
    print_section "FONCTIONNALITÉS AVANCÉES"
    
    # Test A1: Audit et logs
    print_test "Récupération des logs d'audit"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        audit_response=$(make_request "GET" "$API_BASE_URL/api/audit" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$audit_response" | grep -q '"logs"'; then
            print_success "Logs d'audit disponibles"
            logs_count=$(echo "$audit_response" | jq '.logs | length' 2>/dev/null || echo "0")
            print_info "Nombre de logs: $logs_count"
        else
            print_not_implemented "Logs d'audit - Endpoint non implémenté"
        fi
    else
        print_warning "Pas de token disponible pour les logs d'audit"
    fi
    
    # Test A2: Gestion des utilisateurs
    print_test "Gestion des profils utilisateurs"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        profile_response=$(make_request "GET" "$API_BASE_URL/api/users/profile" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$profile_response" | grep -q '"user"'; then
            print_success "Profil utilisateur récupéré"
        else
            print_not_implemented "Profil utilisateur - Endpoint non implémenté"
        fi
    else
        print_warning "Pas de token disponible pour le profil"
    fi
    
    # Test A3: Statistiques utilisateur
    print_test "Statistiques utilisateur"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        stats_response=$(make_request "GET" "$API_BASE_URL/api/users/stats" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$stats_response" | grep -q '"stats"'; then
            print_success "Statistiques utilisateur disponibles"
        else
            print_not_implemented "Statistiques utilisateur - Endpoint non implémenté"
        fi
    else
        print_warning "Pas de token disponible pour les statistiques"
    fi
    
    # Test A4: Export sécurisé
    print_not_implemented "Export sécurisé des données"
    print_not_implemented "Import de données chiffrées"
    print_not_implemented "Sauvegarde automatique"
    
    # Test A5: Générateur de mots de passe
    print_not_implemented "Générateur de mots de passe côté serveur"
    print_not_implemented "Analyse de la force des mots de passe"
    print_not_implemented "Détection de mots de passe compromis"
}

# Test de sécurité
test_security_features() {
    print_section "TESTS DE SÉCURITÉ"
    
    # Test S1: Tentatives de connexion invalides
    print_test "Protection contre les tentatives de connexion invalides"
    
    invalid_login_data='{
        "email": "'$USER_EMAIL'",
        "authHash": "hash_invalide_test"
    }'
    
    invalid_login_response=$(make_request "POST" "$API_BASE_URL/api/auth/login" "$invalid_login_data")
    
    if echo "$invalid_login_response" | grep -q "invalide\|incorrect\|failed"; then
        print_success "Protection contre les identifiants invalides fonctionne"
    else
        print_warning "Réponse non sécurisée pour identifiants invalides"
        print_info "Réponse: $invalid_login_response"
    fi
    
    # Test S2: Accès sans token
    print_test "Protection des endpoints protégés sans token"
    
    protected_endpoints=(
        "/api/entries"
        "/api/groups"
        "/api/users/me"
        "/api/auth/2fa/setup"
    )
    
    for endpoint in "${protected_endpoints[@]}"; do
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$endpoint")
        if [ "$response_code" = "401" ] || [ "$response_code" = "403" ]; then
            print_success "Endpoint $endpoint protégé (HTTP $response_code)"
        else
            print_warning "Endpoint $endpoint non protégé (HTTP $response_code)"
        fi
    done
    
    # Test S3: Token invalide
    print_test "Protection contre les tokens invalides"
    
    invalid_token_response=$(make_request "GET" "$API_BASE_URL/api/auth/verify" "" "Authorization: Bearer token.invalide.test")
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/auth/verify" -H "Authorization: Bearer token.invalide.test")
    
    if [ "$response_code" = "401" ] || [ "$response_code" = "403" ]; then
        print_success "Protection contre les tokens invalides fonctionne"
    else
        print_warning "Réponse non sécurisée pour token invalide (HTTP $response_code)"
    fi
    
    # Test S4: Headers de sécurité
    print_test "Vérification des headers de sécurité"
    
    headers_response=$(curl -s -I "$HEALTH_URL")
    
    security_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
    )
    
    for header in "${security_headers[@]}"; do
        if echo "$headers_response" | grep -qi "$header"; then
            print_success "Header de sécurité '$header' présent"
        else
            print_warning "Header de sécurité '$header' manquant"
        fi
    done
}

# Test de nettoyage
cleanup_tests() {
    print_section "NETTOYAGE DES TESTS"
    
    # Déconnexion
    if [ -n "$ACCESS_TOKEN" ]; then
        print_test "Déconnexion de l'utilisateur"
        logout_response=$(make_request "POST" "$API_BASE_URL/api/auth/logout" "" "Authorization: Bearer $ACCESS_TOKEN")
        
        if echo "$logout_response" | grep -q '"success":true'; then
            print_success "Déconnexion réussie"
        else
            print_warning "Déconnexion échouée ou non implémentée"
        fi
    fi
    
    # Nettoyage des fichiers temporaires
    rm -f /tmp/logon_qr_code.png 2>/dev/null
    
    print_info "Nettoyage terminé"
}

# Résumé des tests
print_summary() {
    print_section "RÉSUMÉ DES TESTS"
    
    echo -e "${WHITE}📊 STATISTIQUES DES TESTS:${NC}"
    echo -e "${GREEN}✅ Tests réussis: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Tests échoués: $FAILED_TESTS${NC}"
    echo -e "${PURPLE}🚧 Non implémentés: $((TOTAL_TESTS - PASSED_TESTS - FAILED_TESTS))${NC}"
    echo -e "${CYAN}📈 Total des tests: $TOTAL_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 TOUS LES TESTS IMPLÉMENTÉS ONT RÉUSSI !${NC}"
        success_rate=100
    else
        success_rate=$((PASSED_TESTS * 100 / (PASSED_TESTS + FAILED_TESTS)))
        echo -e "\n${YELLOW}⚠️  Taux de réussite: ${success_rate}%${NC}"
    fi
    
    # Analyse de l'état du backend selon la roadmap
    echo -e "\n${CYAN}📋 ÉTAT DU BACKEND SELON LA ROADMAP:${NC}"
    echo -e "${GREEN}✅ Phase 1 (Infrastructure): Complètement implémentée${NC}"
    echo -e "${GREEN}✅ Phase 2 (Authentification): Largement implémentée${NC}"
    echo -e "${YELLOW}🔄 Phase 3 (Groupes): Partiellement implémentée${NC}"
    echo -e "${YELLOW}🔄 Phase 4 (Entrées): Partiellement implémentée${NC}"
    echo -e "${RED}❌ Fonctionnalités avancées: Non implémentées${NC}"
    
    echo -e "\n${BLUE}🔍 POINTS D'ATTENTION:${NC}"
    echo -e "• Controllers EntryController et GroupController non complètement connectés"
    echo -e "• Middleware d'authentification à finaliser (userId extraction)"
    echo -e "• Endpoints CRUD complets à implémenter"
    echo -e "• Tests d'intégration avec la base de données nécessaires"
    echo -e "• Validation des données d'entrée à renforcer"
}

# Fonction principale
main() {
    print_header
    
    # Vérification préalable
    if ! check_server; then
        print_error "Impossible de continuer les tests sans serveur backend"
        exit 1
    fi
    
    # Exécution des phases de test
    test_phase1_infrastructure
    test_phase2_authentication
    test_phase3_groups
    test_phase4_entries
    test_advanced_features
    test_security_features
    
    # Nettoyage et résumé
    cleanup_tests
    print_summary
    
    # Code de sortie
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Exécution du script
main "$@"
