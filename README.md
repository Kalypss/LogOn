# 🔐 LogOn Password Manager

> Gestionnaire de mots de passe open-source avec architecture zéro-connaissance pour déploiement local sécurisé

[![Security](https://img.shields.io/badge/Security-Zero%20Knowledge-green.svg)](https://en.wikipedia.org/wiki/Zero-knowledge_proof)
[![Encryption](https://img.shields.io/badge/Encryption-AES%20256%20GCM-blue.svg)](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Objectifs du Projet

**LogOn** est conçu pour permettre à chacun de déployer son propre gestionnaire de mots de passe ultra-sécurisé directement depuis son domicile, sans dépendre de services tiers et sans compromettre la sécurité.

### Principes de Sécurité

- **Architecture Zéro-Connaissance** : Le serveur ne peut jamais accéder à vos données déchiffrées
- **Chiffrement de Bout en Bout** : Toutes les opérations cryptographiques se font côté client
- **Dérivation de Clés Sécurisée** : scrypt avec paramètres élevés (N=16384, r=8, p=1)
- **Protection Multi-Couches** : Rate limiting, 2FA, monitoring avancé

## 🏗️ Architecture Technique

### Stack Frontend
- **Nuxt.js 3** avec TypeScript
- **shadcn-vue v1.0.3** pour l'interface utilisateur
- **Web Crypto API** pour les opérations cryptographiques
- **Pinia** pour la gestion d'état

### Stack Backend
- **Node.js + Express** avec TypeScript
- **PostgreSQL** pour les données principales
- **Redis** pour les sessions et la cache
- **Docker + Docker Compose** pour le déploiement

### Sécurité Cryptographique
- **Chiffrement** : AES-256-GCM avec IV unique
- **Dérivation** : scrypt (N=16384, r=8, p=1)
- **Authentification** : HMAC-SHA256 pour la preuve de connaissance
- **2FA** : TOTP compatible avec Google Authenticator

## 🚀 Installation Rapide

```bash
# Cloner le repository
git clone https://github.com/votre-username/logon.git
cd logon

# Lancement de l'installation automatique
chmod +x install.sh
./install.sh

# L'application sera disponible sur https://localhost:3000
```

Le script d'installation détecte et installe automatiquement :
- Docker et Docker Compose si nécessaires
- Génère tous les secrets de sécurité
- Configure les services pour démarrage automatique
- Met en place les certificats SSL

## 📋 Fonctionnalités

### ✅ Gestion des Mots de Passe
- Stockage chiffré de mots de passe, notes et cartes
- Générateur de mots de passe sécurisé avec analyse de force
- Organisation par catégories et tags
- Recherche chiffrée côté client

### 👥 Système de Groupes
- Partage sécurisé entre utilisateurs
- Rôles admin/membre avec permissions granulaires
- Masquage d'entrées pour certains membres
- Audit complet des accès

### 🔐 Sécurité Avancée
- Architecture zéro-connaissance complète
- Authentification à deux facteurs (2FA)
- Code de récupération de 48 caractères
- Monitoring et alertes de sécurité

### 🌐 Intégration OAuth
- Connexion avec compte Google (optionnel)
- Configuration locale sécurisée
- Révocation d'accès simplifiée

## 📊 Monitoring et Audit

Chaque utilisateur dispose d'un tableau de bord de sécurité personnel avec :
- Historique des connexions
- Analyse des mots de passe faibles
- Alertes de sécurité
- Statistiques d'utilisation

Les administrateurs de groupes ont accès aux données de monitoring de leur groupe.

## 🔒 Export Sécurisé

- Export chiffré de toutes vos données
- Formats JSON et CSV chiffrés
- Vérification d'intégrité
- Compatibilité avec d'autres gestionnaires

## 🌍 Déploiement

### Local (Recommandé)
Installation sur votre machine locale avec accès via `https://localhost:3000`

### Réseau Public
Documentation complète pour exposer votre instance sur Internet de manière sécurisée :
- Configuration reverse proxy
- Certificats SSL automatiques
- Sécurisation réseau avancée

## 📚 Documentation

- [🗺️ Roadmap](ROADMAP.md) - Planification détaillée du développement
- [📋 TODO](TODO.md) - Liste des tâches techniques
- [🔒 Sécurité](docs/SECURITY.md) - Guide de sécurité détaillé
- [⚙️ Installation](docs/INSTALLATION.md) - Guide d'installation avancé
- [🔧 Configuration](docs/CONFIGURATION.md) - Options de configuration
- [🚀 Déploiement](docs/DEPLOYMENT.md) - Guide de déploiement

## 🤝 Contribution

LogOn est un projet open-source. Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Distribué sous licence MIT. Voir `LICENSE` pour plus d'informations.

## ⚠️ Avertissement de Sécurité

Bien que LogOn soit conçu avec les meilleures pratiques de sécurité, il est recommandé de :
- Garder le système à jour
- Effectuer des sauvegardes régulières
- Conserver précieusement votre code de récupération
- Utiliser un mot de passe maître fort et unique

## 🙏 Remerciements

- [shadcn-vue](https://www.shadcn-vue.com/) pour les composants UI
- [Nuxt.js](https://nuxt.com/) pour le framework frontend
- [PostgreSQL](https://www.postgresql.org/) pour la base de données
- La communauté cryptographique pour les bonnes pratiques

---

**🔐 Votre sécurité, sous votre contrôle.**
