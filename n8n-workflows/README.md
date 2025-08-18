# N8N Web Activity Firecrawl Workflows

## Overview
This directory contains N8N workflows for automated web crawling of Truth About Weight sites across core European markets using Firecrawl API.

## Core Markets
- **Germany** (de): https://www.ueber-gewicht.de/ - 84 pages
- **France** (fr): https://www.audeladupoids.fr/ - ~80 pages
- **Italy** (it): https://www.novoio.it/ - ~80 pages  
- **Spain** (es): https://www.laverdaddesupeso.es/ - ~80 pages

## Workflows

### 1. Basic Web Activity Firecrawl (`web-activity-firecrawl.json`)
- **Schedule**: Every 6 hours
- **Features**:
  - Sequential market crawling with rate limiting
  - Error handling and notifications
  - Google Sheets logging
  - Slack alerts

### 2. Advanced Firecrawl with Sitemap (`advanced-firecrawl-workflow.json`)
- **Schedule**: Daily at 9 AM CET
- **Features**:
  - Sitemap parsing for comprehensive crawling
  - Batch processing (5 pages per batch)
  - Rate limiting (1 second between requests)
  - Database storage for all content
  - Notion logging for tracking
  - Detailed error reporting

## Setup Instructions

### Prerequisites
1. N8N instance at: https://mindsparkdigitallabs.app.n8n.cloud
2. N8N API Key (from .env.local or N8N settings)
3. Firecrawl API key
4. Database access (Supabase)
5. Slack workspace (optional)
6. Google Sheets or Notion (optional)

### Installation Steps

#### Method 1: Via API (Recommended for Claude Code)
```bash
# Set your API key
export N8N_API_KEY="your_api_key_here"

# Create workflow via API
curl -X POST "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @web-activity-firecrawl.json

# Activate workflow
curl -X PATCH "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

#### Method 2: Via N8N UI
1. Go to https://mindsparkdigitallabs.app.n8n.cloud
2. Click **Workflows** > **Import from File**
3. Upload the JSON workflow file
4. Configure credentials and activate

2. **Configure Credentials**:
   - **Firecrawl API**: Add your API key in N8N credentials
   - **Database**: Configure Supabase connection
   - **Slack**: Add webhook URL for notifications
   - **Google Sheets/Notion**: Optional logging

3. **Update API Endpoints**:
   - Replace `https://oo.mindsparkdigitallabs.com` with your actual domain
   - Update `/api/crawl/full-website` endpoint if different
   - Configure `/api/web-activity/store` for content storage

4. **Set Environment Variables**:
   ```env
   FIRECRAWL_API_KEY=your_api_key
   DATABASE_URL=your_supabase_url
   CRON_SECRET=your_cron_secret
   ```

## Workflow Configuration

### Rate Limiting Strategy
- **Batch Size**: 5 pages per batch
- **Delay Between Batches**: 2 seconds
- **Delay Between Individual Requests**: 1 second
- **Timeout per Request**: 60 seconds
- **Total Workflow Timeout**: 1 hour

### Error Handling
- Automatic retry for failed requests (3 attempts)
- Error logging to separate channel
- Failed URLs tracked for manual review
- Partial success handling (continues even if some pages fail)

## API Endpoints Required

### 1. Store Content Endpoint
```typescript
POST /api/web-activity/store
{
  url: string;
  market: string;
  title: string;
  description: string;
  content: string;
  html: string;
  lastmod: string;
  crawlId: string;
  metadata: object;
}
```

### 2. Full Website Crawl Endpoint
```typescript
POST /api/crawl/full-website
{
  market: string;
  maxPages: number;
}
```

## Monitoring & Alerts

### Slack Channels
- `#oo-insights-crawl`: Success notifications
- `#oo-insights-alerts`: Error alerts

### Metrics Tracked
- Total pages crawled per market
- Success/failure rates
- Crawl duration
- Error types and frequencies

## Scheduling

### Recommended Schedule
- **Germany**: Every 6 hours (high priority)
- **France, Italy, Spain**: Daily at 9 AM CET
- **Manual Trigger**: Available via webhook for on-demand crawls

### Time Estimates
- Germany (84 pages): ~15-20 minutes
- France (80 pages): ~15 minutes
- Italy (80 pages): ~15 minutes
- Spain (80 pages): ~15 minutes
- **Total Daily Run**: ~1 hour

## Troubleshooting

### Common Issues

1. **Rate Limit Errors (502)**:
   - Increase delay between requests
   - Reduce batch size
   - Implement exponential backoff

2. **Timeout Errors**:
   - Increase request timeout
   - Split large markets into smaller batches
   - Run markets sequentially instead of parallel

3. **Missing Pages**:
   - Check sitemap URL accessibility
   - Verify URL patterns match expected format
   - Review crawl depth settings

### Debug Mode
Enable debug logging in N8N:
1. Go to workflow settings
2. Enable "Save Manual Executions"
3. Set log level to "Debug"

## Scaling Considerations

### For Additional Markets
1. Add market configuration to `prepare-markets` node
2. Update rate limiting based on total pages
3. Consider separate workflows for different regions
4. Implement priority queue for core vs secondary markets

### Performance Optimization
- Use N8N's built-in queue mode for large-scale crawling
- Implement caching for recently crawled pages
- Use database transactions for bulk inserts
- Consider CDN for static content

## Maintenance

### Weekly Tasks
- Review error logs
- Check crawl completeness
- Update sitemap URLs if changed
- Monitor API usage and costs

### Monthly Tasks
- Analyze crawl patterns
- Optimize rate limiting
- Update market priorities
- Review and archive old data

## Support

For issues or questions:
- N8N Instance: https://mindsparkdigitallabs.app.n8n.cloud
- Documentation: [N8N Docs](https://docs.n8n.io)
- Firecrawl API: [Firecrawl Docs](https://docs.firecrawl.dev)

## Version History
- v1.0.0: Initial workflow setup
- v1.1.0: Added sitemap parsing
- v1.2.0: Implemented batch processing and rate limiting
- v1.3.0: Added comprehensive error handling and notifications