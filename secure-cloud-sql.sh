#!/bin/bash

# Script to secure Cloud SQL instance by removing broad IP access
# Run this with an account that has Cloud SQL Admin permissions

PROJECT_ID="oo-insights-468716"
INSTANCE_NAME="oo-insights-db"
REGION="europe-west1"

echo "============================================"
echo "Securing Cloud SQL Instance: $INSTANCE_NAME"
echo "============================================"

# Step 1: Get your current public IP for development access
echo ""
echo "Step 1: Getting your current public IP..."
MY_PUBLIC_IP=$(curl -s https://api.ipify.org)
echo "Your current public IP: $MY_PUBLIC_IP"

# Step 2: List current authorized networks
echo ""
echo "Step 2: Current authorized networks:"
gcloud sql instances describe $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --format="table(settings.ipConfiguration.authorizedNetworks[].value.flatten())"

# Step 3: Remove the broad 0.0.0.0/0 access and add specific IPs
echo ""
echo "Step 3: Updating authorized networks..."
echo "This will:"
echo "  - Remove 0.0.0.0/0 (all internet access)"
echo "  - Add your current IP: $MY_PUBLIC_IP/32"
echo "  - Keep Cloud SQL Proxy access (no public IP needed)"

# Update authorized networks with specific IPs only
gcloud sql instances patch $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --authorized-networks=$MY_PUBLIC_IP/32 \
  --no-backup \
  --async

echo ""
echo "Step 4: Recommended additional security measures:"
echo ""
echo "For Production (Vercel/Cloud Run):"
echo "1. Use Cloud SQL Proxy or Unix socket connections"
echo "2. No need for public IP access from Vercel"
echo ""
echo "For Local Development:"
echo "1. Use Cloud SQL Proxy (already configured)"
echo "2. Run: ./cloud-sql-proxy --port 5433 $PROJECT_ID:$REGION:$INSTANCE_NAME"
echo ""
echo "To add additional developer IPs in the future:"
echo "gcloud sql instances patch $INSTANCE_NAME \\"
echo "  --project=$PROJECT_ID \\"
echo "  --authorized-networks=IP1/32,IP2/32"
echo ""
echo "============================================"
echo "Security Update Initiated!"
echo "Check status with:"
echo "gcloud sql operations list --instance=$INSTANCE_NAME --project=$PROJECT_ID"
echo "============================================"

# Optional: Enable Private IP (requires VPC setup)
echo ""
read -p "Do you want to enable Private IP? (requires VPC setup) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Enabling Private IP requires VPC configuration..."
    echo "Please follow: https://cloud.google.com/sql/docs/mysql/configure-private-ip"
    echo ""
    echo "Basic steps:"
    echo "1. Create or select a VPC network"
    echo "2. Allocate an IP address range for Google services"
    echo "3. Create a private connection"
    echo "4. Enable Private IP on the instance"
    
    # Uncomment below after VPC is configured:
    # gcloud sql instances patch $INSTANCE_NAME \
    #   --project=$PROJECT_ID \
    #   --network=projects/$PROJECT_ID/global/networks/default \
    #   --no-assign-ip
fi

echo ""
echo "Script completed!"