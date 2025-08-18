#!/bin/bash

# Add SSL environment variables to Vercel
# This script reads from ssl-env-vars.txt and adds them to Vercel

set -e

echo "🚀 Adding SSL environment variables to Vercel..."

# Check if ssl-env-vars.txt exists
if [ ! -f "ssl-env-vars.txt" ]; then
    echo "❌ ssl-env-vars.txt not found. Please run ./convert-certs-to-base64.sh first."
    exit 1
fi

# Read and parse SSL environment variables from the file
echo "📖 Reading SSL environment variables..."

# Parse the file and extract variables
PGSSLKEY_B64=$(grep "^PGSSLKEY_B64=" ssl-env-vars.txt | cut -d'=' -f2-)
PGSSLCERT_B64=$(grep "^PGSSLCERT_B64=" ssl-env-vars.txt | cut -d'=' -f2-)
PGSSLROOTCERT_B64=$(grep "^PGSSLROOTCERT_B64=" ssl-env-vars.txt | cut -d'=' -f2-)
DATABASE_URL=$(grep "^DATABASE_URL=" ssl-env-vars.txt | head -1 | cut -d'=' -f2-)

# Check if required variables are set
if [ -z "$PGSSLKEY_B64" ]; then
    echo "❌ PGSSLKEY_B64 not found in ssl-env-vars.txt"
    exit 1
fi

if [ -z "$PGSSLCERT_B64" ]; then
    echo "❌ PGSSLCERT_B64 not found in ssl-env-vars.txt"
    exit 1
fi

if [ -z "$PGSSLROOTCERT_B64" ]; then
    echo "❌ PGSSLROOTCERT_B64 not found in ssl-env-vars.txt"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in ssl-env-vars.txt"
    exit 1
fi

echo "✅ All required environment variables found"
echo

# Function to add or update environment variable
add_or_update_env() {
    local var_name=$1
    local var_value=$2
    local display_name=$3
    
    echo "$display_name $var_name to Vercel..."
    
    # Try to remove existing variable first (ignore errors)
    npx vercel env rm "$var_name" production 2>/dev/null || true
    
    # Add the variable
    echo "$var_value" | npx vercel env add "$var_name" production
}

# Add each environment variable to Vercel
add_or_update_env "PGSSLKEY_B64" "$PGSSLKEY_B64" "🔑 Adding"
add_or_update_env "PGSSLCERT_B64" "$PGSSLCERT_B64" "📜 Adding"
add_or_update_env "PGSSLROOTCERT_B64" "$PGSSLROOTCERT_B64" "🔒 Adding"
add_or_update_env "DATABASE_URL" "$DATABASE_URL" "🗄️ Updating"

echo "✅ All SSL environment variables added to Vercel successfully!"
echo
echo "📋 Next steps:"
echo "1. Deploy your application: npx vercel --prod"
echo "2. Test the SSL connection in production"
echo "3. Monitor your application logs for any SSL-related issues"
echo
echo "⚠️  Important notes:"
echo "- Your application will now use SSL client certificates for database connections"
echo "- The certificates are automatically written to /tmp in the serverless environment"
echo "- Make sure your application code uses the ssl-db-connection.ts helper"