import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  // 1. Check Firecrawl API Key
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  diagnostics.firecrawl = {
    hasKey: !!firecrawlKey,
    keyLength: firecrawlKey?.length || 0,
    keyPrefix: firecrawlKey?.substring(0, 5) || 'none',
  };

  // 2. Test Firecrawl Connection
  if (firecrawlKey) {
    try {
      const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
      const testUrl = 'https://www.ueber-gewicht.de/';
      
      console.log('[DIAGNOSE] Testing Firecrawl with:', testUrl);
      const result = await firecrawl.scrapeUrl(testUrl, {
        formats: ['markdown'],
      });
      
      diagnostics.firecrawl.testScrape = {
        success: !!result,
        hasContent: !!(result as any)?.markdown,
        contentLength: (result as any)?.markdown?.length || 0,
      };
      console.log('[DIAGNOSE] Firecrawl test result:', diagnostics.firecrawl.testScrape);
    } catch (error) {
      diagnostics.firecrawl.testScrape = {
        success: false,
        error: String(error),
      };
      console.error('[DIAGNOSE] Firecrawl error:', error);
    }
  }

  // 3. Check Database Configuration
  const dbUrl = process.env.DATABASE_URL;
  diagnostics.database = {
    hasUrl: !!dbUrl,
    urlPattern: dbUrl ? dbUrl.replace(/:[^:@]+@/, ':***@').substring(0, 50) + '...' : 'none',
    isLocalhost: dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1'),
    isCloudSQL: dbUrl?.includes('cloudsql') || dbUrl?.includes('google'),
  };

  // 4. Test Database Connection
  try {
    console.log('[DIAGNOSE] Testing database connection...');
    const prisma = new PrismaClient();
    
    // Try a simple query
    const count = await prisma.contentPage.count();
    diagnostics.database.connection = {
      success: true,
      contentPagesCount: count,
    };
    console.log('[DIAGNOSE] Database connected, pages:', count);
    
    await prisma.$disconnect();
  } catch (error) {
    diagnostics.database.connection = {
      success: false,
      error: String(error),
      errorMessage: (error as any)?.message,
    };
    console.error('[DIAGNOSE] Database error:', error);
  }

  // 5. Check other environment variables
  diagnostics.environment_vars = {
    hasGoogleCloudProject: !!process.env.GOOGLE_CLOUD_PROJECT,
    hasGoogleCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    hasCronSecret: !!process.env.CRON_SECRET,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  };

  // 6. Test Full Flow (if both Firecrawl and DB are configured)
  if (firecrawlKey && dbUrl) {
    try {
      console.log('[DIAGNOSE] Testing full flow...');
      
      // Import the actual functions
      const { scrapeUrl } = await import('@/lib/firecrawl');
      const { storeCrawlResult } = await import('@/lib/services/web-activity');
      
      // Try to scrape
      const crawlResult = await scrapeUrl('https://www.ueber-gewicht.de/');
      
      if (crawlResult) {
        diagnostics.fullFlow = {
          scrapeSuccess: true,
          hasContent: !!crawlResult.content,
        };
        
        // Try to store (this is where it likely fails)
        try {
          const stored = await storeCrawlResult(crawlResult);
          diagnostics.fullFlow.storeSuccess = true;
          diagnostics.fullFlow.storedId = stored.id;
        } catch (storeError) {
          diagnostics.fullFlow.storeSuccess = false;
          diagnostics.fullFlow.storeError = String(storeError);
        }
      } else {
        diagnostics.fullFlow = {
          scrapeSuccess: false,
        };
      }
    } catch (flowError) {
      diagnostics.fullFlow = {
        error: String(flowError),
      };
    }
  }

  // 7. Summary and recommendations
  diagnostics.summary = {
    firecrawlWorking: diagnostics.firecrawl?.testScrape?.success || false,
    databaseWorking: diagnostics.database?.connection?.success || false,
    likelyIssue: !diagnostics.database?.connection?.success 
      ? 'Database connection failing'
      : !diagnostics.firecrawl?.testScrape?.success
      ? 'Firecrawl API issue'
      : 'Unknown',
  };

  if (!diagnostics.database?.connection?.success && diagnostics.database?.isLocalhost) {
    diagnostics.recommendations = [
      'Database URL points to localhost - this won\'t work in production',
      'Update DATABASE_URL in Vercel to use the Cloud SQL connection string',
      'Format: postgresql://user:password@/database?host=/cloudsql/project:region:instance',
    ];
  }

  return NextResponse.json(diagnostics, { status: 200 });
}