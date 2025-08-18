#!/usr/bin/env node

/**
 * Script to manually trigger the daily crawl
 * Can be run locally to test the crawl functionality
 */

async function triggerDailyCrawl() {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3002';
  
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret';
  
  console.log('🚀 Triggering daily crawl...');
  console.log(`URL: ${baseUrl}/api/cron/daily-crawl`);
  
  try {
    const response = await fetch(`${baseUrl}/api/cron/daily-crawl`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('\n✅ Crawl completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  • Markets processed: ${data.crawlLog?.stats?.marketsProcessed || 0}`);
    console.log(`  • Total pages found: ${data.crawlLog?.stats?.totalPagesFound || 0}`);
    console.log(`  • Total pages processed: ${data.crawlLog?.stats?.totalPagesProcessed || 0}`);
    console.log(`  • Markets with errors: ${data.crawlLog?.stats?.marketsWithErrors || 0}`);
    
    if (data.results) {
      console.log('\n📈 Market Results:');
      Object.entries(data.results).forEach(([market, result]: [string, any]) => {
        console.log(`  ${market}: ${result.pagesProcessed}/${result.pagesFound} pages${result.hasErrors ? ' ⚠️' : ' ✅'}`);
      });
    }
    
    if (data.crawlLog?.stats?.errors?.length > 0) {
      console.log('\n⚠️ Errors:');
      data.crawlLog.stats.errors.forEach((error: string) => {
        console.log(`  • ${error}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Failed to trigger crawl:', error);
    process.exit(1);
  }
}

// Run the script
triggerDailyCrawl();