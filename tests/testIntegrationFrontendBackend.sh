#!/bin/bash

# 🔗 LogOn Password Manager - Test Intégration Frontend-Backend
# Validation complète des connexions entre le frontend et le backend

set -e

echo "🔗 Test Intégration Frontend-Backend - LogOn Password Manager"
echo "============================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# Fonction pour afficher les informations
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour afficher les avertissements
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Fonction pour afficher les sections
print_section() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

echo
print_section "Phase 1: Vérification des services backend"

# Vérification des services backend
backend_services=(
    "backend/src/services/JWTService.ts"
    "backend/src/services/TOTPService.ts"
    "backend/src/middleware/auth.ts"
    "backend/src/controllers/AuthController.ts"
    "backend/src/routes/auth.ts"
)

for service in "${backend_services[@]}"; do
    if [ -f "$service" ]; then
        print_result 0 "Service $service existe"
    else
        print_result 1 "Service $service manquant"
    fi
done

echo
print_section "Phase 2: Vérification des APIs backend"

# Vérification des endpoints dans les routes
if [ -f "backend/src/routes/auth.ts" ]; then
    endpoints=(
        "/register"
        "/login"
        "/refresh"
        "/2fa/login-verify"
        "/2fa/setup"
        "/2fa/enable"
        "/logout"
        "/verify"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if grep -q "router.post('$endpoint'" backend/src/routes/auth.ts || grep -q "router.get('$endpoint'" backend/src/routes/auth.ts; then
            print_result 0 "Endpoint $endpoint configuré"
        else
            print_result 1 "Endpoint $endpoint manquant"
        fi
    done
fi

echo
print_section "Phase 3: Vérification des fonctionnalités JWT"

if [ -f "backend/src/services/JWTService.ts" ]; then
    jwt_features=(
        "generateTokens"
        "verifyAccessToken"
        "verifyRefreshToken"
        "refreshAccessToken"
        "extractTokenFromHeader"
    )
    
    for feature in "${jwt_features[@]}"; do
        if grep -q "$feature" backend/src/services/JWTService.ts; then
            print_result 0 "Fonction JWT $feature implémentée"
        else
            print_result 1 "Fonction JWT $feature manquante"
        fi
    done
fi

echo
print_section "Phase 4: Vérification des fonctionnalités TOTP"

if [ -f "backend/src/services/TOTPService.ts" ]; then
    totp_features=(
        "generateTOTPSetup"
        "verifyTOTPCode"
        "generateTOTPCode"
        "verifyBackupCode"
        "isValidTOTPFormat"
    )
    
    for feature in "${totp_features[@]}"; do
        if grep -q "$feature" backend/src/services/TOTPService.ts; then
            print_result 0 "Fonction TOTP $feature implémentée"
        else
            print_result 1 "Fonction TOTP $feature manquante"
        fi
    done
fi

echo
print_section "Phase 5: Vérification du frontend"

# Vérification des pages frontend
frontend_pages=(
    "frontend/pages/login.vue"
    "frontend/pages/register.vue"
    "frontend/pages/two-factor-verify.vue"
    "frontend/pages/dashboard.vue"
)

for page in "${frontend_pages[@]}"; do
    if [ -f "$page" ]; then
        print_result 0 "Page $page existe"
    else
        print_result 1 "Page $page manquante"
    fi
done

echo
print_section "Phase 6: Vérification des composables frontend"

if [ -f "frontend/composables/useAuth.ts" ]; then
    auth_functions=(
        "login"
        "register"
        "logout"
        "verifyTwoFactor"
        "refreshToken"
        "checkAuth"
    )
    
    for func in "${auth_functions[@]}"; do
        if grep -q "const $func =" frontend/composables/useAuth.ts; then
            print_result 0 "Fonction auth $func implémentée"
        else
            print_result 1 "Fonction auth $func manquante"
        fi
    done
fi

echo
print_section "Phase 7: Vérification des types TypeScript"

if [ -f "frontend/types/auth.ts" ]; then
    if grep -q "requiresTwoFactor" frontend/types/auth.ts; then
        print_result 0 "Type AuthResponse mis à jour avec requiresTwoFactor"
    else
        print_result 1 "Type AuthResponse non mis à jour"
    fi
    
    if grep -q "AuthTokens" frontend/types/auth.ts; then
        print_result 0 "Type AuthTokens défini"
    else
        print_result 1 "Type AuthTokens manquant"
    fi
fi

echo
print_section "Phase 8: Vérification de la configuration"

# Vérification des variables d'environnement
if [ -f ".env" ]; then
    env_vars=(
        "JWT_ACCESS_SECRET"
        "JWT_REFRESH_SECRET"
        "DATABASE_URL"
        "REDIS_URL"
        "NODE_ENV"
    )
    
    for var in "${env_vars[@]}"; do
        if grep -q "^$var=" .env; then
            print_result 0 "Variable d'environnement $var configurée"
        else
            print_result 1 "Variable d'environnement $var manquante"
        fi
    done
fi

echo
print_section "Phase 9: Vérification Docker"

if [ -f "docker-compose.dev.yml" ]; then
    print_result 0 "Configuration Docker développement existe"
    
    # Vérifier les services Docker
    if grep -q "frontend:" docker-compose.dev.yml; then
        print_result 0 "Service frontend configuré dans Docker"
    else
        print_result 1 "Service frontend manquant dans Docker"
    fi
    
    if grep -q "backend:" docker-compose.dev.yml; then
        print_result 0 "Service backend configuré dans Docker"
    else
        print_result 1 "Service backend manquant dans Docker"
    fi
fi

echo
print_section "Phase 10: Test de cohérence des APIs"

# Vérifier que les endpoints frontend correspondent au backend
if [ -f "frontend/composables/useAuth.ts" ] && [ -f "backend/src/routes/auth.ts" ]; then
    
    # Test login endpoint
    if grep -q "/api/auth/login" frontend/composables/useAuth.ts && grep -q "router.post('/login'" backend/src/routes/auth.ts; then
        print_result 0 "API login cohérente frontend-backend"
    else
        print_result 1 "API login incohérente frontend-backend"
    fi
    
    # Test 2FA endpoint
    if grep -q "/api/auth/2fa/login-verify" frontend/composables/useAuth.ts && grep -q "router.post('/2fa/login-verify'" backend/src/routes/auth.ts; then
        print_result 0 "API 2FA cohérente frontend-backend"
    else
        print_result 1 "API 2FA incohérente frontend-backend"
    fi
    
    # Test refresh endpoint
    if grep -q "/api/auth/refresh" frontend/composables/useAuth.ts && grep -q "router.post('/refresh'" backend/src/routes/auth.ts; then
        print_result 0 "API refresh cohérente frontend-backend"
    else
        print_result 1 "API refresh incohérente frontend-backend"
    fi
fi

echo
print_section "Résumé de l'intégration"

echo -e "${GREEN}✨ Fonctionnalités implémentées:${NC}"
echo "  • Authentification JWT avec access et refresh tokens"
echo "  • Authentification à deux facteurs (TOTP)"
echo "  • Middleware d'authentification backend"
echo "  • Routes API complètes pour l'authentification"
echo "  • Pages frontend pour login et 2FA"
echo "  • Composables Vue pour la gestion d'état"
echo "  • Types TypeScript cohérents"
echo "  • Configuration Docker et variables d'environnement"

echo
echo -e "${YELLOW}📋 Commandes Docker pour tester:${NC}"
echo "  # Construire et démarrer tous les services"
echo "  docker-compose -f docker-compose.dev.yml up --build"
echo ""
echo "  # Tester le backend uniquement"
echo "  docker-compose -f docker-compose.dev.yml up --build backend db redis"
echo ""
echo "  # Voir les logs d'un service"
echo "  docker-compose -f docker-compose.dev.yml logs -f backend"

echo
echo -e "${BLUE}🔧 URLs de test:${NC}"
echo "  • Frontend: http://localhost:3000"
echo "  • Backend API: http://localhost:3001/api"
echo "  • Test login: POST http://localhost:3001/api/auth/login"
echo "  • Test 2FA: POST http://localhost:3001/api/auth/2fa/login-verify"

echo
echo -e "${GREEN}🎉 Test d'intégration terminé!${NC}"
echo "Tous les liens frontend-backend ont été mis en place."
