# Web Activity Module - Architecture & Best Practices

## Overview
The Web Activity module tracks and analyzes content changes across truthaboutweight.global sites in all EUCAN markets. This document defines the architecture, data flow, and best practices to ensure consistent, high-quality data presentation.

## Core Principles

### 1. Data Quality First
- **Filter irrelevant content at the source** - Never display 404s, error pages, or broken content
- **Validate all data before storage** - Ensure completeness and accuracy
- **Use real publish dates** - Always prefer sitemap publishDate over crawl timestamps
- **English-first presentation** - All content should have English summaries for cross-market analysis

### 2. Consistent Market Handling
- **Always use MARKET_NAMES constants** - Never hardcode market names or codes
- **Display format**: `{flag} {countryName}` (e.g., "🇬🇷 Greece", not "GR")
- **Market codes**: Use standard ISO codes with language suffixes where needed (e.g., `ca_en`, `ch_fr`)

### 3. Performance & Scalability
- **Limit query results** - Maximum 100 events per request
- **Use database indexes** - Ensure fast queries on eventAt, market, and eventType
- **Cache market data** - Markets change rarely, cache in frontend

## Data Flow Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Firecrawl API │────▶│  Processing  │────▶│   PostgreSQL    │
│   (Sitemaps)    │     │   Pipeline   │     │   (Prisma)      │
└─────────────────┘     └──────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                    ┌──────────────────┐     ┌─────────────────┐
                    │  AI Summarization│     │   Timeline API  │
                    │  (Gemini Flash)  │     │   /timeline     │
                    └──────────────────┘     └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  Frontend UI    │
                                              │  EnhancedTimeline│
                                              └─────────────────┘
```

## Content Filtering Rules

### What to EXCLUDE (Filter Out)
```typescript
// These patterns indicate low-quality or irrelevant content
const EXCLUDED_PATTERNS = {
  titles: [
    '404',
    'not found',
    'error',
    'page not found',
    'oops',
    'coming soon',
    'under construction',
    'maintenance'
  ],
  urls: [
    '/404',
    '/error',
    '/admin',
    '/login',
    '/wp-admin',
    '/test',
    '/_next',
    '/api/'
  ],
  // HTTP status codes to skip
  statusCodes: [404, 403, 500, 502, 503]
};
```

### What to INCLUDE (High-Value Content)
```typescript
const PRIORITY_CONTENT = {
  // Content types that provide marketing insights
  types: [
    'article',
    'landing_page',
    'product_page',
    'campaign',
    'blog_post',
    'press_release'
  ],
  // Minimum quality thresholds
  requirements: {
    minWordCount: 100,        // Skip empty or stub pages
    hasTitle: true,           // Must have a meaningful title
    hasPublishDate: true,     // Prefer content with dates
    hasDescription: true      // Should have meta description
  }
};
```

## API Structure & Conventions

### Timeline API (`/api/web-activity/timeline`)

#### Request Parameters
```typescript
interface TimelineRequest {
  timeRange: '24h' | '7d' | '30d' | '90d';
  markets?: string[];        // Market codes from MARKET_NAMES
  eventTypes?: ('created' | 'updated' | 'pattern' | 'alert')[];
  search?: string;           // Search in title, summary, URL
  minChange?: number;        // Minimum change percentage
}
```

#### Response Format
```typescript
interface TimelineResponse {
  success: boolean;
  events: TimelineEvent[];
  total: number;
  timeRange: string;
  filters: AppliedFilters;
}

interface TimelineEvent {
  // Core fields (always present)
  id: string;
  type: 'created' | 'updated' | 'pattern' | 'alert';
  timestamp: string;         // ISO date string
  market: string;            // Market code
  marketName: string;        // Full display name with flag
  title: string;
  description: string;       // English summary preferred
  
  // Optional metadata
  publishedAt?: string;      // Actual publish date from sitemap
  crawledAt?: string;        // When we discovered it
  originalLanguage?: string; // Source language code
  url?: string;             // Full URL to content
  changePercent?: number;   // Percentage of content changed
  tags?: string[];          // Content categorization
  impact?: 'high' | 'medium' | 'low';
  relatedCount?: number;    // Number of related events
}
```

### Markets API (`/api/web-activity/markets`)

#### Response Format
```typescript
interface MarketsResponse {
  success: boolean;
  markets: MarketInfo[];
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
}

interface MarketInfo {
  code: string;              // e.g., 'gr'
  name: string;              // e.g., 'Greece'
  flag: string;              // e.g., '🇬🇷'
  displayName: string;       // e.g., '🇬🇷 Greece'
  language: string;          // e.g., 'el'
  isCore: boolean;          // Priority market?
  pageCount: number;        // Content in database
  isActive: boolean;        // Has content?
}
```

## Database Schema Best Practices

### ContentPage Table
```prisma
model ContentPage {
  // Always populate these fields
  url           String   @unique
  market        String   
  title         String?
  summaryEn     String?  // CRITICAL: English summary for UI
  publishDate   DateTime? // From sitemap, not crawl date
  
  // Quality indicators
  wordCount     Int?
  category      String?   // AI-determined category
  contentType   String?   // article, landing_page, etc.
  
  // Tracking
  lastCrawledAt DateTime
  changeHash    String?   // SHA256 of content for change detection
}
```

### PageEvent Table
```prisma
model PageEvent {
  // Event tracking
  eventType    String    // 'created' or 'updated'
  eventAt      DateTime  // When event occurred
  
  // Link to content
  pageId       String?
  page         ContentPage? @relation(...)
  
  // Event details
  market       String?
  title        String?
  summary      String?   // Event-specific summary
  changePct    Float?    // Percentage changed
}
```

## Frontend Component Guidelines

### EnhancedTimeline Component

#### State Management
```typescript
// Use proper TypeScript interfaces
interface FilterState {
  markets: string[];
  eventTypes: string[];
  timeRange: string;
  searchQuery: string;
  minChangePercent: number;
}

// Cache market data
const [marketList, setMarketList] = useState<MarketInfo[]>([]);
useEffect(() => {
  // Fetch once and cache
  fetchMarkets();
}, []); // Empty deps - markets rarely change
```

#### Display Rules
1. **Always show English summaries** - Use `summaryEn` field
2. **Format dates intelligently** - "2 hours ago" for recent, actual dates for old
3. **Group by day** - Show "Today", "Yesterday", then dates
4. **Highlight patterns** - AI-detected patterns should stand out
5. **Progressive disclosure** - Expand for details, keep initial view clean

## Quality Assurance Checklist

### Before Storing Content
- [ ] Is the URL valid and accessible?
- [ ] Does the content have a meaningful title?
- [ ] Is word count > 100?
- [ ] Not a 404/error page?
- [ ] Has English summary been generated?
- [ ] Market code exists in MARKET_NAMES?

### Before Displaying in Timeline
- [ ] Filter out low-quality content
- [ ] Use proper market display names
- [ ] Show English summary if available
- [ ] Format dates appropriately
- [ ] Group related events
- [ ] Apply user filters correctly

### Performance Monitoring
- [ ] API response time < 500ms
- [ ] Database queries use indexes
- [ ] Frontend renders < 100 events smoothly
- [ ] Filters update without full reload

## Common Issues & Solutions

### Issue: Duplicate Events
**Solution**: Use composite unique indexes on (url, eventAt, eventType)

### Issue: Missing English Summaries
**Solution**: Background job to backfill using Gemini Flash API

### Issue: Incorrect Market Names
**Solution**: Always use getMarketDisplay() from constants

### Issue: Slow Timeline Loading
**Solution**: 
1. Limit to 100 events
2. Add database indexes on commonly filtered fields
3. Use pagination for historical data

### Issue: Irrelevant Content Showing
**Solution**: Apply exclusion filters at API level, not frontend

## Testing Requirements

### Unit Tests
```typescript
describe('Timeline API', () => {
  it('should filter out 404 pages');
  it('should return proper market names');
  it('should respect time range filters');
  it('should limit results to 100');
});
```

### Integration Tests
```typescript
describe('Web Activity Flow', () => {
  it('should crawl, process, and display content');
  it('should generate English summaries');
  it('should detect content changes');
  it('should group related events');
});
```

## Maintenance Tasks

### Daily
- Monitor crawl success rates
- Check for failed AI summarizations
- Verify no 404s in timeline

### Weekly
- Review new content categories
- Update exclusion patterns if needed
- Check cross-market pattern detection

### Monthly
- Analyze timeline usage patterns
- Optimize slow queries
- Update market configurations

## Future Enhancements

1. **Smart Grouping**: AI-powered event correlation
2. **Trend Detection**: Identify emerging topics
3. **Competitive Intelligence**: Track competitor mentions
4. **Export Improvements**: Custom report generation
5. **Real-time Updates**: WebSocket for live changes
6. **Advanced Filtering**: Regex patterns, custom queries
7. **Visualization**: Timeline graphs and heatmaps

## Code Examples

### Proper Market Handling
```typescript
// ✅ GOOD - Use constants
import { getMarketDisplay } from '@/lib/constants/markets';
const displayName = getMarketDisplay('gr'); // Returns "🇬🇷 Greece"

// ❌ BAD - Hardcoded
const displayName = 'GR'; // Don't do this!
```

### Content Filtering
```typescript
// ✅ GOOD - Filter at API level
const where = {
  NOT: [
    { title: { contains: '404' } },
    { url: { contains: '/error' } }
  ]
};

// ❌ BAD - Filter in frontend
events.filter(e => !e.title.includes('404')); // Wasteful!
```

### Date Handling
```typescript
// ✅ GOOD - Use publish date when available
const displayDate = event.publishedAt || event.crawledAt;

// ❌ BAD - Always use crawl date
const displayDate = event.crawledAt; // Misleading!
```

## Contact & Support

- **Module Owner**: Web Activity Team
- **Documentation**: This file + `/docs/WEB-ACTIVITY-TIMELINE-PRD.md`
- **Issues**: Report in GitHub with `web-activity` label
- **Slack**: #oo-insights-dev channel

---

*Last Updated: January 2025*
*Version: 2.0*