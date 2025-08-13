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
    
    // Fetch each market sequentially to avoid rate limiting
    for (const [marketCode, config] of Object.entries(MARKETS)) {
      console.log(`\nProcessing ${config.name} (${marketCode})...`);
      
      try {
        // Call the fetch-real-data endpoint for this market
        const baseUrl = process.env.NEXTAUTH_URL || 'https://oo.mindsparkdigitallabs.com';
        const fetchUrl = `${baseUrl}/api/admin/fetch-real-data?secret=fetch-real-data-2024&market=${marketCode}`;
        
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.results?.data_saved) {
            results.total_data.trends += data.results.data_saved.trends || 0;
            results.total_data.queries += data.results.data_saved.queries || 0;
            results.total_data.volume += data.results.data_saved.volume || 0;
          }
          results.markets_processed.push(`${marketCode} ✅`);
          console.log(`✅ ${marketCode}: Fetched successfully`);
        } else {
          results.markets_failed.push(marketCode);
          results.errors.push(`${marketCode}: HTTP ${response.status}`);
          console.log(`❌ ${marketCode}: Failed with status ${response.status}`);
        }
        
        // Add delay between markets to avoid rate limiting (5 seconds)
        if (marketCode !== 'PL') { // Don't delay after last market
          console.log('Waiting 5 seconds before next market...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        results.markets_failed.push(marketCode);
        results.errors.push(`${marketCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error fetching ${marketCode}:`, error);
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