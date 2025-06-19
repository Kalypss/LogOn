#!/bin/bash

# ==============================================
# Script d'installation automatique de LogOn Password Manager
# Détecte et installe automatiquement les prérequis
# ==============================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction d'affichage avec émojis
print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Banner d'accueil
echo -e "${PURPLE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🔐 LogOn Password Manager - Installation Automatique     ║
║                                                              ║
║    Gestionnaire de mots de passe zéro-connaissance          ║
║    Architecture ultra-sécurisée pour déploiement local      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Vérification des permissions root
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Ce script ne doit pas être exécuté en tant que root"
        print_info "Exécutez-le avec votre utilisateur normal (sudo sera demandé si nécessaire)"
        exit 1
    fi
}

# Détection du système d'exploitation
detect_os() {
    print_step "Détection du système d'exploitation..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            OS="debian"
            print_success "Système détecté: Debian/Ubuntu"
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
            print_success "Système détecté: RedHat/CentOS/Fedora"
        elif [ -f /etc/arch-release ]; then
            OS="arch"
            print_success "Système détecté: Arch Linux"
        else
            OS="linux"
            print_success "Système détecté: Linux générique"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_success "Système détecté: macOS"
    else
        print_error "Système d'exploitation non supporté: $OSTYPE"
        exit 1
    fi
}

# Vérification des prérequis
check_requirements() {
    print_step "Vérification des prérequis..."
    
    MISSING_DEPS=()
    
    # Vérification de Docker
    if ! command -v docker &> /dev/null; then
        MISSING_DEPS+=("docker")
        print_warning "Docker n'est pas installé"
    else
        print_success "Docker détecté: $(docker --version)"
    fi
    
    # Vérification de Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        MISSING_DEPS+=("docker-compose")
        print_warning "Docker Compose n'est pas installé"
    else
        if command -v docker-compose &> /dev/null; then
            print_success "Docker Compose détecté: $(docker-compose --version)"
        else
            print_success "Docker Compose détecté: $(docker compose version)"
        fi
    fi
    
    # Vérification d'OpenSSL pour la génération de secrets
    if ! command -v openssl &> /dev/null; then
        MISSING_DEPS+=("openssl")
        print_warning "OpenSSL n'est pas installé"
    else
        print_success "OpenSSL détecté: $(openssl version)"
    fi
}

# Installation automatique des dépendances
install_dependencies() {
    if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
        print_success "Tous les prérequis sont installés"
        return
    fi
    
    print_step "Installation des dépendances manquantes..."
    
    for dep in "${MISSING_DEPS[@]}"; do
        case $dep in
            "docker")
                install_docker
                ;;
            "docker-compose")
                install_docker_compose
                ;;
            "openssl")
                install_openssl
                ;;
        esac
    done
}

# Installation de Docker
install_docker() {
    print_step "Installation de Docker..."
    
    case $OS in
        "debian")
            # Installation Docker sur Debian/Ubuntu
            sudo apt-get update
            sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
            
            # Ajout de la clé GPG officielle de Docker
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            
            # Ajout du repository Docker
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Installation Docker
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io
            ;;
        "redhat")
            # Installation Docker sur RedHat/CentOS/Fedora
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io
            ;;
        "arch")
            # Installation Docker sur Arch Linux
            sudo pacman -S docker docker-compose
            ;;
        "macos")
            print_error "Sur macOS, veuillez installer Docker Desktop manuellement"
            print_info "Téléchargez Docker Desktop sur: https://www.docker.com/products/docker-desktop"
            exit 1
            ;;
    esac
    
    # Ajout de l'utilisateur au groupe docker
    sudo usermod -aG docker $USER
    
    # Démarrage et activation de Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_success "Docker installé avec succès"
    print_warning "Vous devez vous reconnecter pour que les permissions de groupe prennent effet"
}

# Installation de Docker Compose
install_docker_compose() {
    print_step "Installation de Docker Compose..."
    
    # Téléchargement de la dernière version
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d '"' -f 4)
    sudo curl -L "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Attribution des permissions
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installé: $COMPOSE_VERSION"
}

# Installation d'OpenSSL
install_openssl() {
    print_step "Installation d'OpenSSL..."
    
    case $OS in
        "debian")
            sudo apt-get update
            sudo apt-get install -y openssl
            ;;
        "redhat")
            sudo yum install -y openssl
            ;;
        "arch")
            sudo pacman -S openssl
            ;;
        "macos")
            # OpenSSL est généralement déjà installé sur macOS
            if command -v brew &> /dev/null; then
                brew install openssl
            else
                print_error "Homebrew n'est pas installé. Installez-le ou OpenSSL manuellement"
                exit 1
            fi
            ;;
    esac
    
    print_success "OpenSSL installé avec succès"
}

# Génération des secrets de sécurité
generate_secrets() {
    print_step "Génération des secrets de sécurité..."
    
    if [ -f .env ]; then
        print_warning "Le fichier .env existe déjà"
        read -p "Voulez-vous le remplacer ? (o/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Oo]$ ]]; then
            print_info "Conservation du fichier .env existant"
            return
        fi
    fi
    
    # Copie du fichier d'exemple
    cp .env.example .env
    
    # Génération des secrets
    POSTGRES_PASSWORD=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 64)
    SESSION_SECRET=$(openssl rand -hex 64)
    
    # Remplacement des valeurs dans le fichier .env
    sed -i "s/POSTGRES_PASSWORD=/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    sed -i "s/JWT_SECRET=/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/SESSION_SECRET=/SESSION_SECRET=$SESSION_SECRET/" .env
    
    print_success "Secrets générés et sauvegardés dans .env"
    print_warning "Conservez précieusement ces secrets - ils sont nécessaires pour déchiffrer vos données"
}

# Configuration du service systemd
setup_systemd_service() {
    print_step "Configuration du service systemd pour démarrage automatique..."
    
    read -p "Voulez-vous configurer LogOn pour démarrer automatiquement au boot ? (o/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        print_info "Service systemd non configuré"
        return
    fi
    
    # Création du service systemd
    sudo tee /etc/systemd/system/logon.service > /dev/null <<EOF
[Unit]
Description=LogOn Password Manager
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    # Activation du service
    sudo systemctl daemon-reload
    sudo systemctl enable logon.service
    
    print_success "Service systemd configuré - LogOn démarrera automatiquement au boot"
}

# Vérification des ports
check_ports() {
    print_step "Vérification de la disponibilité des ports..."
    
    PORTS=(3000 3001 5432 6379)
    BUSY_PORTS=()
    
    for port in "${PORTS[@]}"; do
        if netstat -ln 2>/dev/null | grep -q ":$port "; then
            BUSY_PORTS+=($port)
        fi
    done
    
    if [ ${#BUSY_PORTS[@]} -ne 0 ]; then
        print_warning "Ports occupés: ${BUSY_PORTS[*]}"
        print_info "Arrêtez les services utilisant ces ports ou modifiez la configuration Docker"
        read -p "Continuer malgré tout ? (o/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Oo]$ ]]; then
            exit 1
        fi
    else
        print_success "Tous les ports requis sont disponibles"
    fi
}

# Construction et lancement des services
build_and_start() {
    print_step "Construction et lancement des services Docker..."
    
    # Utilisation de docker-compose ou docker compose selon la disponibilité
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    # Construction des images
    print_info "Construction des images Docker (cela peut prendre quelques minutes)..."
    $COMPOSE_CMD -f docker-compose.dev.yml build
    
    # Lancement des services
    print_info "Lancement des services..."
    $COMPOSE_CMD -f docker-compose.dev.yml up -d
    
    print_success "Services lancés avec succès"
}

# Vérification de l'état des services
check_services() {
    print_step "Vérification de l'état des services..."
    
    sleep 5  # Attendre que les services se lancent
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.dev.yml ps
    else
        docker compose -f docker-compose.dev.yml ps
    fi
}

# Affichage des informations finales
display_final_info() {
    echo -e "${GREEN}"
    cat << "EOF"

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║               🎉 Installation Terminée ! 🎉                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    print_success "LogOn Password Manager est maintenant installé et opérationnel"
    echo
    echo -e "${BLUE}📋 Informations d'accès:${NC}"
    echo -e "   🌐 Frontend:     ${CYAN}http://localhost:3000${NC}"
    echo -e "   🔌 API Backend:  ${CYAN}http://localhost:3001${NC}"
    echo -e "   🗄️  PostgreSQL:  ${CYAN}localhost:5432${NC}"
    echo -e "   📦 Redis:        ${CYAN}localhost:6379${NC}"
    echo
    echo -e "${BLUE}🔧 Commandes utiles:${NC}"
    echo -e "   Arrêter:         ${YELLOW}docker-compose -f docker-compose.dev.yml down${NC}"
    echo -e "   Redémarrer:      ${YELLOW}docker-compose -f docker-compose.dev.yml restart${NC}"
    echo -e "   Logs:            ${YELLOW}docker-compose -f docker-compose.dev.yml logs -f${NC}"
    echo
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo -e "   README:          ${CYAN}$(pwd)/README.md${NC}"
    echo -e "   Roadmap:         ${CYAN}$(pwd)/ROADMAP.md${NC}"
    echo -e "   TODO:            ${CYAN}$(pwd)/TODO.md${NC}"
    echo
    print_warning "Conservez précieusement votre fichier .env - il contient les clés de chiffrement"
    print_info "Consultez la documentation pour configurer OAuth Google et l'exposition publique"
}

# Fonction principale
main() {
    print_step "Démarrage de l'installation de LogOn Password Manager"
    
    check_permissions
    detect_os
    check_requirements
    
    if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
        echo -e "${YELLOW}Les dépendances suivantes vont être installées: ${MISSING_DEPS[*]}${NC}"
        read -p "Continuer l'installation ? (o/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Oo]$ ]]; then
            print_info "Installation annulée"
            exit 0
        fi
        
        install_dependencies
        
        print_warning "Certaines dépendances ont été installées"
        print_info "Veuillez vous reconnecter et relancer ce script pour continuer"
        exit 0
    fi
    
    check_ports
    generate_secrets
    build_and_start
    check_services
    setup_systemd_service
    display_final_info
}

# Gestion des erreurs
trap 'print_error "Une erreur est survenue durant l'\''installation"' ERR

# Exécution du script principal
main "$@"
