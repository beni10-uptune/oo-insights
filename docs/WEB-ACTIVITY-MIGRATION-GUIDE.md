# Web Activity Migration & Maintenance Guide

## Overview
This guide ensures consistent updates and maintenance of the Web Activity module, preventing regression and maintaining data quality.

## Pre-Migration Checklist

Before making any changes to the Web Activity module:

- [ ] Review `/docs/WEB-ACTIVITY-ARCHITECTURE.md`
- [ ] Check current data quality metrics
- [ ] Backup database if schema changes needed
- [ ] Test in development environment first
- [ ] Verify all market codes match MARKET_NAMES
- [ ] Ensure English summaries are being generated

## Common Migration Scenarios

### 1. Adding New Markets

#### Steps:
1. Add market to `/src/lib/constants/markets.ts`:
```typescript
export const MARKET_NAMES = {
  // ... existing markets
  'new_market': {
    code: 'nm',
    name: 'New Market',
    flag: '🏳️',
    language: 'lang',
    languageName: 'Language',
    isCore: false
  }
};
```

2. Update Firecrawl configuration in `/src/lib/firecrawl.ts`
3. Add market-specific URL patterns if needed
4. Test crawling with limited pages first
5. Verify English summary generation works

#### Validation:
```bash
# Test new market crawl
curl -X POST http://localhost:3000/api/crawl/full-website \
  -H "Content-Type: application/json" \
  -d '{"market": "nm", "maxPages": 5}'
```

### 2. Updating Content Filters

#### Steps:
1. Update `/src/lib/web-activity/content-validator.ts`:
```typescript
export const EXCLUDED_PATTERNS = {
  titles: [
    // ... existing patterns
    'new_pattern_to_exclude'
  ]
};
```

2. Test against existing content:
```sql
-- Check what would be filtered
SELECT COUNT(*) FROM "PageEvent" 
WHERE title ILIKE '%new_pattern%';
```

3. Update timeline API if needed
4. Document reason for filter addition

### 3. Schema Changes

#### Adding Fields:
```prisma
model ContentPage {
  // ... existing fields
  newField String? // Always make nullable initially
}
```

#### Migration Steps:
1. Add field as nullable
2. Run migration: `npx prisma migrate dev`
3. Backfill data if needed
4. Make required after backfill complete

#### Backfill Script Template:
```typescript
// scripts/backfill-new-field.ts
import { prisma } from '@/lib/db';

async function backfill() {
  const pages = await prisma.contentPage.findMany({
    where: { newField: null }
  });
  
  for (const page of pages) {
    await prisma.contentPage.update({
      where: { id: page.id },
      data: { newField: computeValue(page) }
    });
  }
}
```

### 4. API Response Changes

#### Breaking Change Prevention:
1. **Never remove fields** - Deprecate instead
2. **Add new fields as optional** first
3. **Version endpoints** if major changes needed

#### Safe Update Pattern:
```typescript
// BAD - Breaking change
{
  market: 'de' // Removed marketName
}

// GOOD - Backward compatible
{
  market: 'de',
  marketName: 'Germany', // Keep old field
  marketDisplay: '🇩🇪 Germany' // Add new field
}
```

## Data Quality Maintenance

### Daily Tasks
```bash
# Check for 404s in timeline
curl http://localhost:3000/api/web-activity/timeline | \
  jq '.events[] | select(.title | contains("404"))'

# Verify English summaries
SELECT COUNT(*) FROM "ContentPage" 
WHERE "summaryEn" IS NULL OR "summaryEn" = '';
```

### Weekly Tasks
1. Review excluded content patterns
2. Check crawl success rates
3. Analyze new content categories
4. Update market configurations if needed

### Monthly Tasks
1. Performance optimization review
2. Database index analysis
3. Clean up old/irrelevant data
4. Update documentation

## Troubleshooting Guide

### Issue: 404s Appearing in Timeline

#### Diagnosis:
```sql
SELECT title, url, market FROM "PageEvent" 
WHERE title ILIKE '%404%' 
ORDER BY "eventAt" DESC LIMIT 10;
```

#### Fix:
1. Update content validator filters
2. Re-run timeline API
3. Verify filters working

### Issue: Missing Market Names

#### Diagnosis:
```typescript
// Check if market exists in constants
import { MARKET_NAMES } from '@/lib/constants/markets';
console.log(MARKET_NAMES['problem_market']);
```

#### Fix:
1. Add missing market to MARKET_NAMES
2. Update markets API cache
3. Restart application

### Issue: Slow Timeline Loading

#### Diagnosis:
```sql
EXPLAIN ANALYZE 
SELECT * FROM "PageEvent" 
WHERE "eventAt" > NOW() - INTERVAL '7 days';
```

#### Fix:
1. Add database indexes:
```sql
CREATE INDEX idx_event_at ON "PageEvent"("eventAt");
CREATE INDEX idx_market ON "PageEvent"("market");
```

2. Limit results in API
3. Implement pagination

### Issue: English Summaries Not Generating

#### Diagnosis:
```bash
# Check AI service
curl http://localhost:3000/api/test/simple-ai
```

#### Fix:
1. Verify Gemini API key
2. Check rate limits
3. Run backfill script:
```bash
npm run backfill:summaries
```

## Testing Requirements

### Unit Tests
```typescript
describe('Content Validator', () => {
  test('filters 404 pages', () => {
    expect(isExcludedTitle('404 Not Found')).toBe(true);
  });
  
  test('accepts valid content', () => {
    expect(meetsQualityThreshold({
      title: 'Valid Article Title',
      wordCount: 500
    })).toBe(true);
  });
});
```

### Integration Tests
```typescript
describe('Timeline API', () => {
  test('returns filtered events', async () => {
    const res = await fetch('/api/web-activity/timeline');
    const data = await res.json();
    
    // No 404s in results
    expect(data.events.every(e => 
      !e.title.includes('404')
    )).toBe(true);
  });
});
```

### E2E Tests
```typescript
describe('Web Activity Flow', () => {
  test('complete content pipeline', async () => {
    // 1. Crawl content
    // 2. Process with AI
    // 3. Store in database
    // 4. Display in timeline
    // 5. Export data
  });
});
```

## Deployment Checklist

Before deploying changes:

- [ ] All tests passing
- [ ] Linting clean: `npm run lint`
- [ ] TypeScript valid: `npx tsc --noEmit`
- [ ] Database migrations ready
- [ ] Environment variables set
- [ ] Documentation updated
- [ ] Tested in staging

## Rollback Procedures

### API Rollback
1. Revert to previous commit
2. Redeploy via Vercel
3. Clear CDN cache

### Database Rollback
```bash
# Revert last migration
npx prisma migrate resolve --rolled-back

# Or restore from backup
pg_restore -d database_name backup.dump
```

### Emergency Contacts
- Lead Developer: @web-activity-lead
- Database Admin: @db-admin
- On-call: Check PagerDuty

## Performance Benchmarks

Target metrics for Web Activity:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Timeline API Response | < 500ms | > 2s |
| Export Generation | < 5s | > 30s |
| Crawl Processing | < 1s/page | > 5s/page |
| Database Queries | < 100ms | > 1s |
| Frontend Render | < 1s | > 3s |

## Version History

### v2.0 (Current)
- Added content validation
- Improved market display
- Enhanced filtering
- Pattern detection

### v1.0
- Initial timeline
- Basic filtering
- Market support

## Resources

- Architecture: `/docs/WEB-ACTIVITY-ARCHITECTURE.md`
- API Docs: `/src/app/api/web-activity/README.md`
- Constants: `/src/lib/constants/markets.ts`
- Validator: `/src/lib/web-activity/content-validator.ts`

---
*Last Updated: January 2025*
*Maintainer: Web Activity Team*