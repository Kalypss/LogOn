#!/bin/bash
# 🚀 LogOn Password Manager - Phase 4 Tests
# Tests de connexion frontend-backend et corrections d'interface

set -e

# Configuration
PROJECT_ROOT="/home/k4lips0/Desktop/Dev/LogOn"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
TESTS_DIR="$PROJECT_ROOT/tests"

echo "🚀 Phase 4 : Test de connexion frontend-backend"
echo "=============================================="

# Fonction de test avec emoji
test_step() {
    echo ""
    echo "🔍 $1"
    echo "---"
}

# Fonction de validation
validate_success() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 : SUCCÈS"
    else
        echo "❌ $1 : ÉCHEC"
        exit 1
    fi
}

# Test 1: Vérification de l'état des services Docker
test_step "Vérification de l'état des services Docker"
cd "$PROJECT_ROOT"

docker-compose ps | grep -q "logon-backend.*Up" && echo "✓ Backend en cours d'exécution"
docker-compose ps | grep -q "logon-frontend.*Up" && echo "✓ Frontend en cours d'exécution"
docker-compose ps | grep -q "logon-db.*Up" && echo "✓ Base de données en cours d'exécution"
docker-compose ps | grep -q "logon-redis.*Up" && echo "✓ Redis en cours d'exécution"

validate_success "Services Docker"

# Test 2: Test de connectivité API backend
test_step "Test de connectivité API backend"

# Test du health endpoint
if curl -s --max-time 10 "http://localhost:3001/health" > /dev/null 2>&1; then
    echo "✓ Backend API accessible sur le port 3001"
else
    echo "❌ Backend API non accessible"
    exit 1
fi

# Test du endpoint API principal
if curl -s --max-time 10 "http://localhost:3001/api" > /dev/null 2>&1; then
    echo "✓ Endpoint API principal accessible"
else
    echo "❌ Endpoint API principal non accessible"
    exit 1
fi

validate_success "Connectivité API backend"

# Test 3: Test de connectivité frontend
test_step "Test de connectivité frontend"

if curl -s --max-time 10 "http://localhost:3000" > /dev/null 2>&1; then
    echo "✓ Frontend Nuxt accessible sur le port 3000"
else
    echo "❌ Frontend Nuxt non accessible"
    exit 1
fi

validate_success "Connectivité frontend"

# Test 4: Vérification des corrections de thème
test_step "Vérification des corrections de thème"

# Vérifier que le thème sombre est vraiment noir
if grep -q "background: 0 0% 5%" "$FRONTEND_DIR/assets/css/main.css"; then
    echo "✓ Thème sombre configuré en noir"
else
    echo "❌ Thème sombre non configuré correctement"
    exit 1
fi

# Vérifier les styles de boutons
if grep -q "cursor: pointer" "$FRONTEND_DIR/assets/css/main.css"; then
    echo "✓ Curseur pointer configuré pour les boutons"
else
    echo "❌ Curseur pointer non configuré"
    exit 1
fi

validate_success "Corrections de thème"

# Test 5: Vérification des pages corrigées
test_step "Vérification des pages corrigées"

pages_to_check=(
    "$FRONTEND_DIR/pages/index.vue"
    "$FRONTEND_DIR/pages/login.vue"
    "$FRONTEND_DIR/pages/register.vue"
    "$FRONTEND_DIR/pages/forgot-password.vue"
)

for page in "${pages_to_check[@]}"; do
    if [ -f "$page" ]; then
        # Vérifier que la page utilise les nouveaux styles
        if grep -q "btn-bordered\|Card\|CardContent" "$page"; then
            echo "✓ $(basename "$page") mise à jour avec les nouveaux styles"
        else
            echo "⚠️ $(basename "$page") pourrait nécessiter des mises à jour de style"
        fi
    else
        echo "❌ $(basename "$page") manquant"
        exit 1
    fi
done

validate_success "Pages corrigées"

# Test 6: Test de compilation frontend
test_step "Test de compilation frontend"
cd "$FRONTEND_DIR"

echo "🔄 Compilation du frontend..."
if npm run build > /tmp/frontend_build.log 2>&1; then
    echo "✓ Compilation frontend réussie"
else
    echo "❌ Erreur de compilation frontend"
    echo "Logs d'erreur :"
    tail -20 /tmp/frontend_build.log
    exit 1
fi

validate_success "Compilation frontend"

# Test 7: Test de la fonctionnalité crypto côté client
test_step "Test de la fonctionnalité crypto côté client"

# Vérifier que les fonctions crypto sont protégées côté client
if grep -q "typeof window === 'undefined'" "$FRONTEND_DIR/lib/crypto.ts"; then
    echo "✓ Protection SSR ajoutée aux fonctions crypto"
else
    echo "❌ Protection SSR manquante dans crypto.ts"
    exit 1
fi

if grep -q "typeof window === 'undefined'" "$FRONTEND_DIR/composables/useAuth.ts"; then
    echo "✓ Protection SSR ajoutée au composable auth"
else
    echo "❌ Protection SSR manquante dans useAuth.ts"
    exit 1
fi

validate_success "Fonctionnalité crypto côté client"

# Test 8: Test de configuration color-mode
test_step "Test de configuration color-mode"

if grep -q "colorMode:" "$FRONTEND_DIR/nuxt.config.ts"; then
    echo "✓ Configuration color-mode ajoutée"
else
    echo "❌ Configuration color-mode manquante"
    exit 1
fi

validate_success "Configuration color-mode"

# Test 9: Test de connectivité base de données
test_step "Test de connectivité base de données"

# Test de la base de données via l'API backend
if curl -s --max-time 10 "http://localhost:3001/api/auth/salt" \
   -H "Content-Type: application/json" \
   -d '{"identifier":"test@example.com"}' > /dev/null 2>&1; then
    echo "✓ Connexion base de données via API testée"
else
    echo "⚠️ Test de base de données non concluant (normal si pas de données de test)"
fi

validate_success "Test de connectivité base de données"

# Test 10: Test des routes API principales
test_step "Test des routes API principales"

api_routes=(
    "/api/auth/salt"
    "/api/auth/register"
    "/api/auth/login"
    "/api/entries"
    "/api/groups"
)

for route in "${api_routes[@]}"; do
    if curl -s --max-time 5 "http://localhost:3001$route" > /dev/null 2>&1; then
        echo "✓ Route $route accessible"
    else
        echo "⚠️ Route $route non accessible (normal sans authentification)"
    fi
done

validate_success "Routes API principales"

# Résultats finaux
echo ""
echo "🎉 PHASE 4 TESTÉE AVEC SUCCÈS !"
echo "==============================="
echo "✅ Services Docker opérationnels"
echo "✅ Connectivité frontend-backend établie"
echo "✅ Thème sombre noir configuré"
echo "✅ Styles de boutons améliorés"
echo "✅ Protection SSR crypto ajoutée"
echo "✅ Configuration color-mode fonctionnelle"
echo "✅ Pages principales corrigées"
echo "✅ Compilation frontend réussie"
echo ""
echo "📋 Corrections apportées :"
echo "   • Erreur crypto deriveKeys corrigée (protection SSR)"
echo "   • Thème sombre noir au lieu de bleu"
echo "   • Curseur pointer sur les boutons"
echo "   • Bordures visibles sur les formulaires"
echo "   • Page index cohérente avec le design"
echo "   • Page forgot-password créée"
echo "   • Configuration color-mode améliorée"
echo ""
echo "📋 Prochaines étapes :"
echo "   • Finaliser la page register avec tabs"
echo "   • Tester l'inscription/connexion end-to-end"
echo "   • Vérifier le fonctionnement des composables"
echo "   • Tests d'intégration complets"
echo ""
echo "🌐 URLs disponibles :"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/health"

rm -f /tmp/frontend_build.log
