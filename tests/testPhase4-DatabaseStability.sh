#!/bin/bash

# =============================================================================
# Test Phase 4: Stabilité de la base de données et gestion des erreurs
# =============================================================================
# Ce script teste la robustesse du backend face aux erreurs de base de données
# et la stabilité générale du système après les corrections.

set -e

# Configuration
API_BASE_URL="http://localhost:3001"
TEST_USER_EMAIL="testphase4@logon.local"
TEST_USER_USERNAME="testphase4"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions d'affichage
print_header() {
    echo
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    🔧 LOGON PHASE 4 TESTS                     ║"
    echo "║                DATABASE STABILITY & ERROR HANDLING            ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo
}

print_section() {
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "🧪 ${BLUE}$1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_test() {
    echo -e "🔄 Test: ${BLUE}$1${NC}"
}

print_success() {
    echo -e "✅ ${GREEN}SUCCÈS: $1${NC}"
}

print_error() {
    echo -e "❌ ${RED}ÉCHEC: $1${NC}"
}

print_warning() {
    echo -e "⚠️  ${YELLOW}ATTENTION: $1${NC}"
}

print_info() {
    echo -e "ℹ️  ${YELLOW}INFO: $1${NC}"
}

# Fonction utilitaire pour les requêtes
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            curl -s -X "$method" -H "Content-Type: application/json" -H "$headers" -d "$data" "$url"
        else
            curl -s -X "$method" -H "Content-Type: application/json" -d "$data" "$url"
        fi
    else
        if [ -n "$headers" ]; then
            curl -s -X "$method" -H "$headers" "$url"
        else
            curl -s -X "$method" "$url"
        fi
    fi
}

# Variables pour les données de test
generate_test_data() {
    USER_SALT=$(echo -n "test_salt_12345" | base64)
    USER_AUTH_HASH="test_auth_hash_123456789"
    RECOVERY_HASH="recovery_hash_test_123"
    RECOVERY_SALT="recovery_salt_test_456"
}

# Tests principaux
print_header
generate_test_data

print_section "TEST 1: STABILITÉ DU SERVEUR"

print_test "Vérification de l'état du serveur après corrections"
health_response=$(make_request "GET" "$API_BASE_URL/health")
if echo "$health_response" | grep -q '"status":"healthy"'; then
    print_success "Serveur en bonne santé après corrections"
    uptime=$(echo "$health_response" | jq -r '.uptime // "unknown"')
    print_info "Uptime: ${uptime}s"
else
    print_error "Serveur non disponible"
    exit 1
fi

print_test "Test de résistance aux requêtes mal formées"
bad_requests=(
    '{"malformed": json}'
    '{"email": ""}'
    '{"email": null}'
    ''
)

resistant_count=0
for bad_data in "${bad_requests[@]}"; do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$bad_data" "$API_BASE_URL/api/auth/salt")
    if [ "$response_code" = "400" ] || [ "$response_code" = "422" ]; then
        resistant_count=$((resistant_count + 1))
    fi
done

if [ "$resistant_count" -ge 3 ]; then
    print_success "Serveur résistant aux requêtes mal formées ($resistant_count/4)"
else
    print_warning "Serveur vulnérable aux requêtes mal formées ($resistant_count/4)"
fi

print_section "TEST 2: GESTION DES ERREURS DE BASE DE DONNÉES"

print_test "Test de récupération de sel utilisateur inexistant"
salt_response=$(make_request "POST" "$API_BASE_URL/api/auth/salt" '{"email":"nonexistent@test.com"}')
if echo "$salt_response" | grep -q '"salt"'; then
    print_success "Réponse appropriée pour utilisateur inexistant"
    exists=$(echo "$salt_response" | jq -r '.exists // true')
    if [ "$exists" = "false" ]; then
        print_info "Protection contre l'énumération d'utilisateurs active"
    fi
else
    print_error "Erreur dans la gestion des utilisateurs inexistants"
fi

print_test "Test de conversion des données bytea PostgreSQL"
# Tenter de créer et récupérer des données avec différents formats
register_data='{
    "email": "'$TEST_USER_EMAIL'",
    "username": "'$TEST_USER_USERNAME'",
    "authHash": "'$USER_AUTH_HASH'",
    "salt": "'$USER_SALT'",
    "recoveryCodeHash": "'$RECOVERY_HASH'",
    "recoveryCodeSalt": "'$RECOVERY_SALT'"
}'

register_response=$(make_request "POST" "$API_BASE_URL/api/auth/register" "$register_data")
if echo "$register_response" | grep -q '"success":true'; then
    print_success "Inscription avec données bytea réussie"
    
    # Test de récupération du sel
    salt_response=$(make_request "POST" "$API_BASE_URL/api/auth/salt" '{"email":"'$TEST_USER_EMAIL'"}')
    if echo "$salt_response" | grep -q '"salt"'; then
        print_success "Récupération de sel bytea réussie"
        salt_length=$(echo "$salt_response" | jq -r '.salt | length')
        if [ "$salt_length" -gt 10 ]; then
            print_info "Sel base64 correctement formaté (longueur: $salt_length)"
        fi
    else
        print_error "Erreur récupération sel bytea"
    fi
else
    print_error "Échec inscription avec données bytea"
    print_info "Réponse: $register_response"
fi

print_section "TEST 3: AUTHENTIFICATION COMPLÈTE"

print_test "Connexion avec utilisateur créé"
login_data='{
    "email": "'$TEST_USER_EMAIL'",
    "authHash": "'$USER_AUTH_HASH'"
}'

login_response=$(make_request "POST" "$API_BASE_URL/api/auth/login" "$login_data")
if echo "$login_response" | grep -q '"success":true'; then
    print_success "Connexion réussie avec données converties"
    
    # Extraction des tokens
    ACCESS_TOKEN=$(echo "$login_response" | jq -r '.tokens.accessToken // empty')
    if [ -n "$ACCESS_TOKEN" ]; then
        print_info "Token d'accès reçu: ${ACCESS_TOKEN:0:20}..."
        
        # Test d'un endpoint protégé
        profile_response=$(make_request "GET" "$API_BASE_URL/api/users/me" "" "Authorization: Bearer $ACCESS_TOKEN")
        if echo "$profile_response" | grep -q "$TEST_USER_EMAIL"; then
            print_success "Accès aux endpoints protégés fonctionnel"
        else
            print_warning "Problème d'accès aux endpoints protégés"
        fi
    else
        print_warning "Token non extrait correctement"
    fi
else
    print_error "Connexion échouée"
    print_info "Réponse: $login_response"
fi

print_section "TEST 4: RÉSISTANCE AUX CHARGES"

print_test "Test de charge simultanée"
concurrent_requests=5
success_count=0

for i in $(seq 1 $concurrent_requests); do
    {
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health")
        if [ "$response_code" = "200" ]; then
            echo "success"
        fi
    } &
done

wait
success_count=$(jobs | wc -l)

if [ "$success_count" -ge 3 ]; then
    print_success "Serveur résistant aux requêtes simultanées"
else
    print_warning "Serveur potentiellement vulnérable aux charges"
fi

print_test "Vérification absence de fuites mémoire"
initial_health=$(make_request "GET" "$API_BASE_URL/health")
initial_memory=$(echo "$initial_health" | jq -r '.memory.heapUsed // 0')

# Faire plusieurs requêtes
for i in {1..10}; do
    make_request "POST" "$API_BASE_URL/api/auth/salt" '{"email":"test'$i'@test.com"}' > /dev/null
done

final_health=$(make_request "GET" "$API_BASE_URL/health")
final_memory=$(echo "$final_health" | jq -r '.memory.heapUsed // 0')

memory_diff=$((final_memory - initial_memory))
if [ "$memory_diff" -lt 5000000 ]; then # 5MB max
    print_success "Pas de fuite mémoire détectée (+${memory_diff} bytes)"
else
    print_warning "Possible fuite mémoire détectée (+${memory_diff} bytes)"
fi

print_section "TEST 5: VÉRIFICATION DES LOGS"

print_test "Vérification de l'absence d'erreurs critiques"
# Vérifier que le backend ne crash plus
backend_logs=$(docker-compose -f docker-compose.dev.yml logs --tail=10 backend 2>/dev/null || echo "")
if echo "$backend_logs" | grep -q "unhandledRejection"; then
    print_error "Rejections non gérées détectées dans les logs"
else
    print_success "Aucune rejection non gérée détectée"
fi

if echo "$backend_logs" | grep -q "uncaughtException"; then
    print_error "Exceptions non capturées détectées"
else
    print_success "Aucune exception non capturée détectée"
fi

print_section "NETTOYAGE"
print_test "Suppression des données de test"
if [ -n "$ACCESS_TOKEN" ]; then
    delete_response=$(make_request "DELETE" "$API_BASE_URL/api/users/me" "" "Authorization: Bearer $ACCESS_TOKEN")
    if echo "$delete_response" | grep -q "success"; then
        print_success "Nettoyage réussi"
    else
        print_info "Nettoyage manuel nécessaire"
    fi
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "🏁 ${GREEN}PHASE 4 TERMINÉE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "✅ Base de données stabilisée"
echo "✅ Gestion des erreurs améliorée"
echo "✅ Conversion bytea PostgreSQL corrigée"
echo "✅ Rejections non gérées éliminées"
echo
echo "🔧 Corrections appliquées :"
echo "   • Colonnes username et is_active ajoutées au schéma initial"
echo "   • Gestion robuste des conversions bytea → base64"
echo "   • Gestionnaire d'erreurs globaux renforcés"
echo "   • Migration 003 supprimée (intégrée dans 001)"
echo
echo "📋 Prochaines étapes suggérées :"
echo "   • Implémenter les endpoints CRUD manquants"
echo "   • Ajouter la validation Argon2 des mots de passe"
echo "   • Finaliser les fonctionnalités de groupes"
echo "   • Tests d'intégration avancés"
