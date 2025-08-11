# Google Cloud SQL Setup Guide

This guide will help you set up Google Cloud SQL for PostgreSQL with pgvector extension for the OO Insights app.

## Quick Setup

1. **Run the automated setup script:**
```bash
./setup-cloud-sql.sh
```

This script will:
- Enable required Google Cloud APIs
- Create a Cloud SQL PostgreSQL instance with pgvector
- Create the database
- Set up Cloud SQL Proxy for local development
- Generate connection strings

## Manual Setup Steps

If you prefer to set up manually or need to customize:

### 1. Enable Required APIs

```bash
gcloud services enable sqladmin.googleapis.com
```

### 2. Create Cloud SQL Instance

```bash
# Create instance with pgvector flag enabled
gcloud sql instances create oo-insights-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --database-flags=cloudsql.enable_pgvector=on \
  --root-password=YOUR_SECURE_PASSWORD
```

**Tier Options:**
- `db-f1-micro`: Development (0.6GB RAM, shared CPU) - €8/month
- `db-g1-small`: Small production (1.7GB RAM, shared CPU) - €25/month
- `db-custom-1-3840`: Production (1 CPU, 3.75GB RAM) - €50/month

### 3. Create Database

```bash
gcloud sql databases create insights --instance=oo-insights-db
```

### 4. Enable pgvector Extension

Connect to the database and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Set Up Cloud SQL Proxy

The Cloud SQL Proxy provides secure connectivity without IP allowlisting.

**Download proxy:**
```bash
# macOS
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.darwin.amd64

# Linux
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.linux.amd64

chmod +x cloud-sql-proxy
```

**Get connection name:**
```bash
gcloud sql instances describe oo-insights-db --format="value(connectionName)"
# Output: PROJECT_ID:REGION:INSTANCE_NAME
```

**Start proxy:**
```bash
./cloud-sql-proxy --port 5432 PROJECT_ID:REGION:INSTANCE_NAME
```

## Connection Strings

### Local Development (with Cloud SQL Proxy)
```
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/insights?schema=public"
```

### Cloud Run / App Engine
```
DATABASE_URL="postgresql://postgres:PASSWORD@localhost/insights?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
```

### Direct Connection (requires IP allowlisting)
```
DATABASE_URL="postgresql://postgres:PASSWORD@PUBLIC_IP:5432/insights?schema=public"
```

## Update .env.local

1. Copy the DATABASE_URL from the setup script output
2. Update your `.env.local` file:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/insights?schema=public"
PGVECTOR_ENABLED=true

# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_REGION=europe-west1
```

## Initialize Prisma

After setting up the database:

1. **Start Cloud SQL Proxy** (in a separate terminal):
```bash
./cloud-sql-proxy --port 5432 PROJECT_ID:REGION:INSTANCE_NAME
```

2. **Generate Prisma Client:**
```bash
npx prisma generate
```

3. **Run migrations:**
```bash
npx prisma migrate dev --name init
```

4. **Create pgvector migration:**
Create a new file `prisma/migrations/[timestamp]_add_pgvector/migration.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Vercel Deployment

For Vercel deployment, you'll need to:

1. **Use Unix socket connection** in production:
```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost/insights?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
```

2. **Add Google Cloud Build Pack** to Vercel:
- Go to Vercel project settings
- Add the Google Cloud buildpack
- Configure service account credentials

OR

3. **Use Prisma Data Proxy** (recommended for Vercel):
- Set up Prisma Data Platform
- Use the proxy URL in production

## Security Best Practices

1. **Use Secret Manager** for database password:
```bash
echo -n "YOUR_PASSWORD" | gcloud secrets create db-password --data-file=-
```

2. **Use Service Account** for Cloud SQL access:
```bash
gcloud iam service-accounts create oo-insights-sql
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:oo-insights-sql@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

3. **Enable SSL** for production connections
4. **Use VPC** for internal connectivity
5. **Enable automated backups**:
```bash
gcloud sql instances patch oo-insights-db \
  --backup-start-time=03:00 \
  --backup-location=europe-west1
```

## Monitoring

View database metrics:
```bash
gcloud sql operations list --instance=oo-insights-db
```

## Troubleshooting

### Connection refused
- Ensure Cloud SQL Proxy is running
- Check firewall rules if using direct connection

### Permission denied for extension
- Ensure `cloudsql.enable_pgvector=on` flag is set
- Connect as postgres (superuser) to create extension

### Slow queries
- Check query performance insights in Cloud Console
- Consider upgrading tier for production workloads

## Costs

Estimated monthly costs (Europe):
- **Development** (db-f1-micro): ~€8-10
- **Small Production** (db-g1-small): ~€25-30
- **Standard Production** (1 vCPU, 3.75GB): ~€50-60
- **Storage**: €0.17 per GB
- **Backups**: €0.08 per GB

## Next Steps

1. Run the setup script
2. Update your `.env.local` with the connection string
3. Start Cloud SQL Proxy
4. Run Prisma migrations
5. Start developing!

For production, consider:
- Upgrading to a larger instance
- Setting up read replicas
- Implementing connection pooling
- Configuring automated backups