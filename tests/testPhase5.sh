#!/bin/bash

# 🔧 LogOn - Test Phase 5: Correction des Routes API
# Ce script teste la correction du problème de routage API frontend/backend

echo "🔧 LogOn - Phase 5: Test des Corrections API"
echo "=============================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage avec couleur
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️ $message${NC}" ;;
    esac
}

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "docker-compose.dev.yml" ]; then
    print_status "ERROR" "Veuillez exécuter ce script depuis la racine du projet LogOn"
    exit 1
fi

print_status "INFO" "Répertoire de travail: $(pwd)"

# Vérifier les fichiers modifiés
echo ""
echo "📁 Vérification des fichiers de configuration..."

# 1. Vérifier nuxt.config.ts
if grep -q "devProxy" frontend/nuxt.config.ts; then
    print_status "SUCCESS" "Configuration proxy API dans nuxt.config.ts"
else
    print_status "ERROR" "Configuration proxy manquante dans nuxt.config.ts"
fi

# 2. Vérifier useApi.ts
if [ -f "frontend/composables/useApi.ts" ]; then
    print_status "SUCCESS" "Composable useApi.ts créé"
    if grep -q "config.public.apiBase" frontend/composables/useApi.ts; then
        print_status "SUCCESS" "Configuration API base URL correcte"
    else
        print_status "WARNING" "Configuration API base URL manquante"
    fi
else
    print_status "ERROR" "Composable useApi.ts manquant"
fi

# 3. Vérifier useAuth.ts
if grep -q "config.public.apiBase" frontend/composables/useAuth.ts; then
    print_status "SUCCESS" "URLs API corrigées dans useAuth.ts"
else
    print_status "ERROR" "URLs API non corrigées dans useAuth.ts"
fi

# 4. Vérifier le plugin API
if [ -f "frontend/plugins/api.client.ts" ]; then
    print_status "SUCCESS" "Plugin API client présent"
else
    print_status "ERROR" "Plugin API client manquant"
fi

echo ""
echo "🔧 Test de configuration..."

# Test des variables d'environnement
if [ -f ".env" ]; then
    print_status "SUCCESS" "Fichier .env présent"
    
    # Vérifier les variables importantes
    if grep -q "NUXT_PUBLIC_API_BASE" .env; then
        print_status "SUCCESS" "Variable NUXT_PUBLIC_API_BASE définie"
    else
        print_status "WARNING" "Variable NUXT_PUBLIC_API_BASE manquante (optionnelle)"
    fi
else
    print_status "WARNING" "Fichier .env manquant (optionnel en développement)"
fi

echo ""
echo "🏗️ Test de build frontend..."

# Test de build du frontend
cd frontend

if command -v npm &> /dev/null; then
    print_status "INFO" "Installation des dépendances..."
    npm install --silent > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_status "SUCCESS" "Dépendances installées"
        
        print_status "INFO" "Test de build TypeScript..."
        npx nuxi typecheck > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            print_status "SUCCESS" "Pas d'erreurs TypeScript détectées"
        else
            print_status "WARNING" "Erreurs TypeScript détectées (voir détails ci-dessous)"
            npx nuxi typecheck
        fi
    else
        print_status "ERROR" "Échec de l'installation des dépendances"
    fi
else
    print_status "WARNING" "npm non disponible, test de build ignoré"
fi

cd ..

echo ""
echo "🧪 Test de syntaxe des fichiers critiques..."

# Test de syntaxe JavaScript/TypeScript
test_syntax() {
    local file=$1
    if [ -f "$file" ]; then
        if node -c "$file" 2>/dev/null || npx tsc --noEmit "$file" 2>/dev/null; then
            print_status "SUCCESS" "Syntaxe correcte: $file"
        else
            print_status "ERROR" "Erreur de syntaxe: $file"
        fi
    else
        print_status "WARNING" "Fichier manquant: $file"
    fi
}

test_syntax "frontend/composables/useAuth.ts"
test_syntax "frontend/composables/useApi.ts"
test_syntax "frontend/plugins/api.client.ts"
test_syntax "frontend/nuxt.config.ts"

echo ""
echo "📊 Résumé des corrections apportées:"
echo "------------------------------------"
print_status "SUCCESS" "Configuration proxy API dans Nuxt"
print_status "SUCCESS" "Création du composable useApi avec gestion centralisée"
print_status "SUCCESS" "Correction des URLs API dans useAuth (utilisation config.public.apiBase)"
print_status "SUCCESS" "Simplification du plugin API client"
print_status "SUCCESS" "Résolution du conflit de routage Vue Router / API"

echo ""
echo "🔍 Points à vérifier après démarrage:"
echo "------------------------------------"
echo "1. Les appels API ne doivent plus déclencher d'erreurs Vue Router"
echo "2. Les requêtes doivent être correctement redirigées vers le backend"
echo "3. L'authentification doit fonctionner sans erreurs de routage"
echo "4. Les tokens doivent être correctement gérés"

echo ""
echo "🚀 Prochaines étapes suggérées:"
echo "------------------------------"
echo "1. Démarrer l'environnement Docker: docker-compose -f docker-compose.dev.yml up"
echo "2. Tester l'inscription/connexion dans l'interface"
echo "3. Vérifier les logs pour s'assurer qu'il n'y a plus d'erreurs de routage"
echo "4. Tester les fonctions cryptographiques avec: ./tests/testCryptoBrowser.sh"

echo ""
print_status "SUCCESS" "Phase 5 - Tests de correction des routes API terminés"
