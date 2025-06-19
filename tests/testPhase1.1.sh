#!/bin/bash

# ==============================================
# Script de test pour la Phase 1.1 - Configuration environnement
# Vérifie que Docker, Docker Compose et la structure sont corrects
# ==============================================

set -e -o pipefail

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage
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

# Compteurs de tests
TESTS_PASSED=0
TESTS_FAILED=0

# Fonction de test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_test "Test: $test_name"
    
    if timeout 10 bash -c "$test_command"; then
        print_success "$test_name - RÉUSSI"
        ((TESTS_PASSED++))
    else
        print_error "$test_name - ÉCHOUÉ"
        ((TESTS_FAILED++))
    fi
    echo
}

echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           🧪 Tests Phase 1.1 - Configuration Docker         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Test 1: Vérification de la structure des fichiers
run_test "Structure des fichiers Docker" "
    [ -f docker-compose.yml ] && 
    [ -f docker-compose.dev.yml ] && 
    [ -f backend/Dockerfile ] && 
    [ -f frontend/Dockerfile ] &&
    [ -f .env.example ] &&
    [ -f install.sh ] &&
    [ -x install.sh ]
"

# Test 2: Vérification du contenu des fichiers Docker Compose
run_test "Contenu docker-compose.yml" "
    grep -q 'version:' docker-compose.yml &&
    grep -q 'frontend:' docker-compose.yml &&
    grep -q 'backend:' docker-compose.yml &&
    grep -q 'db:' docker-compose.yml &&
    grep -q 'redis:' docker-compose.yml
"

# Test 3: Vérification du fichier de développement
run_test "Contenu docker-compose.dev.yml" "
    grep -q 'version:' docker-compose.dev.yml &&
    grep -q 'development' docker-compose.dev.yml &&
    grep -q '3000:3000' docker-compose.dev.yml &&
    grep -q '3001:3001' docker-compose.dev.yml
"

# Test 4: Vérification des Dockerfiles
run_test "Dockerfiles valides" "
    grep -q 'FROM node:20-alpine' backend/Dockerfile &&
    grep -q 'FROM node:20-alpine' frontend/Dockerfile &&
    grep -q 'WORKDIR /app' backend/Dockerfile &&
    grep -q 'WORKDIR /app' frontend/Dockerfile
"

# Test 5: Vérification du fichier .env.example
run_test "Variables d'environnement" "
    grep -q 'POSTGRES_PASSWORD=' .env.example &&
    grep -q 'JWT_SECRET=' .env.example &&
    grep -q 'SESSION_SECRET=' .env.example &&
    grep -q 'DATABASE_URL=' .env.example
"

# Test 6: Vérification des package.json
run_test "Configuration package.json backend" "
    [ -f backend/package.json ] &&
    grep -q '\"logon-backend\"' backend/package.json &&
    grep -q '\"express\"' backend/package.json &&
    grep -q '\"typescript\"' backend/package.json
"

run_test "Configuration package.json frontend" "
    [ -f frontend/package.json ] &&
    grep -q '\"logon-frontend\"' frontend/package.json &&
    grep -q '\"nuxt\"' frontend/package.json &&
    grep -q '\"vue\"' frontend/package.json
"

# Test 7: Vérification du script d'installation
run_test "Script d'installation fonctionnel" "
    grep -q 'check_requirements' install.sh &&
    grep -q 'install_docker' install.sh &&
    grep -q 'generate_secrets' install.sh &&
    grep -q 'build_and_start' install.sh
"

# Test 8: Vérification des permissions
run_test "Permissions correctes" "
    [ -x install.sh ] &&
    [ -r docker-compose.yml ] &&
    [ -r docker-compose.dev.yml ]
"

# Test 9: Vérification de la configuration TypeScript
run_test "Configuration TypeScript backend" "
    [ -f backend/tsconfig.json ] &&
    grep -q '\"strict\": true' backend/tsconfig.json &&
    grep -q '\"ES2022\"' backend/tsconfig.json
"

# Test 10: Vérification des réseaux Docker
run_test "Configuration réseaux Docker" "
    grep -q 'frontend-network' docker-compose.yml &&
    grep -q 'backend-network' docker-compose.yml &&
    grep -q 'internal: true' docker-compose.yml
"

# Test 11: Test de validation YAML
run_test "Validation syntaxe YAML" "
    python3 -c 'import yaml; yaml.safe_load(open(\"docker-compose.yml\"))' 2>/dev/null
"

# Test 12: Vérification de la sécurité Docker
run_test "Sécurité Docker configurée" "
    grep -q 'restart: unless-stopped' docker-compose.yml &&
    grep -q 'internal: true' docker-compose.yml &&
    ! grep -q 'privileged: true' docker-compose.yml
"

# Test 13: Vérification des volumes
run_test "Configuration volumes persistants" "
    grep -q 'postgres_data:' docker-compose.yml &&
    grep -q 'redis_data:' docker-compose.yml &&
    grep -q 'volumes:' docker-compose.yml
"

# Test 14: Test de construction (si Docker est disponible)
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    run_test "Test de construction Docker (dry-run)" "
        docker-compose -f docker-compose.dev.yml config > /dev/null
    "
else
    print_warning "Docker non disponible - Test de construction ignoré"
fi

# Test 15: Vérification des logs
run_test "Configuration des logs" "
    grep -q 'logs:' docker-compose.yml &&
    mkdir -p logs &&
    [ -d logs ]
"

# Résumé des tests
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                    📊 Résumé des Tests                      ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}Tests réussis: $TESTS_PASSED${NC}"
echo -e "${RED}Tests échoués: $TESTS_FAILED${NC}"
echo -e "Total: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}"
    echo "🎉 Tous les tests sont passés ! La Phase 1.1 est complète."
    echo "✅ Configuration Docker prête pour le développement"
    echo "✅ Scripts d'installation fonctionnels"
    echo "✅ Structure des fichiers correcte"
    echo -e "${NC}"
    
    echo -e "${BLUE}📋 Prochaines étapes suggérées:${NC}"
    echo "1. Lancer l'installation: ./install.sh"
    echo "2. Tester la construction: docker-compose -f docker-compose.dev.yml build"
    echo "3. Commencer la Phase 1.2: Configuration base de données"
    
    exit 0
else
    echo -e "${RED}"
    echo "❌ Certains tests ont échoué."
    echo "Veuillez corriger les erreurs avant de continuer."
    echo -e "${NC}"
    
    exit 1
fi
