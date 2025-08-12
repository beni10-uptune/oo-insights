// Test Firecrawl API directly
const FirecrawlApp = require('@mendable/firecrawl-js').default;

async function testFirecrawl() {
  const apiKey = 'fc-8d58607bd23d4d9b93ca5448d04fa470';
  
  console.log('Testing Firecrawl API...');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  
  try {
    const app = new FirecrawlApp({
      apiKey: apiKey,
    });
    
    console.log('\nTesting scrapeUrl with https://www.ueber-gewicht.de/');
    
    const result = await app.scrapeUrl('https://www.ueber-gewicht.de/', {
      formats: ['markdown', 'html', 'links'],
    });
    
    console.log('\n=== RESULT ===');
    console.log('Success:', result.success !== false);
    console.log('Result keys:', Object.keys(result));
    console.log('URL:', result.url);
    console.log('Title:', result.metadata?.title || result.title || 'No title');
    console.log('Content length:', result.markdown?.length || result.content?.length || 0);
    console.log('HTML length:', result.html?.length || 0);
    console.log('Links count:', result.links?.length || 0);
    
    if (result.error) {
      console.log('Error:', result.error);
    }
    
    // Test if the result structure matches what we expect
    console.log('\n=== DATA STRUCTURE ===');
    console.log('Has markdown:', !!result.markdown);
    console.log('Has content:', !!result.content);
    console.log('Has html:', !!result.html);
    console.log('Has metadata:', !!result.metadata);
    console.log('Has links:', !!result.links);
    
    // Log first 500 chars of content
    if (result.markdown || result.content) {
      console.log('\n=== CONTENT PREVIEW ===');
      console.log((result.markdown || result.content).substring(0, 500));
    }
    
    return result;
    
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    if (error.config) {
      console.error('Request URL:', error.config.url);
      console.error('Request method:', error.config.method);
    }
    
    throw error;
  }
}

// Run the test
testFirecrawl()
  .then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed!');
    process.exit(1);
  });