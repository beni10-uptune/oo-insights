# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these to your Vercel project settings at:
https://vercel.com/your-team/oo-insights/settings/environment-variables

### Database Configuration
```
DATABASE_URL=postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require
PGVECTOR_ENABLED=true
```

### NextAuth Configuration
```
NEXTAUTH_URL=https://oo.mindsparkdigitallabs.com
NEXTAUTH_SECRET=fr+lYLycT9XY+hOkVEpJDYobdfdpzCNhHQVgD1rk+m4=
```

### Google OAuth (Optional - for authentication)
```
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
ALLOWED_EMAIL_DOMAINS=mindsparkdigitallabs.com
```

### GCP Configuration
```
GCP_PROJECT_ID=oo-insights-468716
GCP_REGION=europe-west1
```

### Vertex AI Configuration
```
VERTEXAI_LOCATION=europe-west1
VERTEXAI_MODEL_TEXT=gemini-1.5-pro-002
VERTEXAI_MODEL_TEXT_FAST=gemini-1.5-flash-002
VERTEXAI_MODEL_EMBED=text-embedding-004
```

### Firecrawl API (for web scraping)
```
FIRECRAWL_API_KEY=fc-8d58607bd23d4d9b93ca5448d04fa470
```

### DataForSEO API (REQUIRED for Search Trends)
```
DATAFORSEO_LOGIN=ben@mindsparkdigitallabs.com
DATAFORSEO_PASSWORD=85ac8ba9444f7f7d
```

### Cron Secret (for scheduled jobs)
```
CRON_SECRET=your-secure-cron-secret-here
```

### Application Settings
```
DEFAULT_MARKETS=Global,UK,CA,BE-NL,BE-FR,CH-DE,CH-FR,CH-IT
```

## How to Add Environment Variables

1. Go to https://vercel.com and login
2. Navigate to your project (oo-insights)
3. Click on "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. Add each variable one by one:
   - Enter the Key (e.g., `DATAFORSEO_LOGIN`)
   - Enter the Value (e.g., `ben@mindsparkdigitallabs.com`)
   - Select environments (Production, Preview, Development)
   - Click "Save"

## Critical Variables for Search Trends

These MUST be added for the Search Trends feature to work:

1. **DATAFORSEO_LOGIN** - Your DataForSEO account email
2. **DATAFORSEO_PASSWORD** - Your DataForSEO API password
3. **DATABASE_URL** - The PostgreSQL connection string

## After Adding Variables

1. Trigger a new deployment (push any change or click "Redeploy")
2. Test the endpoint: 
   ```
   https://oo.mindsparkdigitallabs.com/api/admin/fetch-real-trends?secret=fetch-real-trends-2024&test=true
   ```

## Troubleshooting

If the endpoint returns "Page isn't working":
1. Check Vercel Function Logs for errors
2. Ensure all required environment variables are set
3. Verify DATABASE_URL is accessible from Vercel
4. Check DataForSEO credentials are correct