#!/bin/bash

# SSL Certificate Setup for Cloud SQL + Vercel
# This script sets up SSL client certificates for secure database connections

set -e

PROJECT_ID="oo-insights-468716"
INSTANCE_NAME="oo-insights-db"
CLIENT_CERT_NAME="oo-insights-client-cert"

echo "🔐 Setting up SSL certificates for Cloud SQL..."
echo "Project: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gcloud is authenticated
echo "📋 Checking Google Cloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with Google Cloud${NC}"
echo

# Create SSL client certificate
echo "🔑 Creating SSL client certificate..."
if [ -f "client-key.pem" ] && [ -s "client-key.pem" ] && ! grep -q "placeholder" "client-key.pem"; then
    echo -e "${YELLOW}⚠️  Client key already exists and is not a placeholder${NC}"
    read -p "Do you want to create a new certificate? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping certificate creation..."
    else
        rm -f client-key.pem client-cert.pem server-ca.pem
        gcloud sql ssl client-certs create $CLIENT_CERT_NAME client-key.pem \
            --instance=$INSTANCE_NAME \
            --project=$PROJECT_ID
    fi
else
    echo "Creating new SSL client certificate..."
    rm -f client-key.pem client-cert.pem server-ca.pem
    gcloud sql ssl client-certs create $CLIENT_CERT_NAME client-key.pem \
        --instance=$INSTANCE_NAME \
        --project=$PROJECT_ID
fi

# Download client certificate
echo "📥 Downloading client certificate..."
gcloud sql ssl client-certs describe $CLIENT_CERT_NAME \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="value(cert)" > client-cert.pem

# Download server CA certificate
echo "📥 Downloading server CA certificate..."
gcloud sql ssl server-ca-certs list \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="value(cert)" > server-ca.pem

# Verify certificates were created
echo "🔍 Verifying certificates..."
if [ ! -f "client-key.pem" ] || [ ! -s "client-key.pem" ]; then
    echo -e "${RED}❌ Failed to create client-key.pem${NC}"
    exit 1
fi

if [ ! -f "client-cert.pem" ] || [ ! -s "client-cert.pem" ]; then
    echo -e "${RED}❌ Failed to download client-cert.pem${NC}"
    exit 1
fi

if [ ! -f "server-ca.pem" ] || [ ! -s "server-ca.pem" ]; then
    echo -e "${RED}❌ Failed to download server-ca.pem${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All certificates created successfully${NC}"
echo

# Convert certificates to base64 for environment variables
echo "🔄 Converting certificates to base64..."
CLIENT_KEY_B64=$(base64 -i client-key.pem | tr -d '\n')
CLIENT_CERT_B64=$(base64 -i client-cert.pem | tr -d '\n')
SERVER_CA_B64=$(base64 -i server-ca.pem | tr -d '\n')

# Create environment variables file
echo "📝 Creating SSL environment variables..."
cat > ssl-env-vars.txt << EOF
# SSL Certificate Environment Variables for Vercel
# Copy these to your Vercel environment variables

PGSSLKEY_B64=$CLIENT_KEY_B64
PGSSLCERT_B64=$CLIENT_CERT_B64
PGSSLROOTCERT_B64=$SERVER_CA_B64

# Updated DATABASE_URL with SSL certificates
DATABASE_URL=postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require&sslcert=/tmp/client-cert.pem&sslkey=/tmp/client-key.pem&sslrootcert=/tmp/server-ca.pem
EOF

echo -e "${GREEN}✅ SSL environment variables saved to ssl-env-vars.txt${NC}"
echo

# Create Vercel deployment script
echo "📝 Creating Vercel deployment script..."
cat > add-ssl-env-to-vercel.sh << 'EOF'
#!/bin/bash

# Add SSL environment variables to Vercel
echo "🚀 Adding SSL environment variables to Vercel..."

# Source the SSL environment variables
source ssl-env-vars.txt

# Add each environment variable to Vercel
echo "Adding PGSSLKEY_B64..."
echo "$PGSSLKEY_B64" | npx vercel env add PGSSLKEY_B64 production

echo "Adding PGSSLCERT_B64..."
echo "$PGSSLCERT_B64" | npx vercel env add PGSSLCERT_B64 production

echo "Adding PGSSLROOTCERT_B64..."
echo "$PGSSLROOTCERT_B64" | npx vercel env add PGSSLROOTCERT_B64 production

echo "Updating DATABASE_URL..."
echo "$DATABASE_URL" | npx vercel env add DATABASE_URL production

echo "✅ SSL environment variables added to Vercel"
echo "Don't forget to redeploy your application!"
EOF

chmod +x add-ssl-env-to-vercel.sh

echo -e "${GREEN}✅ Vercel deployment script created: add-ssl-env-to-vercel.sh${NC}"
echo

# Create database connection helper
echo "📝 Creating database connection helper..."
cat > src/lib/ssl-db-connection.ts << 'EOF'
import fs from 'fs';
import path from 'path';

export function setupSSLCertificates() {
  // Only run in serverless environments (Vercel)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const tmpDir = '/tmp';
    
    // Write SSL certificates from environment variables
    if (process.env.PGSSLKEY_B64) {
      const clientKey = Buffer.from(process.env.PGSSLKEY_B64, 'base64').toString();
      fs.writeFileSync(path.join(tmpDir, 'client-key.pem'), clientKey);
    }
    
    if (process.env.PGSSLCERT_B64) {
      const clientCert = Buffer.from(process.env.PGSSLCERT_B64, 'base64').toString();
      fs.writeFileSync(path.join(tmpDir, 'client-cert.pem'), clientCert);
    }
    
    if (process.env.PGSSLROOTCERT_B64) {
      const serverCa = Buffer.from(process.env.PGSSLROOTCERT_B64, 'base64').toString();
      fs.writeFileSync(path.join(tmpDir, 'server-ca.pem'), serverCa);
    }
  }
}

export function getSSLDatabaseURL(): string {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Ensure certificates are written
    setupSSLCertificates();
    
    // Return URL with SSL certificate paths
    return process.env.DATABASE_URL || '';
  }
  
  // For local development, use the original URL
  return process.env.DATABASE_URL || '';
}
EOF

echo -e "${GREEN}✅ Database connection helper created: src/lib/ssl-db-connection.ts${NC}"
echo

# Create local testing script
echo "📝 Creating local SSL testing script..."
cat > test-ssl-connection.js << 'EOF'
const { Client } = require('pg');
const fs = require('fs');

async function testSSLConnection() {
  console.log('🔐 Testing SSL connection to Cloud SQL...');
  
  const client = new Client({
    host: '34.38.133.240',
    port: 5432,
    database: 'insights',
    user: 'postgres',
    password: 'k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=',
    ssl: {
      key: fs.readFileSync('./client-key.pem'),
      cert: fs.readFileSync('./client-cert.pem'),
      ca: fs.readFileSync('./server-ca.pem'),
      rejectUnauthorized: true
    }
  });

  try {
    await client.connect();
    console.log('✅ SSL connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
    await client.end();
  } catch (error) {
    console.error('❌ SSL connection failed:', error.message);
  }
}

testSSLConnection();
EOF

echo -e "${GREEN}✅ SSL testing script created: test-ssl-connection.js${NC}"
echo

echo "🎉 SSL certificate setup complete!"
echo
echo "📋 Next steps:"
echo "1. Run: ./add-ssl-env-to-vercel.sh (to add environment variables to Vercel)"
echo "2. Test locally: node test-ssl-connection.js"
echo "3. Update your application to use src/lib/ssl-db-connection.ts"
echo "4. Redeploy your Vercel application"
echo
echo "📁 Files created:"
echo "  - client-key.pem (private key)"
echo "  - client-cert.pem (client certificate)"
echo "  - server-ca.pem (server CA certificate)"
echo "  - ssl-env-vars.txt (environment variables)"
echo "  - add-ssl-env-to-vercel.sh (Vercel deployment script)"
echo "  - src/lib/ssl-db-connection.ts (connection helper)"
echo "  - test-ssl-connection.js (local testing script)"
echo
echo -e "${YELLOW}⚠️  Keep the .pem files secure and do not commit them to git!${NC}"