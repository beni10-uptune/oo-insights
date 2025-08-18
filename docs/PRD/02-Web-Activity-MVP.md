# PRD: Web Activity Intelligence - MVP
## Enhanced Timeline & Market Health Features

### 1. Overview
The Web Activity feature is the command center for monitoring all website changes, content performance, and market health across the truthaboutweight properties. This MVP focuses on maximizing value from existing data in our tables.

### 2. Core MVP Features

#### 2.1 Timeline Activity Feed
**Data Sources**: `content_pages`, `page_events`, `page_changes`

**Display Components**:
- **Activity Cards** showing:
  - 🆕 New content published
  - 📝 Content updates (with change %)
  - 📈 Significant traffic changes (when integrated)
  - 🔍 SEO changes detected
  - 🌍 Market-specific highlights

**Smart Grouping**:
- Group similar events (e.g., "5 pages updated in Germany")
- Highlight patterns across markets
- Show impact metrics where available

#### 2.2 Market Health Scores
**Calculation Based on Available Data**:

```
Health Score = 
  Content Freshness (40%) +
  Content Coverage (30%) +
  Update Frequency (30%)
```

**Content Freshness Score** (from `content_pages.lastModifiedAt`):
- 100: >50% content updated in last 30 days
- 75: >30% content updated in last 30 days
- 50: >20% content updated in last 60 days
- 25: <20% updated in last 90 days

**Content Coverage Score** (from `content_pages` count):
- Compare to expected pages from sitemap
- Percentage of pages successfully crawled

**Update Frequency Score** (from `page_events`):
- Average time between updates
- Consistency of publishing schedule

#### 2.3 Content Performance Insights
**Without Traffic Data** (Current MVP):
- Word count analysis
- Content length trends
- Update patterns
- Topic categorization (from tags)

**With Traffic Data** (Future):
- Page views correlation
- Engagement metrics
- Conversion tracking
- ROI analysis

### 3. UI/UX Enhancements

#### 3.1 Filter Bar
```typescript
interface FilterOptions {
  markets: string[];        // Multi-select markets
  timeRange: DateRange;      // Last 24h, 7d, 30d, custom
  eventTypes: EventType[];   // Created, updated, etc.
  minChangePercent?: number; // Only show significant changes
  searchQuery?: string;      // Full-text search
}
```

#### 3.2 Market Comparison View
- Side-by-side market health cards
- Sparkline trends for each metric
- Quick actions (View Details, Compare, Export)

#### 3.3 Detail Drill-Down
Click any event to see:
- Full page content (before/after for updates)
- Change visualization
- Related events timeline
- Similar patterns in other markets

### 4. Implementation Plan

#### Phase 1: Enhanced Timeline (Week 1)
- [ ] Create activity feed component
- [ ] Implement smart grouping algorithm
- [ ] Add filtering capabilities
- [ ] Connect to real data

#### Phase 2: Health Scoring (Week 1)
- [ ] Calculate scores from existing data
- [ ] Create visual score cards
- [ ] Add trend indicators
- [ ] Implement drill-down views

#### Phase 3: Search & Filter (Week 2)
- [ ] Build advanced filter UI
- [ ] Add full-text search
- [ ] Create saved filter presets
- [ ] Export functionality

#### Phase 4: Insights Layer (Week 2)
- [ ] Pattern detection across markets
- [ ] Anomaly highlighting
- [ ] Suggested actions
- [ ] Report generation

### 5. Data Integration Points

#### Current Tables:
- `content_pages`: Core content data
- `page_events`: Change tracking
- `page_changes`: Detailed diffs
- `markets`: Reference data

#### Future Integrations:
- Google Analytics 4: Traffic data
- Search Console: SEO metrics
- `trends_series`: Search trend correlation
- Social media APIs: Engagement data

### 6. Success Metrics

#### Immediate (No traffic data):
- Time to identify content gaps: <30 seconds
- Market health assessment: <10 seconds
- Cross-market pattern detection: Automated

#### Future (With traffic data):
- Content ROI calculation: Automated
- Performance prediction accuracy: >80%
- Optimization recommendations: Daily

### 7. Technical Requirements

#### Frontend Components:
```typescript
// Core components to build
<ActivityTimeline />
<MarketHealthCard />
<ContentPerformanceChart />
<FilterBar />
<EventDetailModal />
<MarketComparisonGrid />
```

#### API Endpoints:
```typescript
GET /api/web-activity/timeline
GET /api/web-activity/health-scores
GET /api/web-activity/events/:id
POST /api/web-activity/search
GET /api/web-activity/insights
```

#### Real-time Updates:
- WebSocket for live events
- Polling fallback (30s intervals)
- Optimistic UI updates

### 8. MVP Deliverables

1. **Enhanced Timeline View**
   - Real-time activity feed
   - Smart event grouping
   - Pattern detection

2. **Market Health Dashboard**
   - Visual health scores
   - Trend indicators
   - Comparison tools

3. **Powerful Filtering**
   - Multi-dimension filters
   - Saved presets
   - Export capabilities

4. **Actionable Insights**
   - AI-generated summaries
   - Recommended actions
   - Cross-market learnings

This MVP maximizes the value of our existing data while building a foundation for future traffic integration and advanced analytics.