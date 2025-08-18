// Test DataForSEO raw API responses
const DATAFORSEO_LOGIN = 'ben@mindsparkdigitallabs.com';
const DATAFORSEO_PASSWORD = '85ac8ba9444f7f7d';

async function testRawAPI() {
  const credentials = `${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`;
  const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  
  console.log('Testing DataForSEO Raw API...\n');
  
  // Test 1: Keyword Volume
  console.log('1. Testing Keyword Volume endpoint...');
  const volumeResponse = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: ['wegovy', 'ozempic', 'mounjaro'],
      location_code: 2826, // UK
      language_code: 'en',
    }]),
  });
  
  const volumeData = await volumeResponse.json();
  console.log('Volume API Response:', JSON.stringify(volumeData, null, 2).substring(0, 1000));
  
  if (volumeData.tasks?.[0]?.result) {
    console.log('\n✅ Got keyword volume data!');
    const results = volumeData.tasks[0].result;
    console.log('Number of results:', results.length);
    if (results.length > 0) {
      console.log('First result:', JSON.stringify(results[0], null, 2).substring(0, 500));
    }
  }
  
  // Test 2: Google Trends
  console.log('\n2. Testing Google Trends endpoint...');
  const trendsResponse = await fetch('https://api.dataforseo.com/v3/keywords_data/google_trends/explore/live', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: ['wegovy', 'ozempic', 'mounjaro'],
      location_code: 2826, // UK
      language_code: 'en',
      type: 'web',
      date_from: '2024-01-01',
      date_to: '2024-12-31',
    }]),
  });
  
  const trendsData = await trendsResponse.json();
  console.log('Trends API Response:', JSON.stringify(trendsData, null, 2).substring(0, 1000));
  
  if (trendsData.tasks?.[0]?.result?.[0]) {
    console.log('\n✅ Got trends data!');
    const result = trendsData.tasks[0].result[0];
    console.log('Interest over time items:', result.interest_over_time?.items?.length || 0);
    if (result.interest_over_time?.items?.length > 0) {
      console.log('First data point:', JSON.stringify(result.interest_over_time.items[0], null, 2));
    }
  }
  
  // Test 3: Keywords for Keywords (Related)
  console.log('\n3. Testing Related Keywords endpoint...');
  const relatedResponse = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: ['wegovy', 'ozempic'],
      location_code: 2826, // UK
      language_code: 'en',
      sort_by: 'search_volume',
      limit: 10,
    }]),
  });
  
  const relatedData = await relatedResponse.json();
  console.log('Related Keywords Response:', JSON.stringify(relatedData, null, 2).substring(0, 1000));
  
  if (relatedData.tasks?.[0]?.result?.[0]?.items) {
    console.log('\n✅ Got related keywords!');
    const items = relatedData.tasks[0].result[0].items;
    console.log('Number of keywords:', items.length);
    if (items.length > 0) {
      console.log('Top 3 keywords:');
      items.slice(0, 3).forEach((item: any) => {
        console.log(`  - ${item.keyword}: ${item.search_volume} searches/month`);
      });
    }
  }
}

testRawAPI().catch(console.error);