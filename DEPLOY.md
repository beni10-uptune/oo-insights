# Vercel Deployment Guide

## Domain: oo.mindsparkdigitallabs.com

## Prerequisites Completed ✅
- Cloud SQL instance configured with public IP access
- Database migrations already run
- pgvector extension enabled

## Step 1: Initialize Git Repository

```bash
cd /Users/bensmith/Desktop/OO-insights-v2/oo-insights
git init
git add .
git commit -m "Initial commit - OO Insights marketing platform"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `oo-insights`
3. Keep it private if desired
4. Don't initialize with README (we already have one)

## Step 3: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/oo-insights.git
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Vercel

### Option A: Using Vercel CLI
```bash
npm i -g vercel
vercel

# Answer the prompts:
# - Link to existing project? No
# - What's your project name? oo-insights
# - In which directory is your code? ./
# - Want to override settings? No
```

### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project settings

## Step 5: Set Environment Variables in Vercel

Go to your project in Vercel Dashboard > Settings > Environment Variables

Add these variables for Production environment:

```env
# Database (use public IP for Vercel)
DATABASE_URL=postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require

# NextAuth
NEXTAUTH_URL=https://oo.mindsparkdigitallabs.com
NEXTAUTH_SECRET=fr+lYLycT9XY+hOkVEpJDYobdfdpzCNhHQVgD1rk+m4=

# Google OAuth (create new credentials for production)
GOOGLE_CLIENT_ID=[Create at console.cloud.google.com]
GOOGLE_CLIENT_SECRET=[From Google Cloud Console]
ALLOWED_EMAIL_DOMAINS=mindsparkdigitallabs.com

# GCP Configuration
GCP_PROJECT_ID=oo-insights-468716
GCP_REGION=europe-west1

# Vertex AI
VERTEXAI_LOCATION=europe-west1

# For Vertex AI auth, create service account and add JSON
GOOGLE_APPLICATION_CREDENTIALS_JSON=[Service Account JSON - see below]
```

## Step 6: Set Up Google Application Credentials for Vercel

Since Vercel can't use Application Default Credentials, create a service account:

```bash
# Create service account
gcloud iam service-accounts create oo-insights-vercel \
  --display-name="OO Insights Vercel" \
  --project=oo-insights-468716

# Grant necessary roles
gcloud projects add-iam-policy-binding oo-insights-468716 \
  --member="serviceAccount:oo-insights-vercel@oo-insights-468716.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=oo-insights-vercel@oo-insights-468716.iam.gserviceaccount.com
```

Then:
1. Open `service-account-key.json`
2. Copy the entire JSON content
3. In Vercel, add it as `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable

## Step 7: Configure Custom Domain

In Vercel Dashboard > Settings > Domains:

1. Add domain: `oo.mindsparkdigitallabs.com`
2. Add the DNS records shown by Vercel to your domain provider

### If using Cloudflare/Namecheap:
- Type: CNAME
- Name: oo
- Value: cname.vercel-dns.com

## Step 8: Update OAuth Redirect URLs

Go to Google Cloud Console > APIs & Services > Credentials:

Add these authorized redirect URIs:
- `https://oo.mindsparkdigitallabs.com/api/auth/callback/google`
- `https://oo-insights.vercel.app/api/auth/callback/google` (Vercel preview URL)

## Step 9: Deploy

```bash
vercel --prod
```

Or push to GitHub and Vercel will auto-deploy.

## Troubleshooting

### Database Connection Issues
- Ensure Cloud SQL has public IP enabled
- Check that 0.0.0.0/0 is in authorized networks
- Verify DATABASE_URL uses public IP (34.38.133.240)

### Vertex AI Auth Issues
- Ensure GOOGLE_APPLICATION_CREDENTIALS_JSON is set correctly
- Service account needs `roles/aiplatform.user` role

### Domain Not Working
- DNS propagation can take up to 48 hours
- Check DNS records with: `dig oo.mindsparkdigitallabs.com`

## Security Notes

⚠️ **Production Security Recommendations:**
1. Instead of 0.0.0.0/0, get Vercel's IP ranges and whitelist only those
2. Use Cloud SQL Proxy via a Cloud Run service for better security
3. Enable SSL enforcement on Cloud SQL
4. Rotate the database password regularly

## Success Checklist

- [ ] Git repository created and pushed
- [ ] Vercel project created
- [ ] Environment variables set
- [ ] Service account created for Vertex AI
- [ ] Domain configured
- [ ] OAuth redirect URLs updated
- [ ] First deployment successful
- [ ] Domain accessible