/**
 * AI-powered content categorization with MECE structure
 * Uses Gemini Flash 2.5 for accurate categorization
 */

// Primary content categories (MECE - Mutually Exclusive, Collectively Exhaustive)
export const CONTENT_CATEGORIES = {
  'HCP: Speak to Dr': {
    description: 'Content encouraging patients to speak with healthcare providers',
    keywords: ['speak to doctor', 'consult physician', 'medical advice', 'healthcare provider', 'HCP', 'discuss with doctor'],
  },
  'Contact HCP': {
    description: 'HCP locator tools and contact information',
    keywords: ['find doctor', 'locate physician', 'HCP locator', 'doctor near me', 'specialist finder', 'clinic locations'],
  },
  'CVD': {
    description: 'Cardiovascular disease and obesity-related heart conditions',
    keywords: ['cardiovascular', 'heart disease', 'blood pressure', 'cholesterol', 'stroke', 'heart health', 'cardiac'],
  },
  'What is Obesity': {
    description: 'Educational content about obesity as a disease',
    keywords: ['obesity definition', 'overweight', 'adiposity', 'chronic disease', 'obesity causes', 'weight classifications'],
  },
  'BMI': {
    description: 'BMI calculators, charts, and body mass index information',
    keywords: ['BMI', 'body mass index', 'BMI calculator', 'weight calculator', 'BMI chart', 'BMI result', 'calculate BMI', 'IMC', 'indice de masse'],
  },
  'Menopause': {
    description: 'Obesity and weight management during menopause',
    keywords: ['menopause', 'hormonal changes', 'women health', 'perimenopause', 'post-menopausal', 'hormones'],
  },
  'Joint Pain': {
    description: 'Obesity-related joint problems and mobility issues',
    keywords: ['joint pain', 'arthritis', 'knee pain', 'mobility', 'orthopedic', 'back pain', 'inflammation'],
  },
  'Success Stories': {
    description: 'Patient testimonials and weight loss journeys',
    keywords: ['patient story', 'success story', 'testimonial', 'journey', 'transformation', 'real people', 'case study'],
  },
  'Diet & Exercise': {
    description: 'Lifestyle modifications for weight management',
    keywords: ['diet', 'nutrition', 'exercise', 'physical activity', 'lifestyle', 'healthy eating', 'workout', 'meal plan'],
  },
  'Treating Obesity': {
    description: 'Medical treatments and interventions for obesity',
    keywords: ['treatment', 'medication', 'wegovy', 'mounjaro', 'ozempic', 'surgery', 'bariatric', 'therapy', 'intervention'],
  },
  'General Information': {
    description: 'Other obesity-related content not fitting above categories',
    keywords: ['information', 'resources', 'support', 'FAQ', 'help', 'about'],
  },
} as const;

// Content types (separate from categories)
export const CONTENT_TYPES = {
  'article': 'Long-form educational content',
  'tool': 'Interactive tools like calculators',
  'video': 'Video content',
  'infographic': 'Visual information graphics',
  'homepage': 'Main landing pages',
  'navigation': 'Navigation and utility pages',
  'form': 'Contact or registration forms',
  'news': 'News and updates',
  'research': 'Scientific studies and research',
  'faq': 'Frequently asked questions',
} as const;

export type ContentCategory = keyof typeof CONTENT_CATEGORIES;
export type ContentType = keyof typeof CONTENT_TYPES;

interface CategorizationResult {
  category: ContentCategory;
  contentType: ContentType;
  confidence: number;
  keywords: string[];
  signals: {
    hasVideo: boolean;
    hasCalculator: boolean;
    hasForm: boolean;
    hasReferences: boolean;
    wordCount: number;
    readingTime: number; // in minutes
  };
}

/**
 * Categorize content using Gemini Flash 2.5
 */
export async function categorizeContent(
  content: string,
  title: string,
  url: string
): Promise<CategorizationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback to keyword-based categorization
    return fallbackCategorization(content, title, url);
  }

  // Note: categories and contentTypes are embedded in the prompt below
  // const categories = Object.keys(CONTENT_CATEGORIES).join(', ');
  // const contentTypes = Object.keys(CONTENT_TYPES).join(', ');
  
  const prompt = `Analyze this medical content and categorize it.

Title: ${title}
URL: ${url}
Content (first 3000 chars): ${content.substring(0, 3000)}

CATEGORIES (choose exactly ONE that best fits):
${Object.entries(CONTENT_CATEGORIES).map(([cat, info]) => `- ${cat}: ${info.description}`).join('\n')}

CONTENT TYPES (choose exactly ONE):
${Object.entries(CONTENT_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

Return a JSON object with:
{
  "category": "exact category name from list above",
  "contentType": "exact type from list above",
  "confidence": 0.0-1.0,
  "keywords": ["relevant", "keywords", "found"],
  "reasoning": "brief explanation of categorization"
}

IMPORTANT: 
- Choose exactly ONE category that best fits (MECE principle)
- If content discusses multiple topics, choose the PRIMARY focus
- Default to "General Information" only if no other category fits
- Be precise with category names`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent categorization
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return fallbackCategorization(content, title, url);
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    
    // Validate and ensure category exists
    const category = (result.category in CONTENT_CATEGORIES) 
      ? result.category as ContentCategory
      : 'General Information';
    
    const contentType = (result.contentType in CONTENT_TYPES)
      ? result.contentType as ContentType
      : detectContentType(url, content);

    // Extract signals
    const signals = extractSignals(content, url);

    return {
      category,
      contentType,
      confidence: result.confidence || 0.8,
      keywords: result.keywords || [],
      signals,
    };
  } catch (error) {
    console.error('Categorization error:', error);
    return fallbackCategorization(content, title, url);
  }
}

/**
 * Fallback categorization using keywords
 */
function fallbackCategorization(
  content: string,
  title: string,
  url: string
): CategorizationResult {
  const text = `${title} ${content}`.toLowerCase();
  let category: ContentCategory = 'General Information';
  let confidence = 0.5;
  const foundKeywords: string[] = [];

  // Check each category's keywords
  for (const [cat, info] of Object.entries(CONTENT_CATEGORIES)) {
    const matches = info.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (matches.length > foundKeywords.length) {
      category = cat as ContentCategory;
      confidence = Math.min(0.9, 0.5 + (matches.length * 0.1));
      foundKeywords.splice(0, foundKeywords.length, ...matches);
    }
  }

  // Special case: prioritize specific categories if strong signals
  if (text.includes('bmi calculator') || text.includes('body mass index') || text.includes('calculate bmi') || url.includes('/bmi') || url.includes('imc')) {
    category = 'BMI';
    confidence = 0.95;
  } else if (text.includes('find a doctor') || text.includes('locate physician')) {
    category = 'Contact HCP';
    confidence = 0.95;
  } else if (text.includes('speak to your doctor') || text.includes('consult your physician')) {
    category = 'HCP: Speak to Dr';
    confidence = 0.95;
  }

  const contentType = detectContentType(url, content);
  const signals = extractSignals(content, url);

  return {
    category,
    contentType,
    confidence,
    keywords: foundKeywords,
    signals,
  };
}

/**
 * Detect content type from URL and content
 */
function detectContentType(url: string, content: string): ContentType {
  const urlLower = url.toLowerCase();
  const contentLower = content.toLowerCase();

  // Check URL patterns
  if (urlLower.includes('/article') || urlLower.includes('/blog') || urlLower.includes('/news')) {
    return 'article';
  }
  if (urlLower.includes('/calculator') || urlLower.includes('/tool')) {
    return 'tool';
  }
  if (urlLower.includes('/video') || contentLower.includes('video') || contentLower.includes('watch')) {
    return 'video';
  }
  if (urlLower === '/' || urlLower.endsWith('/index') || urlLower.endsWith('/home')) {
    return 'homepage';
  }
  if (urlLower.includes('/faq') || urlLower.includes('/questions')) {
    return 'faq';
  }
  if (urlLower.includes('/research') || urlLower.includes('/study')) {
    return 'research';
  }
  if (urlLower.includes('/contact') || urlLower.includes('/form')) {
    return 'form';
  }

  // Check content length for articles
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 500) {
    return 'article';
  }

  return 'navigation';
}

/**
 * Extract signals from content
 */
function extractSignals(content: string, url: string) {
  const contentLower = content.toLowerCase();
  const wordCount = content.split(/\s+/).length;
  
  return {
    hasVideo: contentLower.includes('video') || contentLower.includes('watch'),
    hasCalculator: contentLower.includes('calculator') || contentLower.includes('calculate') || url.includes('calculator'),
    hasForm: contentLower.includes('<form') || contentLower.includes('submit'),
    hasReferences: contentLower.includes('reference') || contentLower.includes('citation') || contentLower.includes('[1]'),
    wordCount,
    readingTime: Math.ceil(wordCount / 200), // Average reading speed
  };
}

/**
 * Batch categorize multiple pages
 */
export async function batchCategorize(
  pages: Array<{ content: string; title: string; url: string }>
): Promise<CategorizationResult[]> {
  const results: CategorizationResult[] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    const batchPromises = batch.map(page => 
      categorizeContent(page.content, page.title, page.url)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < pages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Get category statistics for analytics
 */
export function getCategoryStats(categories: ContentCategory[]): Record<ContentCategory, number> {
  const stats = {} as Record<ContentCategory, number>;
  
  // Initialize all categories with 0
  for (const cat of Object.keys(CONTENT_CATEGORIES) as ContentCategory[]) {
    stats[cat] = 0;
  }
  
  // Count occurrences
  for (const cat of categories) {
    if (cat in stats) {
      stats[cat]++;
    }
  }
  
  return stats;
}