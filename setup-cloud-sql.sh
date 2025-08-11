#!/bin/bash

# Google Cloud SQL Setup Script for OO Insights
# This script will help you set up Cloud SQL for PostgreSQL with pgvector

echo "🚀 Setting up Google Cloud SQL for PostgreSQL with pgvector..."
echo ""

# Variables - Update these with your preferences
PROJECT_ID="oo-insights-468716"
REGION="europe-west1"
INSTANCE_NAME="oo-insights-db"
DATABASE_NAME="insights"
DB_VERSION="POSTGRES_15"
TIER="db-f1-micro"  # Start small, can resize later
ROOT_PASSWORD=$(openssl rand -base64 32)

echo "📋 Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Instance: $INSTANCE_NAME"
echo "  Database: $DATABASE_NAME"
echo ""

# Enable required APIs
echo "1️⃣ Enabling required Google Cloud APIs..."
gcloud services enable sqladmin.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com

# Create Cloud SQL instance
echo ""
echo "2️⃣ Creating Cloud SQL PostgreSQL instance..."
echo "   This will take 5-10 minutes..."
gcloud sql instances create $INSTANCE_NAME \
  --database-version=$DB_VERSION \
  --tier=$TIER \
  --region=$REGION \
  --network=default \
  --database-flags=cloudsql.enable_pgvector=on \
  --root-password=$ROOT_PASSWORD

# Create database
echo ""
echo "3️⃣ Creating database..."
gcloud sql databases create $DATABASE_NAME \
  --instance=$INSTANCE_NAME

# Enable pgvector extension
echo ""
echo "4️⃣ Enabling pgvector extension..."
PGPASSWORD=$ROOT_PASSWORD gcloud sql connect $INSTANCE_NAME \
  --user=postgres \
  --database=$DATABASE_NAME \
  <<EOF
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF

# Get connection details
echo ""
echo "5️⃣ Getting connection details..."
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --format="value(connectionName)")
PUBLIC_IP=$(gcloud sql instances describe $INSTANCE_NAME --format="value(ipAddresses[0].ipAddress)")

# Download Cloud SQL Proxy
echo ""
echo "6️⃣ Setting up Cloud SQL Proxy for local development..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.darwin.amd64
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.linux.amd64
fi

chmod +x cloud-sql-proxy

# Generate connection strings
echo ""
echo "✅ Setup complete! Here are your connection details:"
echo ""
echo "==================================="
echo "🔐 Root Password: $ROOT_PASSWORD"
echo ""
echo "📝 For local development (using Cloud SQL Proxy):"
echo "DATABASE_URL=\"postgresql://postgres:$ROOT_PASSWORD@localhost:5432/$DATABASE_NAME?schema=public\""
echo ""
echo "📝 For production (App Engine/Cloud Run):"
echo "DATABASE_URL=\"postgresql://postgres:$ROOT_PASSWORD@localhost/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME\""
echo ""
echo "📝 Direct connection (requires IP allowlisting):"
echo "DATABASE_URL=\"postgresql://postgres:$ROOT_PASSWORD@$PUBLIC_IP:5432/$DATABASE_NAME?schema=public\""
echo "==================================="
echo ""
echo "🚀 To start Cloud SQL Proxy for local development:"
echo "./cloud-sql-proxy --port 5432 $CONNECTION_NAME"
echo ""
echo "💡 Save these details to your .env.local file!"
echo ""
echo "⚠️  IMPORTANT: Store the root password securely!"