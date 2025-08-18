/**
 * Simple AI service using direct API keys
 * Supports: Gemini, OpenRouter, Anthropic
 */

interface SummarizationResult {
  original: string;
  english: string;
}

interface ClassificationResult {
  category: string;
  subcategory: string;
  hasHcpLocator: boolean;
  signals?: Record<string, boolean | number>;
}

/**
 * Use Gemini API directly (no Google Cloud setup needed)
 */
async function geminiSummarize(content: string, language: string): Promise<SummarizationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const isEnglish = language === 'en' || language.startsWith('en-');
  
  const prompt = isEnglish
    ? `Summarize this medical content about obesity in 2-3 sentences:\n\n${content.substring(0, 3000)}`
    : `Provide two summaries of this medical content:
      1. A 2-3 sentence summary in ${language}
      2. A 2-3 sentence summary in English
      
      Format:
      ORIGINAL: [summary in ${language}]
      ENGLISH: [summary in English]
      
      Content: ${content.substring(0, 3000)}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (isEnglish) {
    return { original: result.trim(), english: result.trim() };
  }

  const originalMatch = result.match(/ORIGINAL:\s*([\s\S]*?)(?=ENGLISH:|$)/);
  const englishMatch = result.match(/ENGLISH:\s*([\s\S]*?)$/);
  
  return {
    original: originalMatch?.[1]?.trim() || result.trim(),
    english: englishMatch?.[1]?.trim() || 'Summary not available',
  };
}

/**
 * Use OpenRouter (supports many models)
 */
async function openRouterSummarize(content: string, language: string): Promise<SummarizationResult> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPEN_ROUTER_API_KEY not configured');

  const isEnglish = language === 'en' || language.startsWith('en-');
  
  const prompt = isEnglish
    ? `Summarize this medical content about obesity in 2-3 sentences:\n\n${content.substring(0, 3000)}`
    : `Provide two summaries of this medical content:
      1. A 2-3 sentence summary in ${language}
      2. A 2-3 sentence summary in English
      
      Format:
      ORIGINAL: [summary in ${language}]
      ENGLISH: [summary in English]
      
      Content: ${content.substring(0, 3000)}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://oo.mindsparkdigitallabs.com',
      'X-Title': 'OO Insights',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash:free', // Gemini Flash 2.5 - best for translation
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content || '';

  if (isEnglish) {
    return { original: result.trim(), english: result.trim() };
  }

  const originalMatch = result.match(/ORIGINAL:\s*([\s\S]*?)(?=ENGLISH:|$)/);
  const englishMatch = result.match(/ENGLISH:\s*([\s\S]*?)$/);
  
  return {
    original: originalMatch?.[1]?.trim() || result.trim(),
    english: englishMatch?.[1]?.trim() || 'Summary not available',
  };
}

/**
 * Use Anthropic Claude directly
 */
async function anthropicSummarize(content: string, language: string): Promise<SummarizationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const isEnglish = language === 'en' || language.startsWith('en-');
  
  const prompt = isEnglish
    ? `Summarize this medical content about obesity in 2-3 sentences:\n\n${content.substring(0, 3000)}`
    : `Provide two summaries of this medical content:
      1. A 2-3 sentence summary in ${language}
      2. A 2-3 sentence summary in English
      
      Format:
      ORIGINAL: [summary in ${language}]
      ENGLISH: [summary in English]
      
      Content: ${content.substring(0, 3000)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Cheapest and fastest
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.content?.[0]?.text || '';

  if (isEnglish) {
    return { original: result.trim(), english: result.trim() };
  }

  const originalMatch = result.match(/ORIGINAL:\s*([\s\S]*?)(?=ENGLISH:|$)/);
  const englishMatch = result.match(/ENGLISH:\s*([\s\S]*?)$/);
  
  return {
    original: originalMatch?.[1]?.trim() || result.trim(),
    english: englishMatch?.[1]?.trim() || 'Summary not available',
  };
}

/**
 * Main summarization function - tries available APIs
 */
export async function summarizeContent(
  content: string,
  language: string
): Promise<SummarizationResult> {
  // Try in order of preference/availability
  
  // 1. Try Gemini (free tier available)
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiSummarize(content, language);
    } catch (error) {
      console.error('Gemini API failed:', error);
    }
  }

  // 2. Try OpenRouter (pay-per-use, many models)
  if (process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY) {
    try {
      return await openRouterSummarize(content, language);
    } catch (error) {
      console.error('OpenRouter API failed:', error);
    }
  }

  // 3. Try Anthropic (reliable but needs paid API key)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await anthropicSummarize(content, language);
    } catch (error) {
      console.error('Anthropic API failed:', error);
    }
  }

  // 4. Fallback - basic extraction
  console.warn('No AI API configured - using fallback');
  const cleanContent = content.replace(/<[^>]*>/g, '').trim();
  const summary = cleanContent.substring(0, 200) + '...';
  
  return {
    original: summary,
    english: `This ${language} page contains information about obesity and weight management. (AI translation unavailable - configure API key)`,
  };
}

/**
 * Classify content into categories
 */
export async function classifyContent(content: string): Promise<ClassificationResult> {
  // For now, use simple keyword-based classification
  // Can be enhanced with AI when API is available
  
  const contentLower = content.toLowerCase();
  
  let category = 'General Information';
  let subcategory = 'Overview';
  
  // Check for specific content types
  if (contentLower.includes('treatment') || contentLower.includes('medication')) {
    category = 'Treatment Options';
    subcategory = contentLower.includes('surgery') ? 'Surgical Options' : 'Medical Treatments';
  } else if (contentLower.includes('patient') && contentLower.includes('story')) {
    category = 'Patient Support';
    subcategory = 'Patient Stories';
  } else if (contentLower.includes('research') || contentLower.includes('study')) {
    category = 'News & Updates';
    subcategory = 'Research Updates';
  } else if (contentLower.includes('doctor') || contentLower.includes('physician')) {
    category = 'Healthcare Provider Resources';
    subcategory = 'HCP Information';
  }
  
  const hasHcpLocator = contentLower.includes('find a doctor') || 
                        contentLower.includes('locate physician') ||
                        contentLower.includes('hcp locator');
  
  return {
    category,
    subcategory,
    hasHcpLocator,
    signals: {
      hasVideo: contentLower.includes('video') || contentLower.includes('watch'),
      hasCalculator: contentLower.includes('calculator') || contentLower.includes('bmi'),
      hasTreatmentInfo: contentLower.includes('treatment'),
      hasPatientStory: contentLower.includes('patient') && contentLower.includes('story'),
    },
  };
}

/**
 * Test API configuration
 */
export async function testAIConfiguration(): Promise<{
  configured: boolean;
  provider: string | null;
  error?: string;
}> {
  if (process.env.GEMINI_API_KEY) {
    try {
      await geminiSummarize('Test content', 'en');
      return { configured: true, provider: 'Gemini' };
    } catch (error) {
      console.error('Gemini test failed:', error);
    }
  }

  if (process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY) {
    try {
      await openRouterSummarize('Test content', 'en');
      return { configured: true, provider: 'OpenRouter' };
    } catch (error) {
      console.error('OpenRouter test failed:', error);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      await anthropicSummarize('Test content', 'en');
      return { configured: true, provider: 'Anthropic' };
    } catch (error) {
      console.error('Anthropic test failed:', error);
    }
  }

  return {
    configured: false,
    provider: null,
    error: 'No AI API key configured. Add one of: GEMINI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY to .env.local',
  };
}