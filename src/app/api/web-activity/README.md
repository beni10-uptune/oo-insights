# Web Activity API Documentation

## Overview
The Web Activity API provides endpoints for tracking, analyzing, and visualizing content changes across truthaboutweight.global sites in all EUCAN markets.

## Available Endpoints

### Core APIs

#### `/api/web-activity/timeline` - GET
**Purpose**: Main timeline of content events with filtering and pattern detection
```typescript
// Query Parameters
{
  timeRange: '24h' | '7d' | '30d' | '90d'
  markets?: 'de,fr,it'     // Comma-separated market codes
  eventTypes?: 'created,updated,pattern,alert'
  search?: string          // Search in title, summary, URL
  minChange?: number       // Minimum change percentage
}

// Response
{
  success: boolean
  events: TimelineEvent[]
  total: number
  timeRange: string
  filters: AppliedFilters
}
```

#### `/api/web-activity/markets` - GET
**Purpose**: Get all available markets with activity statistics
```typescript
// Response
{
  success: boolean
  markets: MarketInfo[]
  summary: {
    total: number
    active: number
    inactive: number
  }
}
```

#### `/api/web-activity/export` - GET
**Purpose**: Export timeline data in various formats
```typescript
// Query Parameters
{
  format: 'json' | 'csv' | 'llm'  // Export format
  timeRange?: string               // Same as timeline
  markets?: string                 // Same as timeline
}
```

### Analytics APIs

#### `/api/web-activity/stats` - GET
**Purpose**: Aggregate statistics and metrics
```typescript
// Response
{
  totalPages: number
  totalEvents: number
  marketBreakdown: Record<string, number>
  eventTypeBreakdown: Record<string, number>
  recentActivity: ActivityMetrics
}
```

#### `/api/web-activity/coverage` - GET
**Purpose**: Content coverage analysis by market
```typescript
// Response
{
  markets: {
    [marketCode: string]: {
      totalPages: number
      lastCrawled: string
      coverage: number  // Percentage
      trends: TrendData[]
    }
  }
}
```

#### `/api/web-activity/health-scores` - GET
**Purpose**: Health metrics for each market's web presence
```typescript
// Response
{
  markets: {
    [marketCode: string]: {
      score: number      // 0-100
      factors: {
        freshness: number
        completeness: number
        engagement: number
      }
      recommendations: string[]
    }
  }
}
```

### Data Management APIs

#### `/api/web-activity/store` - POST
**Purpose**: Store new content or events (internal use)
```typescript
// Request Body
{
  url: string
  market: string
  title: string
  content: string
  publishDate?: string
  eventType: 'created' | 'updated'
}

// Response
{
  success: boolean
  id: string
  message: string
}
```

#### `/api/web-activity/events` - GET
**Purpose**: Raw event data access (admin use)
```typescript
// Query Parameters
{
  pageId?: string
  limit?: number
  offset?: number
}

// Response
{
  events: PageEvent[]
  total: number
  hasMore: boolean
}
```

## Data Flow

```
1. Firecrawl API → Crawls truthaboutweight sites
2. Store API → Validates and stores content
3. AI Processing → Generates English summaries
4. Timeline API → Serves filtered, enriched data
5. Frontend → Displays in EnhancedTimeline component
```

## Key Features

### Quality Filtering
All endpoints automatically filter out:
- 404 and error pages
- Admin/login pages
- Test/development content
- Pages with < 100 words
- Malformed URLs

### Market Intelligence
- Cross-market pattern detection
- Campaign rollout identification
- Content velocity tracking
- Competitive insights

### Export Capabilities
- JSON for data analysis
- CSV for spreadsheet tools
- LLM context for AI analysis

## Error Handling

All endpoints return consistent error responses:
```typescript
// Error Response (4xx/5xx)
{
  error: string
  details?: string
  code?: string
}
```

## Rate Limiting
- Public endpoints: 100 requests/minute
- Export endpoints: 10 requests/minute
- Store endpoints: Admin only

## Authentication
Currently using NextAuth with Google OAuth. Future versions will include API keys for programmatic access.

## Testing

### Local Testing
```bash
# Test timeline
curl http://localhost:3000/api/web-activity/timeline?timeRange=7d

# Test markets
curl http://localhost:3000/api/web-activity/markets

# Test export
curl http://localhost:3000/api/web-activity/export?format=json
```

### Production Monitoring
- Vercel Functions dashboard
- Application Insights (coming soon)
- Custom health checks at `/api/web-activity/health`

## Best Practices

1. **Always use market codes from MARKET_NAMES constant**
2. **Filter at API level, not frontend**
3. **Cache market data (changes rarely)**
4. **Use appropriate time ranges to limit data**
5. **Implement proper error handling**

## Deprecation Notice

### Deprecated Endpoints
- `/api/web-activity/coverage-mock` - Use `/coverage` instead

## Future Enhancements
- WebSocket support for real-time updates
- GraphQL API for flexible queries
- Webhook notifications for patterns
- Advanced AI insights
- Competitive intelligence APIs

## Support
- Documentation: `/docs/WEB-ACTIVITY-ARCHITECTURE.md`
- Issues: GitHub with `web-activity` label
- Slack: #oo-insights-dev

---
*Last Updated: January 2025*