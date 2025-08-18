#!/bin/bash

# Convert SSL certificates to base64 for Vercel environment variables

echo "🔄 Converting SSL certificates to base64..."

# Check if certificate files exist
if [ ! -f "client-key.pem" ]; then
    echo "❌ client-key.pem not found. Please run the SSL certificate creation commands first."
    exit 1
fi

if [ ! -f "client-cert.pem" ]; then
    echo "❌ client-cert.pem not found. Please run the SSL certificate creation commands first."
    exit 1
fi

if [ ! -f "server-ca.pem" ]; then
    echo "❌ server-ca.pem not found. Please run the SSL certificate creation commands first."
    exit 1
fi

# Convert certificates to base64 (remove line breaks)
echo "Converting client key..."
CLIENT_KEY_B64=$(base64 -i client-key.pem | tr -d '\n')

echo "Converting client certificate..."
CLIENT_CERT_B64=$(base64 -i client-cert.pem | tr -d '\n')

echo "Converting server CA certificate..."
SERVER_CA_B64=$(base64 -i server-ca.pem | tr -d '\n')

# Create environment variables file
echo "📝 Creating ssl-env-vars.txt..."
cat > ssl-env-vars.txt << EOF
# SSL Certificate Environment Variables for Vercel
# Copy these values to your Vercel environment variables

PGSSLKEY_B64=$CLIENT_KEY_B64
PGSSLCERT_B64=$CLIENT_CERT_B64
PGSSLROOTCERT_B64=$SERVER_CA_B64

# Updated DATABASE_URL with SSL certificates
DATABASE_URL=postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require&sslcert=/tmp/client-cert.pem&sslkey=/tmp/client-key.pem&sslrootcert=/tmp/server-ca.pem
EOF

echo "✅ Base64 conversion complete!"
echo "📁 Environment variables saved to: ssl-env-vars.txt"
echo
echo "📋 Next steps:"
echo "1. Review ssl-env-vars.txt"
echo "2. Run: ./add-ssl-env-to-vercel.sh"
echo "3. Test the connection locally: node test-ssl-connection.js"