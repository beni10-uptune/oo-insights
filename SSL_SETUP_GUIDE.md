# SSL Certificate Setup for Cloud SQL + Vercel

This guide walks you through setting up SSL client certificates for secure database connections between your Vercel application and Google Cloud SQL.

## Overview

SSL client certificates provide the highest level of security for database connections by requiring both the server and client to present valid certificates. This prevents unauthorized access even if database credentials are compromised.

## Quick Start

### 1. Prerequisites

- Google Cloud CLI installed and authenticated
- Vercel CLI installed
- Node.js and npm/yarn
- Access to your Google Cloud project: `oo-insights-468716`

### 2. Generate SSL Certificates

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set default project
gcloud config set project oo-insights-468716

# Create SSL client certificate
gcloud sql ssl client-certs create oo-insights-client-cert client-key.pem \
  --instance=oo-insights-db \
  --project=oo-insights-468716

# Download client certificate
gcloud sql ssl client-certs describe oo-insights-client-cert \
  --instance=oo-insights-db \
  --project=oo-insights-468716 \
  --format="value(cert)" > client-cert.pem

# Download server CA certificate
gcloud sql ssl server-ca-certs list \
  --instance=oo-insights-db \
  --project=oo-insights-468716 \
  --format="value(cert)" > server-ca.pem
```

### 3. Convert Certificates to Base64

```bash
./convert-certs-to-base64.sh
```

This creates `ssl-env-vars.txt` with base64-encoded certificates.

### 4. Add to Vercel

```bash
./add-ssl-env-to-vercel.sh
```

This adds the SSL certificates as environment variables to Vercel.

### 5. Test Connection

```bash
# Test SSL connection locally
node test-ssl-connection.js

# Deploy to Vercel
npx vercel --prod
```

## File Overview

| File | Purpose |
|------|---------|
| `setup-ssl-certificates.sh` | Complete automated SSL setup |
| `convert-certs-to-base64.sh` | Convert PEM certificates to base64 |
| `add-ssl-env-to-vercel.sh` | Add certificates to Vercel environment |
| `test-ssl-connection.js` | Test SSL connections locally |
| `src/lib/ssl-db-connection.ts` | SSL connection helper for your app |
| `MANUAL_SSL_SETUP.md` | Step-by-step manual instructions |

## Certificate Files

After running the setup, you'll have:

- `client-key.pem` - Client private key (secure, never commit!)
- `client-cert.pem` - Client certificate 
- `server-ca.pem` - Server CA certificate
- `ssl-env-vars.txt` - Base64 certificates for Vercel (never commit!)

⚠️ **Security Note**: These files contain sensitive credentials and should never be committed to version control.

## Environment Variables

The following environment variables are added to Vercel:

| Variable | Purpose |
|----------|---------|
| `PGSSLKEY_B64` | Base64-encoded client private key |
| `PGSSLCERT_B64` | Base64-encoded client certificate |
| `PGSSLROOTCERT_B64` | Base64-encoded server CA certificate |
| `DATABASE_URL` | Updated connection string with SSL parameters |

## Application Integration

### Using the SSL Helper

```typescript
import { setupSSLCertificates, getSSLDatabaseURL } from '@/lib/ssl-db-connection';

// In your API routes or database initialization
setupSSLCertificates(); // Writes certificates to /tmp in Vercel
const databaseUrl = getSSLDatabaseURL(); // Gets environment-appropriate URL
```

### Direct PostgreSQL Client

```typescript
import { getSSLConfig } from '@/lib/ssl-db-connection';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: getSSLConfig() // Returns SSL config object or false for local dev
});
```

### Prisma Integration

Update your Prisma connection:

```typescript
import { getSSLDatabaseURL } from '@/lib/ssl-db-connection';

const databaseUrl = getSSLDatabaseURL();

// Use this URL for Prisma Client initialization
```

## Connection URLs

### Local Development (with Cloud SQL Proxy)
```
postgresql://postgres:PASSWORD@localhost:5433/insights?schema=public
```

### Production (Vercel with SSL certificates)
```
postgresql://postgres:PASSWORD@34.38.133.240:5432/insights?schema=public&sslmode=require&sslcert=/tmp/client-cert.pem&sslkey=/tmp/client-key.pem&sslrootcert=/tmp/server-ca.pem
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   gcloud auth login
   gcloud config set project oo-insights-468716
   ```

2. **Certificate Already Exists**
   ```bash
   gcloud sql ssl client-certs delete oo-insights-client-cert --instance=oo-insights-db
   # Then recreate
   ```

3. **Vercel Deployment Issues**
   - Ensure all environment variables are set
   - Check Vercel function logs for SSL errors
   - Verify certificates are valid

### Testing Checklist

- [ ] SSL certificates created successfully
- [ ] Base64 conversion completed
- [ ] Environment variables added to Vercel
- [ ] Local SSL connection test passes
- [ ] Application deploys to Vercel without errors
- [ ] Production database connections work

### Security Best Practices

1. **Never commit certificates**
   - `.pem` files are in `.gitignore`
   - `ssl-env-vars.txt` is in `.gitignore`

2. **Regular rotation**
   - Rotate SSL certificates periodically
   - Update Vercel environment variables after rotation

3. **Monitor access**
   - Check Cloud SQL logs for connection attempts
   - Use Cloud SQL Insights for monitoring

4. **Principle of least privilege**
   - Only grant necessary database permissions
   - Use dedicated database users for applications

## Cloud SQL Security Settings

Your instance is configured with:

```json
{
  "authorizedNetworks": [
    { "value": "77.166.139.71/32" }  // Your specific IP only
  ],
  "ipv4Enabled": true,
  "requireSsl": true,
  "sslMode": "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
}
```

## Alternative Connection Methods

### 1. Cloud SQL Proxy (Local Development)
```bash
./cloud-sql-proxy --port 5433 oo-insights-468716:europe-west1:oo-insights-db
```

### 2. Unix Socket (Cloud Run/App Engine)
```
postgresql://postgres:PASSWORD@/insights?host=/cloudsql/oo-insights-468716:europe-west1:oo-insights-db
```

### 3. Private IP (Future Enhancement)
Consider setting up VPC and private IP for enhanced security.

## Support

If you encounter issues:

1. Check the `test-ssl-connection.js` output for detailed error messages
2. Review Vercel function logs
3. Verify Cloud SQL instance settings
4. Ensure all certificates are properly formatted

## References

- [Google Cloud SQL SSL/TLS documentation](https://cloud.google.com/sql/docs/postgres/configure-ssl-instance)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [PostgreSQL SSL Support](https://www.postgresql.org/docs/current/ssl-tcp.html)