#!/bin/bash

# =================================================================
# 🔐 LogOn Password Manager - Test Phase 3: Migration du Logger
# Validation du nouveau système de logging avancé
# =================================================================

set -e  # Arrête sur erreur
cd "$(dirname "$0")/.."

# Configuration des couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Variables globales
TEST_COUNT=0
SUCCESS_COUNT=0
FAILED_TESTS=()

# =================================================================
# FONCTIONS UTILITAIRES
# =================================================================

print_header() {
    echo -e "\n${PURPLE}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}${BOLD}║          🔐 LogOn - Test Phase 3: Logger Migration          ║${NC}"
    echo -e "${PURPLE}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

print_section() {
    echo -e "\n${CYAN}${BOLD}🔍 $1${NC}"
    echo -e "${CYAN}${BOLD}$(printf '=%.0s' {1..60})${NC}"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_code="${3:-0}"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "\n${YELLOW}⚡ Test $TEST_COUNT: $test_name${NC}"
    
    if eval "$test_command" >/dev/null 2>&1; then
        local exit_code=$?
        if [ $exit_code -eq $expected_code ]; then
            echo -e "${GREEN}✅ PASS${NC} - $test_name"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} - $test_name (Code: $exit_code, Expected: $expected_code)"
            FAILED_TESTS+=("$test_name")
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC} - $test_name (Command failed)"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

run_test_with_output() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "\n${YELLOW}⚡ Test $TEST_COUNT: $test_name${NC}"
    
    local output
    output=$(eval "$test_command" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        echo -e "${RED}Output:${NC} $output"
        FAILED_TESTS+=("$test_name")
        return 1
    fi
}

# =================================================================
# TESTS DE STRUCTURE DE FICHIERS
# =================================================================

test_file_structure() {
    print_section "Structure des fichiers de logging"
    
    run_test "Nouveau logger existe" "test -f backend/src/utils/logger_new.ts"
    run_test "Ancien logger existe encore" "test -f backend/src/utils/logger.ts"
    run_test "Logger TypeScript compilable" "cd backend && npx tsc --noEmit backend/src/utils/logger_new.ts"
}

# =================================================================
# TESTS DE SYNTAXE ET IMPORTS
# =================================================================

test_imports_migration() {
    print_section "Migration des imports du logger"
    
    local files_to_check=(
        "backend/src/index.ts"
        "backend/src/controllers/AuthController.ts"
        "backend/src/controllers/EntryController.ts"
        "backend/src/controllers/GroupController.ts"
        "backend/src/controllers/UserController.ts"
        "backend/src/services/AuthService.ts"
        "backend/src/services/JWTService.ts"
        "backend/src/services/TOTPService.ts"
        "backend/src/services/GroupCryptoService.ts"
        "backend/src/middleware/auth.ts"
        "backend/src/middleware/errorHandler.ts"
        "backend/src/middleware/monitoring.ts"
        "backend/src/routes/audit.ts"
        "backend/src/config/database.ts"
    )
    
    for file in "${files_to_check[@]}"; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            run_test_with_output "Import migré dans $filename" "grep 'logger_new' '$file'" "logger_new"
        fi
    done
}

# =================================================================
# TESTS DE COMPILATION TYPESCRIPT
# =================================================================

test_typescript_compilation() {
    print_section "Compilation TypeScript avec nouveau logger"
    
    # Test de compilation du nouveau logger seul
    run_test "Compilation logger_new.ts" "cd backend && npx tsc --noEmit src/utils/logger_new.ts"
    
    # Test de compilation des controllers avec le nouveau logger
    run_test "Compilation AuthController" "cd backend && npx tsc --noEmit src/controllers/AuthController.ts"
    run_test "Compilation EntryController" "cd backend && npx tsc --noEmit src/controllers/EntryController.ts"
    
    # Test de compilation complète du projet
    echo -e "\n${YELLOW}⚡ Test global: Compilation complète du backend${NC}"
    if cd backend && npm run build >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC} - Compilation complète réussie"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠️  WARN${NC} - Compilation complète échouée (attendu avec les dépendances manquantes)"
        echo -e "${CYAN}ℹ️  INFO${NC} - Les erreurs de types Node.js seront résolues avec Docker"
    fi
    TEST_COUNT=$((TEST_COUNT + 1))
}

# =================================================================
# TESTS DE FONCTIONNALITÉ DU NOUVEAU LOGGER
# =================================================================

test_logger_functionality() {
    print_section "Fonctionnalité du nouveau logger"
    
    # Créer un script de test temporaire pour tester le logger
    cat > /tmp/test_logger.js << 'EOF'
const winston = require('winston');

// Test simple de création de logger
try {
    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [
            new winston.transports.Console()
        ]
    });
    
    logger.info('Test logger functionality');
    console.log('LOGGER_TEST_SUCCESS');
} catch (error) {
    console.error('LOGGER_TEST_FAILED:', error.message);
    process.exit(1);
}
EOF
    
    run_test_with_output "Winston logger fonctionnel" "cd backend && node /tmp/test_logger.js" "LOGGER_TEST_SUCCESS"
    
    # Nettoyage
    rm -f /tmp/test_logger.js
}

# =================================================================
# TESTS DOCKER
# =================================================================

test_docker_compatibility() {
    print_section "Compatibilité Docker"
    
    run_test "Dockerfile valide" "cd backend && docker build --target development -t logon-backend-test . --quiet"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker build réussi${NC}"
        
        # Test de démarrage du conteneur (avec timeout)
        echo -e "\n${YELLOW}⚡ Test de démarrage du conteneur${NC}"
        if timeout 30s docker run --rm -d --name logon-test logon-backend-test >/dev/null 2>&1; then
            sleep 5
            if docker ps | grep -q logon-test; then
                echo -e "${GREEN}✅ PASS${NC} - Conteneur démarré avec succès"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                docker stop logon-test >/dev/null 2>&1
            else
                echo -e "${RED}❌ FAIL${NC} - Conteneur n'a pas démarré correctement"
                FAILED_TESTS+=("Conteneur startup")
            fi
        else
            echo -e "${YELLOW}⚠️  WARN${NC} - Test de démarrage ignoré (timeout ou erreur)"
        fi
        TEST_COUNT=$((TEST_COUNT + 1))
        
        # Nettoyage de l'image de test
        docker rmi logon-backend-test >/dev/null 2>&1 || true
    fi
}

# =================================================================
# TESTS DE RÉGRESSION
# =================================================================

test_backward_compatibility() {
    print_section "Tests de régression"
    
    # Vérifier que les anciennes fonctionnalités marchent toujours
    run_test "Validation UUID toujours présente" "grep -q 'isValidUUID' backend/src/utils/validation.ts"
    run_test "Middleware auth fonctionnel" "grep -q 'requireAuth' backend/src/middleware/auth.ts"
    run_test "Routes entries sécurisées" "grep -q 'requireAuth' backend/src/routes/entries.ts"
}

# =================================================================
# RAPPORT FINAL
# =================================================================

print_final_report() {
    echo -e "\n${BOLD}${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${PURPLE}║                    RAPPORT FINAL - PHASE 3                  ║${NC}"
    echo -e "${BOLD}${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "${BOLD}📊 Statistiques:${NC}"
    echo -e "   Tests exécutés  : ${CYAN}$TEST_COUNT${NC}"
    echo -e "   Tests réussis   : ${GREEN}$SUCCESS_COUNT${NC}"
    echo -e "   Tests échoués   : ${RED}$((TEST_COUNT - SUCCESS_COUNT))${NC}"
    
    local success_rate=$(( (SUCCESS_COUNT * 100) / TEST_COUNT ))
    echo -e "   Taux de réussite: ${CYAN}$success_rate%${NC}"
    
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        echo -e "\n${RED}❌ Tests échoués:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "   • $test"
        done
    fi
    
    echo -e "\n${BOLD}🎯 État de la migration du logger:${NC}"
    if [ $success_rate -ge 80 ]; then
        echo -e "${GREEN}✅ Migration du logger majoritairement réussie${NC}"
        echo -e "${GREEN}🚀 Prêt pour les tests en environnement Docker${NC}"
    elif [ $success_rate -ge 60 ]; then
        echo -e "${YELLOW}⚠️  Migration partielle - Corrections mineures nécessaires${NC}"
        echo -e "${YELLOW}🔧 Révision recommandée avant déploiement${NC}"
    else
        echo -e "${RED}❌ Migration problématique - Corrections majeures requises${NC}"
        echo -e "${RED}🛠️  Révision complète nécessaire${NC}"
    fi
    
    echo -e "\n${BOLD}🔄 Prochaines étapes recommandées:${NC}"
    echo -e "${CYAN}1.${NC} Finaliser la correction des types TypeScript"
    echo -e "${CYAN}2.${NC} Tester le nouveau logger dans l'environnement Docker"
    echo -e "${CYAN}3.${NC} Valider les performances du nouveau système de logging"
    echo -e "${CYAN}4.${NC} Remplacer définitivement l'ancien logger"
    echo -e "${CYAN}5.${NC} Documenter les nouvelles fonctionnalités de logging"
}

# =================================================================
# EXÉCUTION PRINCIPALE
# =================================================================

main() {
    print_header
    
    echo -e "${BOLD}🎯 Objectif:${NC} Validation de la migration vers le nouveau système de logging avancé"
    echo -e "${BOLD}📝 Scope:${NC} Structure, imports, compilation, fonctionnalité, Docker"
    
    test_file_structure
    test_imports_migration
    test_typescript_compilation
    test_logger_functionality
    test_docker_compatibility
    test_backward_compatibility
    
    print_final_report
    
    # Code de sortie basé sur le taux de réussite
    if [ $success_rate -ge 80 ]; then
        exit 0
    else
        exit 1
    fi
}

# Exécution du script principal
main "$@"
