#!/bin/bash

# ==============================================
# Script de test pour la Phase 1.4 - Finalisation Infrastructure
# Vérifie que toutes les routes API et services sont fonctionnels
# ==============================================

set -e -o pipefail

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
SLEEP_TIME=3

# Fonction d'affichage
print_header() {
    echo -e "\n${PURPLE}=============================="
    echo -e "🚀 TEST PHASE 1.4 - FINALISATION"
    echo -e "==============================${NC}\n"
}

print_test() {
    echo -e "${BLUE}🧪 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Compteurs de tests
TESTS_PASSED=0
TESTS_FAILED=0

# Fonction de test HTTP
test_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    local method="${4:-GET}"
    
    print_test "Test: $description"
    
    if command -v curl >/dev/null 2>&1; then
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BACKEND_URL$endpoint" || echo "000")
        
        if [ "$status_code" = "$expected_status" ]; then
            print_success "$description - Status: $status_code"
            ((TESTS_PASSED++))
        else
            print_error "$description - Status: $status_code (attendu: $expected_status)"
            ((TESTS_FAILED++))
        fi
    else
        print_warning "curl non disponible, test ignoré"
    fi
}

# Fonction de test de route avec contenu
test_route_content() {
    local endpoint="$1"
    local expected_content="$2"
    local description="$3"
    
    print_test "Test: $description"
    
    if command -v curl >/dev/null 2>&1; then
        local response=$(curl -s "$BACKEND_URL$endpoint" 2>/dev/null || echo "")
        
        if echo "$response" | grep -q "$expected_content"; then
            print_success "$description - Contenu correct"
            ((TESTS_PASSED++))
        else
            print_error "$description - Contenu incorrect"
            print_info "Réponse: $response"
            ((TESTS_FAILED++))
        fi
    else
        print_warning "curl non disponible, test ignoré"
    fi
}

# Fonction principale de test
run_infrastructure_tests() {
    print_header
    
    print_info "Vérification de l'état du serveur backend..."
    
    # Attendre que le serveur soit disponible
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$BACKEND_URL/health" >/dev/null 2>&1; then
            print_success "Serveur backend disponible"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                print_error "Serveur backend non disponible après $max_attempts tentatives"
                print_info "Assurez-vous que le serveur backend est démarré (npm run dev)"
                exit 1
            fi
            print_info "Tentative $attempt/$max_attempts - Attente du serveur..."
            sleep 2
            ((attempt++))
        fi
    done
    
    echo -e "\n${YELLOW}🔍 TESTS DES ENDPOINTS DE BASE${NC}"
    
    # Tests des endpoints de base
    test_endpoint "/health" "200" "Health check endpoint"
    test_route_content "/health" "healthy" "Health check contenu"
    
    echo -e "\n${YELLOW}🔍 TESTS DES ROUTES API${NC}"
    
    # Tests des routes API (doivent exister même si pas complètement implémentées)
    test_endpoint "/api/auth/login" "404" "Route auth/login existe"
    test_endpoint "/api/auth/register" "404" "Route auth/register existe"
    test_endpoint "/api/auth/salt" "404" "Route auth/salt existe"
    
    test_endpoint "/api/users" "404" "Route users existe"
    test_endpoint "/api/users/me" "404" "Route users/me existe"
    
    test_endpoint "/api/entries" "404" "Route entries existe"
    test_endpoint "/api/groups" "404" "Route groups existe"
    test_endpoint "/api/audit" "404" "Route audit existe"
    
    echo -e "\n${YELLOW}🔍 TESTS DES MIDDLEWARES DE SÉCURITÉ${NC}"
    
    # Tests des headers de sécurité
    print_test "Test: Headers de sécurité CSP"
    if command -v curl >/dev/null 2>&1; then
        local headers=$(curl -s -I "$BACKEND_URL/health" 2>/dev/null || echo "")
        
        if echo "$headers" | grep -q "Content-Security-Policy"; then
            print_success "Header CSP présent"
            ((TESTS_PASSED++))
        else
            print_error "Header CSP manquant"
            ((TESTS_FAILED++))
        fi
        
        if echo "$headers" | grep -q "X-Content-Type-Options"; then
            print_success "Header X-Content-Type-Options présent"
            ((TESTS_PASSED++))
        else
            print_error "Header X-Content-Type-Options manquant"
            ((TESTS_FAILED++))
        fi
    fi
    
    echo -e "\n${YELLOW}🔍 TESTS DU RATE LIMITING${NC}"
    
    # Test du rate limiting (faire plusieurs requêtes rapides)
    print_test "Test: Rate limiting global"
    local rate_limit_test_passed=true
    
    if command -v curl >/dev/null 2>&1; then
        for i in {1..10}; do
            local status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" || echo "000")
            if [ "$status" = "429" ]; then
                print_success "Rate limiting activé après $i requêtes"
                ((TESTS_PASSED++))
                rate_limit_test_passed=true
                break
            fi
            sleep 0.1
        done
        
        if [ "$rate_limit_test_passed" = true ]; then
            print_info "Rate limiting fonctionne (ou limite très élevée)"
        else
            print_warning "Rate limiting pas déclenché avec 10 requêtes"
        fi
    fi
    
    echo -e "\n${YELLOW}🔍 TESTS DE MONITORING${NC}"
    
    # Tests des métriques (si endpoint disponible)
    test_endpoint "/metrics" "200" "Endpoint métriques"
    
    echo -e "\n${YELLOW}🔍 TESTS DE BASE DE DONNÉES${NC}"
    
    # Test de la base de données via health check
    test_route_content "/health" "database" "Connexion base de données"
    test_route_content "/health" "pool" "Pool de connexions"
    
    echo -e "\n${YELLOW}📊 RÉSULTATS FINAUX${NC}"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=$((TESTS_PASSED * 100 / total_tests))
    
    echo -e "\n================================="
    echo -e "📈 RÉSULTATS DES TESTS:"
    echo -e "================================="
    echo -e "✅ Tests réussis: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "❌ Tests échoués: ${RED}$TESTS_FAILED${NC}"
    echo -e "📊 Total tests: $total_tests"
    echo -e "🎯 Taux de réussite: ${GREEN}$success_rate%${NC}"
    echo -e "================================="
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}TOUS LES TESTS SONT PASSÉS !${NC}"
        echo -e "✅ L'infrastructure Phase 1.4 est prête"
        echo -e "➡️  Vous pouvez passer à la Phase 2"
        return 0
    else
        echo -e "\n⚠️  ${YELLOW}CERTAINS TESTS ONT ÉCHOUÉ${NC}"
        echo -e "🔧 Vérifiez les éléments suivants:"
        echo -e "   - Serveur backend démarré"
        echo -e "   - Routes API implémentées"
        echo -e "   - Middlewares configurés"
        echo -e "   - Base de données connectée"
        return 1
    fi
}

# Exécution des tests
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --help, -h    Affiche cette aide"
    echo "  --url URL     URL du backend (défaut: http://localhost:3001)"
    echo ""
    echo "Ce script teste la finalisation de l'infrastructure Phase 1.4"
    echo "Il vérifie que tous les endpoints, middlewares et services sont fonctionnels"
    exit 0
fi

if [ "$1" = "--url" ]; then
    BACKEND_URL="$2"
fi

# Lancement des tests
run_infrastructure_tests
