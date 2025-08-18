# Automated Web Crawling Documentation

## Overview
The OO Insights platform uses **Vercel Cron Jobs** for automated web crawling. This is simpler and more reliable than N8N workflows.

## Why Vercel Cron Over N8N?
- **Simpler Setup**: No external service configuration required
- **Direct Integration**: Runs within your existing Next.js app
- **Cost Effective**: Included with Vercel hosting
- **Easy Monitoring**: Built into Vercel dashboard
- **No Manual Work**: Fully automated once deployed

## Architecture

### 1. Daily Crawl Job (`/api/cron/daily-crawl`)
- **Schedule**: Daily at 8:00 AM UTC (9:00 AM CET)
- **Purpose**: Crawl all EUCAN markets automatically
- **Features**:
  - AI summarization and classification
  - Rate limiting between markets
  - Error handling and recovery
  - Comprehensive logging

### 2. Manual Trigger (`/api/crawl/trigger-all`)
- **Method**: POST request with auth
- **Purpose**: Manual testing and on-demand crawls
- **Use Cases**:
  - Testing new features
  - Emergency updates
  - Initial data population

## Configuration

### Environment Variables
```bash
# Required for production
CRON_SECRET=your-secure-secret-here
FIRECRAWL_API_KEY=your-firecrawl-key
DATABASE_URL=your-database-url
```

### Vercel Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-crawl",
      "schedule": "0 8 * * *"
    }
  ],
  "functions": {
    "src/app/api/cron/daily-crawl/route.ts": {
      "maxDuration": 300
    }
  }
}
```

## How It Works

### Automatic Daily Crawl Flow
1. **Vercel Cron** triggers at 8 AM UTC daily
2. **Authentication** check via CRON_SECRET
3. **Time Window** verification (8-10 AM CET)
4. **Batch Processing**:
   - Markets processed in groups of 5
   - 2-second delay between batches
   - Rate limiting to respect API limits
5. **For Each Market**:
   - Crawl up to 25 pages
   - AI summarization (if enabled)
   - Content classification
   - Store in database
6. **Logging** and monitoring

### Market Coverage
```typescript
// Core markets (high priority)
const CORE_MARKETS = [
  'de',     // Germany - https://www.ueber-gewicht.de/
  'fr',     // France - https://www.audeladupoids.fr/
  'it',     // Italy - https://www.novoio.it/
  'es',     // Spain - https://www.laverdaddesupeso.es/
  'ca_en',  // Canada EN
  'ca_fr',  // Canada FR
];

// Secondary markets (lower priority)
const SECONDARY_MARKETS = [
  'be_nl', 'be_fr',  // Belgium
  'ch_de', 'ch_fr', 'ch_it',  // Switzerland
  'se', 'no', 'dk', 'fi',  // Nordic
  // ... and more
];
```

## Testing & Deployment

### Local Testing
```bash
# Test the cron endpoint locally
curl -X GET "http://localhost:3000/api/cron/daily-crawl" \
  -H "Authorization: Bearer test-cron-secret"

# Trigger manual crawl
curl -X POST "http://localhost:3000/api/crawl/trigger-all" \
  -H "Authorization: Bearer test-cron-secret"

# Use the test script
npx tsx scripts/trigger-daily-crawl.ts
```

### Production Deployment
```bash
# Deploy to Vercel
npx vercel --prod

# Verify cron job is registered
vercel crons ls

# Check recent executions
vercel logs --filter=cron
```

## Monitoring

### Vercel Dashboard
1. Go to your Vercel project
2. Navigate to **Functions** tab
3. Select **Crons** to view:
   - Execution history
   - Success/failure rates
   - Execution duration
   - Error logs

### Database Monitoring
Check crawl results in your database:
```sql
-- Recent crawled pages
SELECT market, url, created_at, word_count
FROM content_pages
ORDER BY created_at DESC
LIMIT 20;

-- Market coverage
SELECT market, COUNT(*) as page_count
FROM content_pages
GROUP BY market
ORDER BY page_count DESC;

-- Recent changes
SELECT market, url, change_type, created_at
FROM content_changes
ORDER BY created_at DESC
LIMIT 10;
```

## Manual Operations

### Trigger Specific Market
```bash
curl -X POST "http://localhost:3000/api/crawl/full-website" \
  -H "Content-Type: application/json" \
  -d '{"market": "de", "maxPages": 50}'
```

### Check Crawl Status
```bash
# View recent cron executions
vercel logs --filter="path:/api/cron/daily-crawl" --limit=10

# Check specific execution
vercel logs --filter="requestId:YOUR_REQUEST_ID"
```

## Troubleshooting

### Common Issues

#### 1. Cron Not Triggering
- Verify `vercel.json` configuration
- Check CRON_SECRET is set in Vercel environment
- Ensure deployment was successful

#### 2. Timeouts
- Increase `maxDuration` in vercel.json (max 300s for Pro plan)
- Reduce `limit` parameter to crawl fewer pages
- Process markets sequentially instead of parallel

#### 3. Rate Limits
- Add delays between API calls
- Reduce batch size
- Implement exponential backoff

#### 4. Missing Data
- Check Firecrawl API key is valid
- Verify database connection
- Review error logs for specific failures

### Debug Commands
```bash
# Check environment variables
vercel env ls

# View function logs
vercel logs --filter="fn:daily-crawl"

# Test database connection
npx prisma db pull

# Validate Firecrawl API
curl -X GET "https://api.firecrawl.dev/v1/crawl/status" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Performance Optimization

### Recommended Settings
```typescript
// For daily crawls
const DAILY_SETTINGS = {
  limit: 25,         // Pages per market
  batchSize: 5,      // Markets per batch
  delay: 2000,       // ms between batches
  timeout: 300000,   // 5 minutes max
  summarize: true,   // Enable AI features
  classify: true,
};

// For testing
const TEST_SETTINGS = {
  limit: 5,
  batchSize: 2,
  delay: 1000,
  timeout: 60000,
  summarize: false,  // Skip AI for speed
  classify: false,
};
```

## Cost Considerations

### Vercel
- **Cron Jobs**: Free on all plans
- **Function Execution**: 
  - Hobby: 10s timeout
  - Pro: 300s timeout
  - Enterprise: Custom

### Firecrawl API
- **Rate Limits**: Respect API limits
- **Credits**: Monitor usage
- **Optimization**: Cache results when possible

## Migration from N8N

If you were using N8N workflows:

1. **Disable N8N workflows** to avoid duplicate crawls
2. **Verify Vercel crons** are active
3. **Test manually** before relying on automation
4. **Monitor first week** of automated runs

## Summary

The Vercel Cron approach provides:
- ✅ **Zero manual work** after setup
- ✅ **Reliable daily crawls** at 8 AM UTC
- ✅ **Built-in monitoring** via Vercel dashboard
- ✅ **Simple maintenance** - just deploy and forget
- ✅ **Cost effective** - included with hosting

No need for complex N8N workflows or manual triggering. The system automatically crawls all markets daily and stores the results in your database.