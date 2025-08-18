#!/bin/bash

# Verify SSL Setup for Cloud SQL
# This script checks your Cloud SQL SSL configuration

set -e

PROJECT_ID="oo-insights-468716"
INSTANCE_NAME="oo-insights-db"

echo "🔍 Verifying SSL setup for Cloud SQL..."
echo "Project: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Checking Cloud SQL instance SSL configuration...${NC}"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with Google Cloud${NC}"

# Check SSL configuration
echo -e "${BLUE}🔒 Checking SSL/TLS settings...${NC}"
gcloud sql instances describe $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="table(settings.ipConfiguration.requireSsl,settings.ipConfiguration.sslMode)" \
    2>/dev/null || {
    echo -e "${RED}❌ Failed to get instance information${NC}"
    echo "Please check your project ID and instance name"
    exit 1
}

# Check authorized networks
echo -e "${BLUE}🌐 Checking authorized networks...${NC}"
gcloud sql instances describe $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="table(settings.ipConfiguration.authorizedNetworks[].value)" \
    2>/dev/null

# Check existing SSL certificates
echo -e "${BLUE}📜 Checking existing SSL client certificates...${NC}"
gcloud sql ssl client-certs list \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="table(commonName,expirationTime,sha1Fingerprint)" \
    2>/dev/null || echo -e "${YELLOW}⚠️  No SSL client certificates found${NC}"

# Check server CA certificates
echo -e "${BLUE}🏛️ Checking server CA certificates...${NC}"
gcloud sql ssl server-ca-certs list \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="table(commonName,expirationTime,sha1Fingerprint)" \
    2>/dev/null

echo
echo -e "${BLUE}📁 Checking local certificate files...${NC}"

# Check if certificate files exist locally
if [ -f "client-key.pem" ] && [ -s "client-key.pem" ] && ! grep -q "placeholder" "client-key.pem" 2>/dev/null; then
    echo -e "${GREEN}✅ client-key.pem exists${NC}"
else
    echo -e "${RED}❌ client-key.pem missing or invalid${NC}"
fi

if [ -f "client-cert.pem" ] && [ -s "client-cert.pem" ]; then
    echo -e "${GREEN}✅ client-cert.pem exists${NC}"
else
    echo -e "${RED}❌ client-cert.pem missing${NC}"
fi

if [ -f "server-ca.pem" ] && [ -s "server-ca.pem" ]; then
    echo -e "${GREEN}✅ server-ca.pem exists${NC}"
else
    echo -e "${RED}❌ server-ca.pem missing${NC}"
fi

if [ -f "ssl-env-vars.txt" ] && [ -s "ssl-env-vars.txt" ]; then
    echo -e "${GREEN}✅ ssl-env-vars.txt exists${NC}"
else
    echo -e "${YELLOW}⚠️  ssl-env-vars.txt missing (run ./convert-certs-to-base64.sh)${NC}"
fi

echo
echo -e "${BLUE}🛠️ Checking setup scripts...${NC}"

local_scripts=("setup-ssl-certificates.sh" "convert-certs-to-base64.sh" "add-ssl-env-to-vercel.sh" "test-ssl-connection.js")
for script in "${local_scripts[@]}"; do
    if [ -f "$script" ]; then
        echo -e "${GREEN}✅ $script exists${NC}"
    else
        echo -e "${RED}❌ $script missing${NC}"
    fi
done

if [ -f "src/lib/ssl-db-connection.ts" ]; then
    echo -e "${GREEN}✅ SSL connection helper exists${NC}"
else
    echo -e "${RED}❌ SSL connection helper missing${NC}"
fi

echo
echo -e "${BLUE}📋 Next steps based on current status:${NC}"
echo

# Provide guidance based on current state
if [ ! -f "client-cert.pem" ] || [ ! -f "server-ca.pem" ]; then
    echo -e "${YELLOW}🔧 You need to create SSL certificates:${NC}"
    echo "1. gcloud auth login"
    echo "2. Run: ./setup-ssl-certificates.sh"
    echo "   OR follow manual steps in MANUAL_SSL_SETUP.md"
elif [ ! -f "ssl-env-vars.txt" ]; then
    echo -e "${YELLOW}🔧 You need to convert certificates to base64:${NC}"
    echo "1. Run: ./convert-certs-to-base64.sh"
else
    echo -e "${GREEN}🎉 SSL certificates are ready!${NC}"
    echo "1. Run: ./add-ssl-env-to-vercel.sh (to add to Vercel)"
    echo "2. Test: node test-ssl-connection.js"
    echo "3. Deploy: npx vercel --prod"
fi

echo
echo -e "${BLUE}📚 Documentation:${NC}"
echo "- Complete guide: SSL_SETUP_GUIDE.md"
echo "- Manual steps: MANUAL_SSL_SETUP.md"
echo "- Security info: docs/cloud-sql-security.md"

echo
echo -e "${GREEN}🔍 SSL verification complete!${NC}"