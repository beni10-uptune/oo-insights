# Quick Start Guide - OO Insights with Google Cloud SQL

## Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Node.js 18+ and npm

## 1. Set Up Google Cloud SQL (5 minutes)

### Option A: Automated Setup (Recommended)
```bash
# Edit the script to add your project ID
nano setup-cloud-sql.sh
# Change PROJECT_ID="YOUR_PROJECT_ID" to your actual project

# Run the setup
./setup-cloud-sql.sh
```

### Option B: Quick Manual Setup
```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Create Cloud SQL instance (takes 5-10 min)
gcloud sql instances create oo-insights-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --database-flags=cloudsql.enable_pgvector=on \
  --root-password=CHOOSE_A_SECURE_PASSWORD

# Create database
gcloud sql databases create insights --instance=oo-insights-db
```

## 2. Set Up Local Development

### Download Cloud SQL Proxy
```bash
# macOS
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Get your connection name
gcloud sql instances describe oo-insights-db --format="value(connectionName)"
# Save this output (format: PROJECT:REGION:INSTANCE)
```

### Start Cloud SQL Proxy (keep this running)
```bash
# In a separate terminal
./cloud-sql-proxy --port 5432 YOUR_PROJECT:europe-west1:oo-insights-db
```

## 3. Configure the App

### Update .env.local
```bash
# Edit .env.local
nano .env.local
```

Update these values:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/insights?schema=public
GCP_PROJECT_ID=your-project-id
NEXTAUTH_SECRET=GENERATE_WITH_OPENSSL_RAND_BASE64_32
```

## 4. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (Cloud SQL Proxy must be running)
npx prisma migrate dev --name init
```

## 5. Enable pgvector

Connect to database and enable pgvector:
```bash
# Connect using gcloud
gcloud sql connect oo-insights-db --user=postgres --database=insights

# In the PostgreSQL prompt:
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

## 6. Start the App

```bash
# Install dependencies if not done
npm install

# Start development server
npm run dev
```

Visit http://localhost:3000

## Common Issues & Solutions

### "Connection refused" error
✅ Make sure Cloud SQL Proxy is running in a separate terminal

### "Extension vector does not exist"
✅ Connect as postgres user and run: `CREATE EXTENSION vector;`

### "Invalid DATABASE_URL"
✅ Ensure format is: `postgresql://postgres:PASSWORD@localhost:5432/insights?schema=public`

### Cloud SQL Proxy fails to start
✅ Check your connection name format: PROJECT_ID:REGION:INSTANCE_NAME
✅ Ensure you're authenticated: `gcloud auth login`

## Next Steps

1. **Set up Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth 2.0 Client ID
   - Add to .env.local: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

2. **Configure Vertex AI:**
   - Enable Vertex AI API
   - Your existing project credentials will work automatically

3. **Add API Keys:**
   - Get Firecrawl API key
   - Get DataForSEO credentials
   - Add to .env.local

## Costs
- **Cloud SQL db-f1-micro**: ~€8-10/month
- **Cloud SQL Proxy**: Free
- **Vertex AI**: Pay per use (~€0.00025 per 1K characters)

## Support
For issues, check:
- Cloud SQL logs: `gcloud sql operations list --instance=oo-insights-db`
- Proxy logs: Check terminal where proxy is running
- App logs: Check terminal where `npm run dev` is running