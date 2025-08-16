# Manual SSL Certificate Setup for Cloud SQL + Vercel

Since we're experiencing authentication issues with gcloud CLI, here's the manual approach to set up SSL certificates for your Cloud SQL connection.

## Step 1: Authenticate and Create Certificates

Run these commands in your terminal:

```bash
# 1. Login to Google Cloud (you'll need to do this in a browser)
gcloud auth login

# 2. Set the default project
gcloud config set project oo-insights-468716

# 3. Create a new SSL client certificate
gcloud sql ssl client-certs create oo-insights-client-cert client-key.pem \
  --instance=oo-insights-db \
  --project=oo-insights-468716

# 4. Download the client certificate
gcloud sql ssl client-certs describe oo-insights-client-cert \
  --instance=oo-insights-db \
  --project=oo-insights-468716 \
  --format="value(cert)" > client-cert.pem

# 5. Download the server CA certificate
gcloud sql ssl server-ca-certs list \
  --instance=oo-insights-db \
  --project=oo-insights-468716 \
  --format="value(cert)" > server-ca.pem
```

## Step 2: Convert Certificates to Base64

After running the above commands, convert the certificates to base64:

```bash
# Convert certificates to base64 (remove line breaks)
CLIENT_KEY_B64=$(base64 -i client-key.pem | tr -d '\n')
CLIENT_CERT_B64=$(base64 -i client-cert.pem | tr -d '\n')
SERVER_CA_B64=$(base64 -i server-ca.pem | tr -d '\n')

# Create environment variables file
cat > ssl-env-vars.txt << EOF
PGSSLKEY_B64=$CLIENT_KEY_B64
PGSSLCERT_B64=$CLIENT_CERT_B64
PGSSLROOTCERT_B64=$SERVER_CA_B64
DATABASE_URL=postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require&sslcert=/tmp/client-cert.pem&sslkey=/tmp/client-key.pem&sslrootcert=/tmp/server-ca.pem
EOF
```

## Step 3: Add Environment Variables to Vercel

```bash
# Add SSL certificates to Vercel environment variables
npx vercel env add PGSSLKEY_B64 production
# Paste the CLIENT_KEY_B64 value when prompted

npx vercel env add PGSSLCERT_B64 production
# Paste the CLIENT_CERT_B64 value when prompted

npx vercel env add PGSSLROOTCERT_B64 production
# Paste the SERVER_CA_B64 value when prompted

# Update DATABASE_URL
npx vercel env add DATABASE_URL production
# Paste the new DATABASE_URL with SSL parameters when prompted
```

## Alternative: Use Google Cloud Console

If CLI commands don't work, you can create certificates via the Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to SQL → oo-insights-db → Connections → Client certificates
3. Click "Create client certificate"
4. Name it "oo-insights-client-cert"
5. Download the generated certificates
6. Follow the base64 conversion steps above

## Files You Should Have After Setup

After successful execution, you should have:
- `client-key.pem` - Private key for SSL authentication
- `client-cert.pem` - Client certificate
- `server-ca.pem` - Server CA certificate
- `ssl-env-vars.txt` - Base64 encoded certificates for Vercel

## Security Notes

⚠️ **Important**: 
- Keep the `.pem` files secure and never commit them to version control
- The certificates are sensitive credentials that provide database access
- Consider adding `*.pem` to your `.gitignore` file

## Testing SSL Connection

Once you have the certificates, test the connection locally:

```bash
node test-ssl-connection.js
```

This script was already created in your directory and will test the SSL connection using the certificates.

## Integration with Your Application

The `src/lib/ssl-db-connection.ts` file has been created to handle SSL certificates in your Vercel deployment. Import and use it in your database connections:

```typescript
import { setupSSLCertificates, getSSLDatabaseURL } from '@/lib/ssl-db-connection';

// In your API routes or database initialization
setupSSLCertificates(); // This writes certificates to /tmp in Vercel
const databaseUrl = getSSLDatabaseURL(); // Gets the correct URL for the environment
```