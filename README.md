# OO Insights - EUCAN Marketing Intelligence Platform

Internal marketing insights app for obesity medication campaigns across EUCAN markets for truthaboutweight.global.

## Architecture

- **Frontend**: Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes + Google Cloud Run services
- **Database**: PostgreSQL with pgvector extension for embeddings
- **AI**: Vertex AI (Gemini 2.5) with Anthropic/OpenAI fallbacks
- **Deployment**: Vercel (frontend) + Google Cloud Platform (backend services)

## Features

### 📊 Web Activity
Track website changes and updates using Firecrawl MCP for continuous monitoring of truthaboutweight.global pages.

### 📚 Industry Insights
RSS feed aggregation with AI-powered summarization and topic classification for obesity medication news.

### 👁️ Competitor Watch
Monitor competitor advertising through Meta Ad Library and DataForSEO integration.

### 🎯 Organic Impact
Google Search Console integration for SEO performance tracking across markets.

### 📈 Search Trends
DataForSEO Labs integration for keyword trend analysis and search volume insights.

### 🔍 Search Ads Builder
AI-powered Google Ads campaign generation with compliance guardrails.

### 📊 Campaign Analyzer
Multi-channel campaign performance analytics with CSV to PowerPoint reporting.

### 📣 Meta Ads Builder
Localized Meta advertising campaign creation with market-specific adaptations.

## Markets Supported

- Global
- UK (United Kingdom)
- CA (Canada)
- BE-NL (Belgium - Dutch)
- BE-FR (Belgium - French)
- CH-DE (Switzerland - German)
- CH-FR (Switzerland - French)
- CH-IT (Switzerland - Italian)

## Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ with pgvector extension
- Google Cloud Project with enabled APIs
- Vercel account for deployment

### Installation

1. Clone the repository:
```bash
cd oo-insights
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Key environment variables needed:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: NextAuth session secret
- `GOOGLE_CLIENT_ID/SECRET`: Google OAuth credentials
- `GCP_PROJECT_ID`: Google Cloud project ID
- `VERTEXAI_*`: Vertex AI configuration
- `MCP_FIRECRAWL_API_KEY`: Firecrawl MCP API key
- `DATAFORSEO_*`: DataForSEO credentials

See `.env.example` for the complete list.

## Database Schema

The application uses PostgreSQL with pgvector for storing:
- `content_pages`: Crawled website content
- `page_events`: Website change events
- `rss_sources`: RSS feed configurations
- `rss_articles`: Aggregated RSS articles
- `user_preferences`: User settings and market preferences
- `digests`: Email digest history

## Deployment

### Vercel (Frontend)

```bash
vercel --prod
```

### Google Cloud (Backend Services)

```bash
# Deploy Cloud Run services
gcloud run deploy api-worker --source . --region europe-west1
gcloud run deploy batch-runner --source . --region europe-west1

# Set up Cloud Scheduler jobs
gcloud scheduler jobs create http crawl-websites \
  --schedule="0 */6 * * *" \
  --uri="https://api-worker-xxx.run.app/crawl"
```

## Security

- Google Workspace SSO authentication
- Domain-based access control
- Role-based permissions (GLOBAL_ADMIN, REGIONAL_ADMIN, MARKET_USER)
- Market-scoped data access

## Compliance

All content generation includes:
- Medical compliance guardrails
- Approved brand terminology
- Source citation requirements
- No medical claims or advice

## License

Internal use only - truthaboutweight.global EUCAN marketing team.