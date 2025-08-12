# Vercel Environment Variables Setup

## ⚠️ CRITICAL: Missing Environment Variables

The following environment variables **MUST** be added to your Vercel project for the crawling to work:

### 1. FIRECRAWL_API_KEY (MISSING - THIS IS WHY CRAWLING ISN'T WORKING!)
```
FIRECRAWL_API_KEY=fc-8d58607bd23d4d9b93ca5448d04fa470
```

### 2. CRON_SECRET (Needed for scheduled crawls)
```
CRON_SECRET=<generate-a-secure-random-string>
```

## How to Add to Vercel

1. Go to your Vercel Dashboard
2. Select the `oo-insights` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Make sure they're enabled for **Production** environment
6. **Redeploy** your application after adding the variables

## Already Configured (Verify These Exist)

These should already be in your Vercel environment:

```
DATABASE_URL=postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require
NEXTAUTH_URL=https://oo.mindsparkdigitallabs.com
NEXTAUTH_SECRET=fr+lYLycT9XY+hOkVEpJDYobdfdpzCNhHQVgD1rk+m4=
```

## Quick Test After Adding

Once you've added the environment variables and redeployed:

1. Visit: https://oo.mindsparkdigitallabs.com/api/crawl/diagnose
2. Check that:
   - `firecrawl.hasKey` is `true`
   - `firecrawl.testScrape.success` is `true`
   - `database.connection.success` is `true`

3. Then try the "Crawl Core Markets" button on the Web Activity page

## Troubleshooting

If crawling still doesn't work after adding FIRECRAWL_API_KEY:

1. Check the diagnostics endpoint: `/api/crawl/diagnose`
2. Look for any error messages
3. The most likely issues are:
   - FIRECRAWL_API_KEY not set correctly
   - Database connection issues (check DATABASE_URL)
   - API key expired or invalid

## Summary

**The main issue is that FIRECRAWL_API_KEY is not set in your Vercel environment variables.** 
Once you add it and redeploy, the crawling should start working immediately.