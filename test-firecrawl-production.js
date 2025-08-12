// Test to verify Firecrawl works in production-like conditions
const FirecrawlApp = require('@mendable/firecrawl-js').default;

async function testFirecrawlProduction() {
  // This is the API key from your .env.local file
  const apiKey = 'fc-8d58607bd23d4d9b93ca5448d04fa470';
  
  console.log('=== TESTING FIRECRAWL IN PRODUCTION CONDITIONS ===\n');
  console.log('API Key present:', !!apiKey);
  console.log('API Key length:', apiKey.length);
  console.log('API Key prefix:', apiKey.substring(0, 10) + '...\n');
  
  try {
    // Initialize Firecrawl
    const firecrawl = new FirecrawlApp({
      apiKey: apiKey,
    });
    
    // Test URLs from different markets
    const testUrls = [
      { market: 'Germany', url: 'https://www.ueber-gewicht.de/' },
      { market: 'France', url: 'https://www.audeladupoids.fr/' },
      { market: 'Italy', url: 'https://www.novoio.it/' },
    ];
    
    const results = [];
    
    for (const test of testUrls) {
      console.log(`\nTesting ${test.market}: ${test.url}`);
      console.log('=' .repeat(50));
      
      try {
        const startTime = Date.now();
        
        const result = await firecrawl.scrapeUrl(test.url, {
          formats: ['markdown', 'html', 'links'],
        });
        
        const duration = Date.now() - startTime;
        
        const testResult = {
          market: test.market,
          url: test.url,
          success: result.success !== false,
          duration: duration,
          title: result.metadata?.title || result.title || 'No title',
          contentLength: result.markdown?.length || result.content?.length || 0,
          htmlLength: result.html?.length || 0,
          linksCount: result.links?.length || 0,
          hasMarkdown: !!result.markdown,
          hasHtml: !!result.html,
          hasMetadata: !!result.metadata,
          error: result.error || null,
        };
        
        results.push(testResult);
        
        console.log('✅ Success:', testResult.success);
        console.log('⏱️  Duration:', testResult.duration, 'ms');
        console.log('📄 Title:', testResult.title);
        console.log('📝 Content length:', testResult.contentLength, 'chars');
        console.log('🔗 Links found:', testResult.linksCount);
        
        if (result.error) {
          console.log('❌ Error:', result.error);
        }
        
      } catch (error) {
        console.log('❌ Failed to scrape:', error.message);
        results.push({
          market: test.market,
          url: test.url,
          success: false,
          error: error.message,
        });
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('SUMMARY');
    console.log('=' .repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    if (successful === results.length) {
      console.log('\n🎉 All tests passed! Firecrawl API is working correctly.');
      console.log('\n📊 FIRECRAWL IS WORKING - THE ISSUE IS WITH DATABASE CONNECTION');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
    }
    
    // Return results for further analysis
    return {
      apiKeyWorking: successful > 0,
      allTestsPassed: successful === results.length,
      results: results,
    };
    
  } catch (error) {
    console.error('\n💥 Critical error:', error);
    return {
      apiKeyWorking: false,
      error: error.message,
    };
  }
}

// Run the test
console.log('Starting Firecrawl production test...\n');

testFirecrawlProduction()
  .then((summary) => {
    console.log('\n=== TEST COMPLETE ===');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.allTestsPassed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });