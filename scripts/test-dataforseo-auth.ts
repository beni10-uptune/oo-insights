// Test DataForSEO authentication directly
import 'dotenv/config';

async function testAuth() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  
  console.log('Testing DataForSEO Authentication...');
  console.log('Login:', login);
  console.log('Password:', password?.substring(0, 4) + '****');
  
  const credentials = `${login}:${password}`;
  const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  
  console.log('\nTesting API with auth header...');
  
  try {
    // Test with a simple endpoint first
    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/locations', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authentication successful!');
      console.log('API Version:', data.version);
      console.log('Available locations:', data.tasks?.[0]?.result?.length || 0);
    } else {
      const errorText = await response.text();
      console.log('❌ Authentication failed:', errorText);
    }
    
    // Now test the trends endpoint
    console.log('\nTesting Google Trends endpoint...');
    const trendsResponse = await fetch('https://api.dataforseo.com/v3/keywords_data/google_trends/explore/live', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keywords: ['wegovy', 'ozempic'],
        location_code: 2826, // UK
        language_code: 'en',
        type: 'web',
      }]),
    });
    
    console.log('Trends response status:', trendsResponse.status);
    
    if (trendsResponse.ok) {
      const trendsData = await trendsResponse.json();
      console.log('✅ Trends API working!');
      console.log('Status:', trendsData.status);
      console.log('Tasks:', trendsData.tasks?.length);
      
      if (trendsData.tasks?.[0]?.result?.[0]) {
        const result = trendsData.tasks[0].result[0];
        console.log('Interest over time points:', result.interest_over_time?.items?.length || 0);
      }
    } else {
      const errorText = await trendsResponse.text();
      console.log('❌ Trends API failed:', errorText);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuth().catch(console.error);