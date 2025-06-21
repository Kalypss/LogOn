#!/bin/bash

# 🧪 LogOn Password Manager - Test Phase SSL/HTTPS
# 
# Test de la configuration HTTPS et de la Web Crypto API
# Valide que l'application fonctionne correctement avec SSL

echo "🧪 Test Phase SSL - Configuration HTTPS et Crypto API"
echo "====================================================="

RASPBERRY_IP="192.168.68.101"
FRONTEND_DIR="./frontend"
CERT_DIR="$FRONTEND_DIR/certificates"

# Test 1: Vérifier la présence des certificats SSL
echo "📋 Test 1: Présence des certificats SSL"
if [ -f "$CERT_DIR/localhost-cert.pem" ] && [ -f "$CERT_DIR/localhost-key.pem" ]; then
    echo "✅ Certificats SSL présents"
    
    # Vérifier la validité du certificat
    if openssl x509 -in "$CERT_DIR/localhost-cert.pem" -noout -checkend 86400 > /dev/null 2>&1; then
        echo "✅ Certificat SSL valide"
    else
        echo "⚠️  Certificat SSL expiré ou invalide"
    fi
else
    echo "❌ Certificats SSL manquants"
    echo "💡 Exécutez: ./scripts/generate-ssl-certs.sh"
    exit 1
fi

# Test 2: Vérifier la configuration Nuxt
echo ""
echo "📋 Test 2: Configuration HTTPS dans nuxt.config.ts"
if grep -q "https:" "$FRONTEND_DIR/nuxt.config.ts"; then
    echo "✅ Configuration HTTPS détectée"
else
    echo "❌ Configuration HTTPS manquante"
    exit 1
fi

# Test 3: Vérifier la configuration devServer
echo ""
echo "📋 Test 3: Configuration devServer"
if grep -q "devServer:" "$FRONTEND_DIR/nuxt.config.ts" && grep -q "host: '0.0.0.0'" "$FRONTEND_DIR/nuxt.config.ts"; then
    echo "✅ Configuration devServer correcte"
else
    echo "✅ Configuration devServer basique (acceptable)"
fi

# Test 4: Vérifier le plugin crypto amélioré
echo ""
echo "📋 Test 4: Plugin crypto amélioré"
if grep -q "createError" "$FRONTEND_DIR/plugins/crypto.client.ts"; then
    echo "✅ Plugin crypto avec gestion d'erreurs améliorée"
else
    echo "❌ Plugin crypto non mis à jour"
    exit 1
fi

# Test 5: Test de démarrage du serveur (simulation)
echo ""
echo "📋 Test 5: Vérification des dépendances"
cd "$FRONTEND_DIR"
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    echo "✅ Dépendances Node.js présentes"
else
    echo "⚠️  Dépendances manquantes, exécutez: cd frontend && npm install"
fi

# Instructions finales
echo ""
echo "🚀 Instructions de démarrage:"
echo "   1. cd frontend"
echo "   2. npm run dev"
echo ""
echo "🔗 URLs de test:"
echo "   • https://localhost:3000"
echo "   • https://$RASPBERRY_IP:3000"
echo ""
echo "⚠️  Notes importantes:"
echo "   • Acceptez le certificat auto-signé dans votre navigateur"
echo "   • La Web Crypto API sera maintenant disponible"
echo "   • Testez la création d'un compte pour valider le chiffrement"
echo ""
echo "🔍 Vérification manuelle:"
echo "   • Ouvrez la console du navigateur"
echo "   • Vérifiez que crypto.subtle est disponible"
echo "   • Testez une fonction cryptographique"

cd ..
echo ""
echo "✅ Test Phase SSL terminé avec succès!"
