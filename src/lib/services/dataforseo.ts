// DataForSEO Service Integration
// Handles Google Trends, Keyword Research, and SERP Analysis

// DataForSEO API configuration
const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// Create basic auth header
const getAuthHeader = () => {
  const credentials = `${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

// Market to DataForSEO location mapping
export const MARKET_TO_LOCATION: Record<string, { location_code: number; location_name: string; language_code: string }> = {
  'UK': { location_code: 2826, location_name: 'United Kingdom', language_code: 'en' },
  'CA': { location_code: 2124, location_name: 'Canada', language_code: 'en' },
  'CA_FR': { location_code: 2124, location_name: 'Canada', language_code: 'fr' },
  'FR': { location_code: 2250, location_name: 'France', language_code: 'fr' },
  'ES': { location_code: 2724, location_name: 'Spain', language_code: 'es' },
  'IT': { location_code: 2380, location_name: 'Italy', language_code: 'it' },
  'DE': { location_code: 2276, location_name: 'Germany', language_code: 'de' },
  'PL': { location_code: 2616, location_name: 'Poland', language_code: 'pl' },
  'BE': { location_code: 2056, location_name: 'Belgium', language_code: 'nl' },
  'NL': { location_code: 2528, location_name: 'Netherlands', language_code: 'nl' },
  'CH': { location_code: 2756, location_name: 'Switzerland', language_code: 'de' },
  'AT': { location_code: 2040, location_name: 'Austria', language_code: 'de' },
  'PT': { location_code: 2620, location_name: 'Portugal', language_code: 'pt' },
  'SE': { location_code: 2752, location_name: 'Sweden', language_code: 'sv' },
  'DK': { location_code: 2208, location_name: 'Denmark', language_code: 'da' },
  'NO': { location_code: 2578, location_name: 'Norway', language_code: 'no' },
  'FI': { location_code: 2246, location_name: 'Finland', language_code: 'fi' },
  'GR': { location_code: 2300, location_name: 'Greece', language_code: 'el' },
  'CZ': { location_code: 2203, location_name: 'Czech Republic', language_code: 'cs' },
  'HU': { location_code: 2348, location_name: 'Hungary', language_code: 'hu' },
  'RO': { location_code: 2642, location_name: 'Romania', language_code: 'ro' },
  'SK': { location_code: 2703, location_name: 'Slovakia', language_code: 'sk' },
  'IE': { location_code: 2372, location_name: 'Ireland', language_code: 'en' },
};

// Brand keywords for tracking
export const BRAND_KEYWORDS = ['wegovy', 'ozempic', 'mounjaro', 'saxenda', 'rybelsus', 'zepbound'];

// Time window mappings
export const TIME_WINDOWS = {
  '7d': { days: 7, dataforseo: 'past_7_days' },
  '30d': { days: 30, dataforseo: 'past_30_days' },
  '90d': { days: 90, dataforseo: 'past_90_days' },
  '12m': { days: 365, dataforseo: 'past_12_months' },
};

interface DataForSEORequest {
  endpoint: string;
  method?: 'GET' | 'POST';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

// Generic DataForSEO API request handler
async function makeRequest({ endpoint, method = 'POST', data }: DataForSEORequest) {
  try {
    const response = await fetch(`${DATAFORSEO_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify([data]) : undefined,
    });

    if (!response.ok) {
      console.error(`DataForSEO API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    
    // Check for API errors
    if (result.status === 'error') {
      console.error('DataForSEO API error:', result.message);
      return null;
    }

    // Return the first task result
    return result.tasks?.[0]?.result?.[0] || result.tasks?.[0]?.data || null;
  } catch (error) {
    console.error('DataForSEO request failed:', error);
    return null;
  }
}

// Get Google Trends data for multiple keywords
export async function getGoogleTrends(
  keywords: string[],
  market: string,
  timeWindow: string = '30d'
) {
  const location = MARKET_TO_LOCATION[market];
  if (!location) {
    console.error(`Unknown market: ${market}`);
    return null;
  }

  const timeRange = TIME_WINDOWS[timeWindow as keyof typeof TIME_WINDOWS];
  if (!timeRange) {
    console.error(`Unknown time window: ${timeWindow}`);
    return null;
  }

  const data = {
    keywords,
    location_code: location.location_code,
    language_code: location.language_code,
    time_range: timeRange.dataforseo,
    type: 'web',
  };

  const result = await makeRequest({
    endpoint: '/keywords_data/google_trends/explore/live',
    data,
  });

  if (!result) return null;

  // Parse interest over time data
  const interestData = result.interest_over_time?.items || [];
  const relatedQueries = result.related_queries?.rising || [];
  const relatedTopics = result.related_topics?.rising || [];

  return {
    keywords,
    market,
    timeWindow,
    interestOverTime: interestData.map((item: any) => ({
      date: item.datetime,
      values: keywords.reduce((acc: any, keyword: string, idx: number) => {
        acc[keyword] = item.values[idx] || 0;
        return acc;
      }, {}),
    })),
    relatedQueries: relatedQueries.slice(0, 20),
    relatedTopics: relatedTopics.slice(0, 10),
  };
}

// Get keyword search volume and related data
export async function getKeywordData(
  keywords: string[],
  market: string
) {
  const location = MARKET_TO_LOCATION[market];
  if (!location) {
    console.error(`Unknown market: ${market}`);
    return null;
  }

  const data = {
    keywords,
    location_code: location.location_code,
    language_code: location.language_code,
    include_adult_keywords: false,
    load_serp_info: false,
    include_clickstream_data: true,
  };

  const result = await makeRequest({
    endpoint: '/keywords_data/google_ads/search_volume/live',
    data,
  });

  if (!result) return null;

  // Parse keyword metrics
  return result.map((item: any) => ({
    keyword: item.keyword,
    searchVolume: item.search_volume || 0,
    cpc: item.cpc || 0,
    competition: item.competition || 0,
    competitionIndex: item.competition_index || 0,
    monthlySearches: item.monthly_searches || [],
    trend: calculateTrend(item.monthly_searches || []),
  }));
}

// Get related/suggested keywords
export async function getRelatedKeywords(
  seedKeywords: string[],
  market: string
) {
  const location = MARKET_TO_LOCATION[market];
  if (!location) {
    console.error(`Unknown market: ${market}`);
    return null;
  }

  const data = {
    keywords: seedKeywords,
    location_code: location.location_code,
    language_code: location.language_code,
    include_seed_keyword: false,
    include_serp_info: false,
    include_clickstream_data: true,
    filters: [
      'search_volume', '>', 100,
    ],
    limit: 100,
    sort_by: 'search_volume,desc',
  };

  const result = await makeRequest({
    endpoint: '/keywords_data/google_ads/keywords_for_keywords/live',
    data,
  });

  if (!result) return null;

  // Categorize keywords by theme
  const keywords = result.items || [];
  
  return {
    all: keywords,
    questions: keywords.filter((k: any) => 
      /^(what|when|where|why|how|can|does|is|will|should)/i.test(k.keyword)
    ),
    branded: keywords.filter((k: any) => 
      BRAND_KEYWORDS.some(brand => k.keyword.toLowerCase().includes(brand))
    ),
    highVolume: keywords.filter((k: any) => k.search_volume > 1000),
    rising: keywords.filter((k: any) => calculateTrend(k.monthly_searches) > 20),
  };
}

// Get SERP data for keywords
export async function getSERPData(
  keyword: string,
  market: string
) {
  const location = MARKET_TO_LOCATION[market];
  if (!location) {
    console.error(`Unknown market: ${market}`);
    return null;
  }

  const data = {
    keyword,
    location_code: location.location_code,
    language_code: location.language_code,
    device: 'desktop',
    os: 'windows',
    depth: 10,
    load_html: false,
    calculate_rectangles: false,
  };

  const result = await makeRequest({
    endpoint: '/serp/google/organic/live/advanced',
    data,
  });

  if (!result) return null;

  // Extract key SERP features and competitors
  return {
    keyword,
    market,
    totalResults: result.se_results_count || 0,
    items: result.items || [],
    peopleAlsoAsk: result.people_also_ask || [],
    relatedSearches: result.related_searches || [],
    featuredSnippet: result.featured_snippet || null,
    knowledgeGraph: result.knowledge_graph || null,
  };
}

// Helper function to calculate trend from monthly searches
function calculateTrend(monthlySearches: any[]): number {
  if (!monthlySearches || monthlySearches.length < 2) return 0;
  
  const recent = monthlySearches.slice(-3).reduce((sum, m) => sum + (m.search_volume || 0), 0) / 3;
  const previous = monthlySearches.slice(-6, -3).reduce((sum, m) => sum + (m.search_volume || 0), 0) / 3;
  
  if (previous === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - previous) / previous) * 100);
}

// Batch process multiple markets
export async function batchProcessMarkets(
  markets: string[],
  keywords: string[],
  timeWindow: string = '30d'
) {
  const results = await Promise.all(
    markets.map(async (market) => {
      const trends = await getGoogleTrends(keywords, market, timeWindow);
      const volumeData = await getKeywordData(keywords, market);
      
      return {
        market,
        trends,
        volumeData,
        timestamp: new Date().toISOString(),
      };
    })
  );
  
  return results.filter(r => r.trends || r.volumeData);
}

// Extract themes from keywords using simple categorization
export function categorizeKeywords(keywords: string[]): Record<string, string[]> {
  const themes: Record<string, string[]> = {
    'side_effects': [],
    'availability': [],
    'price_cost': [],
    'dosage': [],
    'comparison': [],
    'insurance': [],
    'prescription': [],
    'weight_loss': [],
    'diabetes': [],
    'clinical': [],
    'general': [],
  };

  const themePatterns = {
    'side_effects': /side effect|nausea|vomit|diarrhea|constipation|headache|fatigue|reaction/i,
    'availability': /availability|stock|shortage|where|buy|purchase|order|online|pharmacy/i,
    'price_cost': /price|cost|expensive|cheap|afford|coupon|discount|savings/i,
    'dosage': /dose|dosage|mg|injection|how to|use|take|administer/i,
    'comparison': /vs|versus|compare|better|difference|alternative|substitute/i,
    'insurance': /insurance|coverage|covered|reimburse|nhs|medicare|medicaid/i,
    'prescription': /prescription|prescribe|doctor|gp|require|need/i,
    'weight_loss': /weight|loss|lose|pounds|kg|bmi|obesity|diet/i,
    'diabetes': /diabetes|diabetic|blood sugar|glucose|a1c|type 2/i,
    'clinical': /clinical|trial|study|research|efficacy|safety|fda|approved/i,
  };

  keywords.forEach(keyword => {
    let categorized = false;
    
    for (const [theme, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(keyword)) {
        themes[theme].push(keyword);
        categorized = true;
        break;
      }
    }
    
    if (!categorized) {
      themes.general.push(keyword);
    }
  });

  // Remove empty themes
  return Object.fromEntries(
    Object.entries(themes).filter(([, keywords]) => keywords.length > 0)
  );
}