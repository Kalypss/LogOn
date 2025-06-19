#!/bin/bash

# ==============================================
# Script de test pour la Phase 1.2 - Configuration base de données
# Vérifie les schémas PostgreSQL et les migrations
# ==============================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_test() {
    echo -e "${BLUE}🧪 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║         🧪 Tests Phase 1.2 - Configuration Base de Données  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

TESTS_PASSED=0
TESTS_FAILED=0

test_file() {
    local file="$1"
    local desc="$2"
    
    if [ -f "$file" ]; then
        echo "✅ $desc"
        ((TESTS_PASSED++))
    else
        echo "❌ $desc"
        ((TESTS_FAILED++))
    fi
}

test_content() {
    local file="$1"
    local pattern="$2"
    local desc="$3"
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo "✅ $desc"
        ((TESTS_PASSED++))
    else
        echo "❌ $desc"
        ((TESTS_FAILED++))
    fi
}

test_directory() {
    local dir="$1"
    local desc="$2"
    
    if [ -d "$dir" ]; then
        echo "✅ $desc"
        ((TESTS_PASSED++))
    else
        echo "❌ $desc"
        ((TESTS_FAILED++))
    fi
}

# Tests de structure des fichiers
print_test "Structure des dossiers base de données"
test_directory "database" "Dossier database"
test_directory "database/migrations" "Dossier migrations"
test_directory "database/backups" "Dossier backups"

print_test "Fichiers de migration"
test_file "database/migrations/001_initial_schema.sql" "Migration initiale"
test_file "database/migrations/002_seed_data.sql" "Données de test"

print_test "Structure backend"
test_directory "backend/src" "Dossier src backend"
test_directory "backend/src/config" "Dossier config"
test_directory "backend/src/controllers" "Dossier controllers"
test_directory "backend/src/models" "Dossier models"
test_directory "backend/src/middleware" "Dossier middleware"
test_directory "backend/src/services" "Dossier services"
test_directory "backend/src/utils" "Dossier utils"
test_directory "backend/src/routes" "Dossier routes"

print_test "Fichiers de configuration backend"
test_file "backend/src/config/database.ts" "Configuration database"
test_file "backend/src/utils/logger.ts" "Utilitaire logger"
test_file "backend/src/index.ts" "Point d'entrée"

print_test "Contenu des migrations SQL"
test_content "database/migrations/001_initial_schema.sql" "CREATE TABLE users" "Table users"
test_content "database/migrations/001_initial_schema.sql" "CREATE TABLE groups" "Table groups"
test_content "database/migrations/001_initial_schema.sql" "CREATE TABLE entries" "Table entries"
test_content "database/migrations/001_initial_schema.sql" "CREATE TABLE audit_logs" "Table audit_logs"
test_content "database/migrations/001_initial_schema.sql" "CREATE EXTENSION.*uuid-ossp" "Extension UUID"

print_test "Sécurité dans les schémas"
test_content "database/migrations/001_initial_schema.sql" "auth_hash" "Hash d'authentification"
test_content "database/migrations/001_initial_schema.sql" "salt BYTEA" "Sel cryptographique"
test_content "database/migrations/001_initial_schema.sql" "iv BYTEA" "Vecteur d'initialisation"
test_content "database/migrations/001_initial_schema.sql" "auth_tag BYTEA" "Tag d'authentification"

print_test "Configuration TypeScript backend"
test_content "backend/src/config/database.ts" "Pool" "Pool de connexions"
test_content "backend/src/config/database.ts" "createAuditLog" "Fonction audit"
test_content "backend/src/config/database.ts" "healthCheck" "Health check"

print_test "Logger configuré"
test_content "backend/src/utils/logger.ts" "winston" "Winston logger"
test_content "backend/src/utils/logger.ts" "StructuredLogger" "Logger structuré"
test_content "backend/src/utils/logger.ts" "audit" "Logs d'audit"

print_test "Point d'entrée Express"
test_content "backend/src/index.ts" "express" "Framework Express"
test_content "backend/src/index.ts" "helmet" "Sécurité Helmet"
test_content "backend/src/index.ts" "cors" "Configuration CORS"
test_content "backend/src/index.ts" "health" "Endpoint health"

print_test "Configuration Redis"
test_file "redis/redis.conf" "Configuration Redis"
test_content "redis/redis.conf" "maxmemory" "Limite mémoire"
test_content "redis/redis.conf" "appendonly" "Persistance AOF"

print_test "Configuration Nginx"
test_file "nginx/conf.d/default.conf" "Configuration Nginx"
test_content "nginx/conf.d/default.conf" "ssl_protocols" "Protocoles SSL"
test_content "nginx/conf.d/default.conf" "rate_limit" "Rate limiting"

# Test de validation SQL (si PostgreSQL disponible)
if command -v psql &> /dev/null; then
    print_test "Validation SQL"
    if psql --version &> /dev/null; then
        echo "✅ PostgreSQL disponible pour validation"
        ((TESTS_PASSED++))
    else
        echo "⚠️ PostgreSQL non configuré"
    fi
else
    echo "⚠️ PostgreSQL non disponible - validation SQL ignorée"
fi

# Test de validation TypeScript
if command -v tsc &> /dev/null; then
    print_test "Validation TypeScript"
    cd backend
    if tsc --noEmit --skipLibCheck 2>/dev/null; then
        echo "✅ TypeScript valide"
        ((TESTS_PASSED++))
    else
        echo "❌ Erreurs TypeScript détectées"
        ((TESTS_FAILED++))
    fi
    cd ..
else
    echo "⚠️ TypeScript compiler non disponible"
fi

# Résumé
echo
echo "=========================================="
echo "Tests réussis: $TESTS_PASSED"
echo "Tests échoués: $TESTS_FAILED"
echo "Total: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo
    echo "🎉 Tous les tests sont passés !"
    echo "✅ Phase 1.2 complète - Configuration base de données"
    echo
    echo "📋 Prochaines étapes:"
    echo "1. Installer les dépendances: cd backend && npm install"
    echo "2. Tester la connexion: docker-compose -f docker-compose.dev.yml up -d db"
    echo "3. Commencer Phase 2: Cryptographie côté client"
    exit 0
else
    echo
    echo "❌ Certains tests ont échoué"
    echo "Vérifiez la configuration avant de continuer"
    exit 1
fi
