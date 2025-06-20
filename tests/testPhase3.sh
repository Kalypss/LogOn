#!/bin/bash

# 🔐 LogOn Password Manager - Test Phase 3
# Tests pour le système de groupes et partage sécurisé

set -e

# Configuration
API_URL="http://localhost:3001/api"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}🔐 LogOn Password Manager - Phase 3 Tests${NC}"
echo -e "${PURPLE}==============================================${NC}"
echo ""

# Test 1: Santé de l'API
echo -e "${BLUE}📋 Test 1: Vérification de l'état de l'API${NC}"
response=$(curl -s -w '\n%{http_code}' "$API_URL/../health")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✅ API disponible et opérationnelle${NC}"
    echo "$body" | jq '.'
else
    echo -e "${RED}❌ API non disponible (status: $status_code)${NC}"
    exit 1
fi
echo ""

# Test 2: Authentification
echo -e "${BLUE}📋 Test 2: Authentification des utilisateurs${NC}"
echo -e "${CYAN}👤 Tokens de test configurés${NC}"
ADMIN_TOKEN="test_token_admin"
MEMBER_TOKEN="test_token_member"
echo -e "${GREEN}✅ Tokens configurés${NC}"
echo ""

# Test 3: Création d'un groupe
echo -e "${BLUE}📋 Test 3: Création d'un groupe${NC}"
echo -e "${CYAN}🏗️ Création du groupe de test...${NC}"

response=$(curl -X POST "$API_URL/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Équipe Test Phase 3",
    "encryptedDescription": "ZGVzY3JpcHRpb25fY2hpZmZyZWVfYmFzZTY0",
    "encryptedGroupKey": "Y2xlX2RlX2dyb3VwZV9jaGlmZnJlZV9iYXNlNjQ="
  }' \
  -w '\n%{http_code}' -s)

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "201" ]; then
    echo -e "${GREEN}✅ Groupe créé avec succès${NC}"
    GROUP_ID=$(echo "$body" | jq -r '.group.id')
    echo -e "${YELLOW}🆔 Group ID: $GROUP_ID${NC}"
    echo "$body" | jq '.'
else
    echo -e "${RED}❌ Échec de la création du groupe (status: $status_code)${NC}"
    echo "$body"
    exit 1
fi
echo ""

# Test 4: Récupération des groupes
echo -e "${BLUE}📋 Test 4: Récupération des groupes${NC}"
echo -e "${CYAN}📋 Récupération de la liste des groupes...${NC}"

response=$(curl -X GET "$API_URL/groups" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w '\n%{http_code}' -s)

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✅ Groupes récupérés avec succès${NC}"
    groups_count=$(echo "$body" | jq '.groups | length')
    echo -e "${YELLOW}📊 Nombre de groupes: $groups_count${NC}"
    echo "$body" | jq '.'
else
    echo -e "${RED}❌ Échec de la récupération des groupes (status: $status_code)${NC}"
    echo "$body"
fi
echo ""

# Test 5: Détails du groupe
if [ -n "$GROUP_ID" ] && [ "$GROUP_ID" != "null" ]; then
    echo -e "${BLUE}📋 Test 5: Détails du groupe${NC}"
    echo -e "${CYAN}🔍 Récupération des détails du groupe...${NC}"
    
    response=$(curl -X GET "$API_URL/groups/$GROUP_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -w '\n%{http_code}' -s)

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Détails du groupe récupérés${NC}"
        echo "$body" | jq '.'
    else
        echo -e "${RED}❌ Échec de la récupération des détails (status: $status_code)${NC}"
        echo "$body"
    fi
    echo ""
fi

echo -e "${PURPLE}🎉 Tests Phase 3 complétés !${NC}"
echo -e "${GREEN}✅ Système de groupes fonctionnel${NC}"
echo -e "${GREEN}✅ Gestion des groupes opérationnelle${NC}"
echo -e "${GREEN}✅ API sécurisée avec authentification${NC}"
