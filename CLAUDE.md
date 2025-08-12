# CLAUDE.md - Project Context for OO Insights

## Project Overview
OO Insights is a marketing intelligence platform for EUCAN Marketing focused on tracking truthaboutweight.global and its regional variations.

## Core Markets (Priority)
Our primary focus markets are:
1. **UK** - United Kingdom (truthaboutweight.uk)
2. **Italy** - Italy (truthaboutweight.it)
3. **Spain** - Spain (truthaboutweight.es)
4. **France** - France (truthaboutweight.fr)
5. **Germany** - Germany (truthaboutweight.de)
6. **Poland** - Poland (truthaboutweight.pl)
7. **Canada** - Canada (truthaboutweight.ca)

All features and apps should prioritize these core markets.

## Secondary Markets
We also track other European markets but with lower priority:
- Belgium (NL/FR)
- Switzerland (DE/FR/IT)
- Netherlands
- Austria
- Portugal
- Nordic countries (SE, DK, NO, FI)

## Deployment Configuration

### Vercel Projects
- **Primary**: `oo-insights` (use this one, no number suffix)
- **Domain**: oo.mindsparkdigitallabs.com
- **GitHub**: https://github.com/beni10-uptune/oo-insights2

### Environment Variables Required
```bash
# Database
DATABASE_URL=

# Authentication
NEXTAUTH_URL=https://oo.mindsparkdigitallabs.com
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Cloud (for Vertex AI)
GOOGLE_CLOUD_PROJECT=
GOOGLE_APPLICATION_CREDENTIALS_JSON=

# Firecrawl for Web Activity
FIRECRAWL_API_KEY=

# Cron Jobs
CRON_SECRET=
```

## Key Features

### 1. Web Activity Tracker
- Monitors truthaboutweight sites across all markets
- Uses Firecrawl API for content scraping
- Tracks changes and SEO updates
- Scheduled crawling every 6 hours

### 2. Industry Insights
- RSS feed aggregation
- AI-powered summarization
- Weekly digest creation

### 3. Competitor Watch
- Track competitor campaigns
- Monitor social media activity
- Analyze messaging changes

### 4. Search & Social Ads Builders
- AI-powered ad copy generation
- Market-specific variations
- Compliance checks

### 5. Campaign Analyzer
- Performance tracking
- ROI analysis
- Market comparison

## Tech Stack
- **Framework**: Next.js 15.4.6
- **Database**: PostgreSQL via Prisma
- **Auth**: NextAuth.js with Google OAuth
- **AI**: Google Vertex AI (Gemini models)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel
- **Web Scraping**: Firecrawl API

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Deploy to Vercel
npx vercel --prod

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

## Testing Endpoints
- Web Activity Test: `/api/crawl/test`
- AI Test: `/ai-test`
- Crawl All Markets: `/api/crawl/all-markets` (POST)

## Code Quality Guidelines
When working on this project, please follow these principles:
- **NEVER USE MOCK DATA IN PRODUCTION** - All data must come from real sources (database, APIs)
- **Think in to-do lists before acting** - Plan your approach with TodoWrite tool
- **Always analyze relevant files for context** - Read existing code before modifying
- **Keep code changes as simple as possible** - Avoid over-engineering
- **Validate all fixes and changes** - Run `npm run lint` and `npm run typecheck`
- **Write clean, simple, modular code** - Follow existing patterns in the codebase
- **Prioritize readability over micro-optimizations** - Code should be easy to understand
- **Write lots of comments** - Explain complex logic and business rules
- **Avoid being lazy; implement the full fix** - Don't leave partial implementations
- **If unsure, ask clarifying questions** - Better to confirm than assume

### Critical Production Rules
- **NO MOCK DATA**: Production must always use real data from database/APIs
- **FAIL PROPERLY**: If database/API is unavailable, return proper error responses (503/500)
- **ENVIRONMENT CHECKS**: Mock data can ONLY be used in development with explicit checks
- **ROBUST SOLUTIONS**: Always implement complete, production-ready solutions

## Important Notes
- **NEVER deploy mock data to production** - All production data must be real
- Always prioritize core markets in features
- Use market-specific language codes (en-GB for UK, fr-FR for France, etc.)
- Ensure GDPR compliance for European markets
- Test features with actual market URLs before deployment
- **ALWAYS run `npm run lint` and `npm run typecheck` after completing tasks**
- **Production endpoints must fail gracefully without database** - Return 503 errors, never mock data