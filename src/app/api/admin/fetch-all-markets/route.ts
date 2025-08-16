import { NextRequest, NextResponse } from 'next/server';

// Market configurations for DataForSEO
const MARKETS = {
  UK: { location_code: 2826, language_code: 'en', name: 'United Kingdom' },
  FR: { location_code: 2250, language_code: 'fr', name: 'France' },
  DE: { location_code: 2276, language_code: 'de', name: 'Germany' },
  IT: { location_code: 2380, language_code: 'it', name: 'Italy' },
  ES: { location_code: 2724, language_code: 'es', name: 'Spain' },
  CA: { location_code: 2124, language_code: 'en', name: 'Canada' },
  PL: { location_code: 2616, language_code: 'pl', name: 'Poland' }
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'fetch-all-markets-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Starting to fetch data for ALL markets...');
    
    const results = {
      markets_processed: [] as string[],
      markets_failed: [] as string[],
      total_data: {
        trends: 0,
        queries: 0,
        volume: 0
      },
      errors: [] as string[]
    };
    
    // Fetch all markets in parallel batches to control concurrency
    const baseUrl = process.env.NEXTAUTH_URL || 'https://oo.mindsparkdigitallabs.com';
    const BATCH_SIZE = 3; // Process 3 markets at a time to avoid overwhelming the API
    
    // Helper function to fetch a single market
    const fetchMarket = async ([marketCode, config]: [string, typeof MARKETS[keyof typeof MARKETS]]) => {
      console.log(`Starting fetch for ${config.name} (${marketCode})...`);
      
      try {
        const fetchUrl = `${baseUrl}/api/admin/fetch-real-data?secret=fetch-real-data-2024&market=${marketCode}`;
        
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add a timeout for individual market fetches
          signal: AbortSignal.timeout(60000) // 60 seconds per market
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${marketCode}: Fetched successfully`);
          return {
            marketCode,
            success: true,
            data: data.results?.data_saved || { trends: 0, queries: 0, volume: 0 }
          };
        } else {
          console.log(`❌ ${marketCode}: Failed with status ${response.status}`);
          return {
            marketCode,
            success: false,
            error: `HTTP ${response.status}`
          };
        }
      } catch (error) {
        console.error(`Error fetching ${marketCode}:`, error);
        return {
          marketCode,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    };
    
    // Process markets in batches
    const marketEntries = Object.entries(MARKETS);
    const marketResults = [];
    
    console.log(`Processing ${marketEntries.length} markets in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < marketEntries.length; i += BATCH_SIZE) {
      const batch = marketEntries.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map(([code]) => code).join(', ')}`);
      
      const batchPromises = batch.map(fetchMarket);
      const batchResults = await Promise.all(batchPromises);
      marketResults.push(...batchResults);
      
      // Add a small delay between batches to be respectful to the API
      if (i + BATCH_SIZE < marketEntries.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Process results
    for (const result of marketResults) {
      if (result.success) {
        results.markets_processed.push(`${result.marketCode} ✅`);
        results.total_data.trends += result.data.trends;
        results.total_data.queries += result.data.queries;
        results.total_data.volume += result.data.volume;
      } else {
        results.markets_failed.push(result.marketCode);
        results.errors.push(`${result.marketCode}: ${result.error}`);
      }
    }
    
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    
    return NextResponse.json({
      success: results.markets_failed.length === 0,
      message: `Processed ${results.markets_processed.length} of ${Object.keys(MARKETS).length} markets`,
      execution_time: `${executionTime} seconds`,
      results,
      summary: {
        markets_successful: results.markets_processed,
        markets_failed: results.markets_failed,
        total_trends_saved: results.total_data.trends,
        total_queries_saved: results.total_data.queries,
        total_volume_saved: results.total_data.volume
      },
      next_steps: [
        'Data has been fetched for all markets',
        'Visit /search-trends to see the consolidated data',
        'Set up daily cron job at /api/cron/trends-daily'
      ]
    });
    
  } catch (error) {
    console.error('Fatal error in fetch-all-markets:', error);
    return NextResponse.json({
      error: 'Fatal error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}