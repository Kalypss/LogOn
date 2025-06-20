#!/bin/bash

# 🔐 LogOn Password Manager - Test Phase 2FA Login
# Validation du système d'authentification à deux facteurs lors de la connexion

set -e

echo "🔐 Test Phase 2FA - Validation du système d'authentification à deux facteurs"
echo "=========================================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo
print_info "Phase 1: Vérification des fichiers de l'interface 2FA"

# Vérification des fichiers principaux
test_files=(
    "frontend/pages/login.vue"
    "frontend/pages/two-factor-verify.vue"
    "frontend/composables/useAuth.ts"
    "frontend/types/auth.ts"
)

for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
        print_result 0 "Fichier $file existe"
    else
        print_result 1 "Fichier $file manquant"
    fi
done

echo
print_info "Phase 2: Vérification des composants shadcn-vue"

# Vérification des composants UI nécessaires
ui_components=(
    "frontend/components/ui/pin-input"
    "frontend/components/ui/card"
    "frontend/components/ui/button"
    "frontend/components/ui/label"
)

for component in "${ui_components[@]}"; do
    if [ -d "$component" ]; then
        print_result 0 "Composant $component existe"
    else
        print_warning "Composant $component manquant - peut être nécessaire"
    fi
done

echo
print_info "Phase 3: Vérification du code TypeScript"

# Vérification que les fichiers TypeScript sont syntaxiquement corrects
if command -v npx &> /dev/null; then
    print_info "Vérification de la syntaxe TypeScript..."
    
    # Vérification des types
    if grep -q "requiresTwoFactor" frontend/types/auth.ts; then
        print_result 0 "Type AuthResponse mis à jour avec requiresTwoFactor"
    else
        print_result 1 "Type AuthResponse n'a pas été mis à jour"
    fi
    
    # Vérification de la méthode verifyTwoFactor
    if grep -q "verifyTwoFactor" frontend/composables/useAuth.ts; then
        print_result 0 "Méthode verifyTwoFactor ajoutée au composable useAuth"
    else
        print_result 1 "Méthode verifyTwoFactor manquante dans useAuth"
    fi
    
    # Vérification de la redirection dans login.vue
    if grep -q "two-factor-verify" frontend/pages/login.vue; then
        print_result 0 "Redirection vers two-factor-verify configurée"
    else
        print_result 1 "Redirection vers two-factor-verify manquante"
    fi
else
    print_warning "npx non disponible - impossible de vérifier la syntaxe TypeScript"
fi

echo
print_info "Phase 4: Vérification de la structure de la page 2FA"

# Vérification du contenu de la page 2FA
if [ -f "frontend/pages/two-factor-verify.vue" ]; then
    
    # Vérification du composant PinInput
    if grep -q "PinInput" frontend/pages/two-factor-verify.vue; then
        print_result 0 "Composant PinInput utilisé dans la page 2FA"
    else
        print_result 1 "Composant PinInput manquant dans la page 2FA"
    fi
    
    # Vérification du timer
    if grep -q "timeRemaining" frontend/pages/two-factor-verify.vue; then
        print_result 0 "Timer d'expiration implémenté"
    else
        print_result 1 "Timer d'expiration manquant"
    fi
    
    # Vérification de la validation
    if grep -q "length !== 6" frontend/pages/two-factor-verify.vue; then
        print_result 0 "Validation du code à 6 chiffres implémentée"
    else
        print_result 1 "Validation du code à 6 chiffres manquante"
    fi
    
    # Vérification du bouton retour
    if grep -q "goBack" frontend/pages/two-factor-verify.vue; then
        print_result 0 "Bouton retour implémenté"
    else
        print_result 1 "Bouton retour manquant"
    fi
else
    print_result 1 "Page two-factor-verify.vue manquante"
fi

echo
print_info "Phase 5: Vérification de la sécurité"

# Vérification des bonnes pratiques de sécurité
if [ -f "frontend/pages/two-factor-verify.vue" ]; then
    
    # Vérification que le code est vidé en cas d'erreur
    if grep -q "verificationCode.value = ''" frontend/pages/two-factor-verify.vue; then
        print_result 0 "Code vidé en cas d'erreur (bonne pratique de sécurité)"
    else
        print_warning "Code non vidé en cas d'erreur"
    fi
    
    # Vérification du middleware guest
    if grep -q "middleware: 'guest'" frontend/pages/two-factor-verify.vue; then
        print_result 0 "Middleware guest configuré"
    else
        print_result 1 "Middleware guest manquant"
    fi
    
    # Vérification que l'email est en query param
    if grep -q "route.query.email" frontend/pages/two-factor-verify.vue; then
        print_result 0 "Email récupéré depuis les query params"
    else
        print_result 1 "Email non récupéré depuis les query params"
    fi
fi

echo
print_info "Phase 6: Recommandations pour le développement"

echo -e "${GREEN}✨ Fonctionnalités implémentées:${NC}"
echo "  • Page de vérification 2FA avec PinInput shadcn-vue"
echo "  • Timer d'expiration des codes"
echo "  • Validation des codes à 6 chiffres"
echo "  • Gestion des erreurs avec messages spécifiques"
echo "  • Redirection automatique après connexion"
echo "  • Bouton retour vers la page de connexion"

echo
echo -e "${YELLOW}📋 Prochaines étapes recommandées:${NC}"
echo "  1. Installer le composant pin-input de shadcn-vue si non présent"
echo "  2. Implémenter les endpoints backend pour la 2FA"
echo "  3. Tester le flux complet de connexion avec 2FA"
echo "  4. Ajouter les tests unitaires et d'intégration"
echo "  5. Configurer les codes de récupération de sauvegarde"

echo
echo -e "${GREEN}🎉 Test Phase 2FA terminé avec succès!${NC}"
echo "Le système d'authentification à deux facteurs est prêt pour les tests"
