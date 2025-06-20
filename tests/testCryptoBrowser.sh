#!/bin/bash

# 🔐 LogOn - Test des fonctions cryptographiques
# Ce script teste la compatibilité des fonctions crypto avec différents navigateurs

echo "🔐 LogOn - Test des fonctions cryptographiques"
echo "=================================================="

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer pour continuer."
    exit 1
fi

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "frontend/lib/crypto.ts" ]; then
    echo "❌ Veuillez exécuter ce script depuis la racine du projet LogOn"
    exit 1
fi

echo "📁 Répertoire de travail: $(pwd)"
echo "🌐 Démarrage du serveur de test..."

# Créer un serveur HTTP simple pour servir le fichier de test
cat > /tmp/test-server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Servir le fichier de test crypto
    if (pathname === '/' || pathname === '/test') {
        pathname = '/tests/testCrypto.html';
    }
    
    const filePath = path.join(process.cwd(), pathname);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
            return;
        }
        
        // Déterminer le Content-Type
        let contentType = 'text/html';
        const ext = path.extname(filePath);
        if (ext === '.js') contentType = 'text/javascript';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.json') contentType = 'application/json';
        
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(data);
    });
});

const port = 8080;
server.listen(port, () => {
    console.log(`🌐 Serveur de test démarré sur http://localhost:${port}`);
    console.log(`📋 Ouvrez http://localhost:${port}/test dans votre navigateur`);
});

// Arrêter le serveur après 5 minutes
setTimeout(() => {
    console.log('⏰ Arrêt automatique du serveur après 5 minutes');
    server.close();
}, 5 * 60 * 1000);
EOF

# Démarrer le serveur en arrière-plan
node /tmp/test-server.js &
SERVER_PID=$!

echo "🚀 Serveur démarré (PID: $SERVER_PID)"
echo ""
echo "📋 Instructions de test:"
echo "1. Ouvrez votre navigateur"
echo "2. Naviguez vers: http://localhost:8080/test"
echo "3. Cliquez sur 'Lancer tous les tests'"
echo "4. Vérifiez que tous les tests passent"
echo ""
echo "🌐 Testez avec différents navigateurs:"
echo "   - Chrome/Chromium"
echo "   - Firefox"
echo "   - Safari (si disponible)"
echo "   - Edge (si disponible)"
echo ""
echo "📱 Testez aussi sur mobile:"
echo "   - Remplacez 'localhost' par votre IP locale"
echo "   - Ex: http://192.168.1.100:8080/test"
echo ""
echo "⏹️  Pour arrêter le serveur, appuyez sur Ctrl+C"

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🧹 Nettoyage..."
    kill $SERVER_PID 2>/dev/null
    rm -f /tmp/test-server.js
    echo "✅ Serveur arrêté"
    exit 0
}

# Intercepter Ctrl+C
trap cleanup INT

# Attendre que l'utilisateur arrête le serveur
wait $SERVER_PID

cleanup
