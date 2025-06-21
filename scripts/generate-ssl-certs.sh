#!/bin/bash

# 🔐 LogOn Password Manager - SSL Certificate Generator
# 
# Script pour générer des certificats SSL auto-signés pour le développement
# Permet l'utilisation de la Web Crypto API via HTTPS

echo "🔐 Génération des certificats SSL pour LogOn"
echo "============================================"

# Création du dossier certificates dans le frontend
CERT_DIR="./frontend/certificates"
mkdir -p "$CERT_DIR"

# Génération du certificat auto-signé avec support multi-domaine
openssl req -x509 -newkey rsa:4096 \
  -keyout "$CERT_DIR/localhost-key.pem" \
  -out "$CERT_DIR/localhost-cert.pem" \
  -days 365 -nodes \
  -subj "/C=FR/ST=France/L=Paris/O=LogOn/OU=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:192.168.68.101,IP:0.0.0.0"

# Vérification de la création des certificats
if [ -f "$CERT_DIR/localhost-cert.pem" ] && [ -f "$CERT_DIR/localhost-key.pem" ]; then
    echo "✅ Certificats SSL générés avec succès dans $CERT_DIR/"
    echo "🔒 Votre application sera maintenant accessible via HTTPS"
    echo ""
    echo "📋 Informations du certificat :"
    openssl x509 -in "$CERT_DIR/localhost-cert.pem" -text -noout | grep -A 1 "Subject:"
    echo ""
    echo "🚀 Redémarrez votre application avec : npm run dev"
    echo "🌐 Accès via : https://192.168.68.101:3000 ou https://localhost:3000"
    echo "⚠️  Vous devrez accepter le certificat auto-signé dans votre navigateur"
else
    echo "❌ Erreur lors de la génération des certificats"
    exit 1
fi
