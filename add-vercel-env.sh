#!/bin/bash

# Script to add all environment variables to Vercel project
# Run this after logging in with: npx vercel login

echo "🚀 Adding environment variables to Vercel project oo-insights1..."
echo ""

# Set project
npx vercel link --project=oo-insights1

# Add DATABASE_URL
echo "Adding DATABASE_URL..."
echo "postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require" | npx vercel env add DATABASE_URL production

# Add NEXTAUTH_URL (using Vercel app URL first)
echo "Adding NEXTAUTH_URL..."
echo "https://oo-insights1.vercel.app" | npx vercel env add NEXTAUTH_URL production

# Add NEXTAUTH_SECRET
echo "Adding NEXTAUTH_SECRET..."
echo "fr+lYLycT9XY+hOkVEpJDYobdfdpzCNhHQVgD1rk+m4=" | npx vercel env add NEXTAUTH_SECRET production

# Add GCP_PROJECT_ID
echo "Adding GCP_PROJECT_ID..."
echo "oo-insights-468716" | npx vercel env add GCP_PROJECT_ID production

# Add VERTEXAI_LOCATION
echo "Adding VERTEXAI_LOCATION..."
echo "europe-west1" | npx vercel env add VERTEXAI_LOCATION production

# Add ALLOWED_EMAIL_DOMAINS
echo "Adding ALLOWED_EMAIL_DOMAINS..."
echo "mindsparkdigitallabs.com" | npx vercel env add ALLOWED_EMAIL_DOMAINS production

# Add DEFAULT_MARKETS
echo "Adding DEFAULT_MARKETS..."
echo "Global,UK,CA,BE-NL,BE-FR,CH-DE,CH-FR,CH-IT" | npx vercel env add DEFAULT_MARKETS production

# For GOOGLE_APPLICATION_CREDENTIALS_JSON, we need to add it manually
echo ""
echo "⚠️  IMPORTANT: Now add GOOGLE_APPLICATION_CREDENTIALS_JSON manually:"
echo ""
echo "Run this command:"
echo "cat service-account-key.json | npx vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON production"
echo ""
echo "Then redeploy with:"
echo "npx vercel --prod"