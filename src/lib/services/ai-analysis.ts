import { VertexAI } from '@google-cloud/vertexai';

// Initialize Vertex AI
let vertexAI: VertexAI | null = null;

function getVertexAI() {
  if (!vertexAI) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = 'us-central1';
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
    }
    
    vertexAI = new VertexAI({
      project: projectId,
      location,
    });
  }
  
  return vertexAI;
}

// Content categories for classification
export const CONTENT_CATEGORIES = {
  'Disease Education': [
    'Understanding Obesity',
    'Causes & Risk Factors',
    'Health Complications',
    'BMI & Diagnosis',
    'Genetics & Biology',
  ],
  'Treatment Options': [
    'Medical Treatments',
    'Surgical Options',
    'Lifestyle Modifications',
    'Medication Information',
    'Treatment Guidelines',
  ],
  'Patient Support': [
    'Patient Stories',
    'Support Resources',
    'Healthcare Provider Finder',
    'Insurance & Coverage',
    'FAQ & Help',
  ],
  'News & Updates': [
    'Medical News',
    'Research Updates',
    'Clinical Trials',
    'Policy Changes',
    'Events & Webinars',
  ],
  'Tools & Resources': [
    'BMI Calculator',
    'Risk Assessment',
    'Downloadable Materials',
    'Videos & Media',
    'Mobile Apps',
  ],
};

interface SummarizationResult {
  original: string;  // Summary in original language
  english: string;   // English translation if needed
}

interface ClassificationResult {
  category: string;
  subcategory: string;
  confidence: number;
  signals: {
    hasHcpInfo: boolean;
    hasTreatmentInfo: boolean;
    hasPatientStory: boolean;
    hasCalculator: boolean;
    hasVideo: boolean;
    hasDownload: boolean;
    isNews: boolean;
  };
  hasHcpLocator: boolean;
}

/**
 * Summarize content in original language and provide English translation
 */
export async function summarizeContent(
  content: string,
  language: string
): Promise<SummarizationResult> {
  try {
    const vertex = getVertexAI();
    const model = vertex.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    // Prepare prompts based on language
    const isEnglish = language === 'en' || language.startsWith('en-');
    
    const prompt = isEnglish
      ? `Summarize this medical content about obesity in 2-3 sentences. Focus on the key message and any actionable information:\n\n${content.substring(0, 3000)}`
      : `Please provide two summaries of this medical content about obesity:
        1. A 2-3 sentence summary in ${language} (the original language)
        2. A 2-3 sentence summary in English
        
        Focus on the key message and any actionable information.
        
        Content: ${content.substring(0, 3000)}
        
        Format your response as:
        ORIGINAL: [summary in original language]
        ENGLISH: [summary in English]`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    if (isEnglish) {
      return {
        original: response.trim(),
        english: response.trim(),
      };
    } else {
      // Parse the two summaries
      const originalMatch = response.match(/ORIGINAL:\s*(.*?)(?=ENGLISH:|$)/s);
      const englishMatch = response.match(/ENGLISH:\s*(.*?)$/s);
      
      return {
        original: originalMatch?.[1]?.trim() || response.trim(),
        english: englishMatch?.[1]?.trim() || 'Summary not available',
      };
    }
  } catch (error) {
    console.error('Summarization failed:', error);
    throw error;
  }
}

/**
 * Classify content into categories and detect signals
 */
export async function classifyContent(
  content: string
): Promise<ClassificationResult> {
  try {
    const vertex = getVertexAI();
    const model = vertex.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const categoriesStr = Object.entries(CONTENT_CATEGORIES)
      .map(([cat, subs]) => `${cat}: ${subs.join(', ')}`)
      .join('\n');

    const prompt = `Analyze this medical website content and provide classification:

Content: ${content.substring(0, 4000)}

Categories to choose from:
${categoriesStr}

Detect these signals (true/false):
- hasHcpInfo: Contains healthcare provider information or finder
- hasTreatmentInfo: Discusses treatment options
- hasPatientStory: Contains patient testimonials or stories  
- hasCalculator: Has interactive calculators (BMI, risk assessment, etc.)
- hasVideo: Contains video content
- hasDownload: Offers downloadable resources
- isNews: Is a news article or update
- hasHcpLocator: Has a healthcare provider search/locator tool

Respond in JSON format:
{
  "category": "main category",
  "subcategory": "specific subcategory",
  "confidence": 0.0-1.0,
  "signals": {
    "hasHcpInfo": boolean,
    "hasTreatmentInfo": boolean,
    "hasPatientStory": boolean,
    "hasCalculator": boolean,
    "hasVideo": boolean,
    "hasDownload": boolean,
    "isNews": boolean
  },
  "hasHcpLocator": boolean
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || 'Uncategorized',
        subcategory: parsed.subcategory || 'General',
        confidence: parsed.confidence || 0.5,
        signals: parsed.signals || {
          hasHcpInfo: false,
          hasTreatmentInfo: false,
          hasPatientStory: false,
          hasCalculator: false,
          hasVideo: false,
          hasDownload: false,
          isNews: false,
        },
        hasHcpLocator: parsed.hasHcpLocator || parsed.signals?.hasHcpInfo || false,
      };
    }

    // Fallback if JSON parsing fails
    return {
      category: 'Uncategorized',
      subcategory: 'General',
      confidence: 0,
      signals: {
        hasHcpInfo: false,
        hasTreatmentInfo: false,
        hasPatientStory: false,
        hasCalculator: false,
        hasVideo: false,
        hasDownload: false,
        isNews: false,
      },
      hasHcpLocator: false,
    };
  } catch (error) {
    console.error('Classification failed:', error);
    // Return default classification on error
    return {
      category: 'Uncategorized',
      subcategory: 'General',
      confidence: 0,
      signals: {
        hasHcpInfo: false,
        hasTreatmentInfo: false,
        hasPatientStory: false,
        hasCalculator: false,
        hasVideo: false,
        hasDownload: false,
        isNews: false,
      },
      hasHcpLocator: false,
    };
  }
}

/**
 * Extract key insights from multiple pages
 */
export async function extractInsights(
  pages: Array<{ content: string; url: string; title: string }>
): Promise<{
  keyThemes: string[];
  recommendations: string[];
  opportunities: string[];
}> {
  try {
    const vertex = getVertexAI();
    const model = vertex.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const contentSample = pages
      .slice(0, 5)
      .map(p => `Title: ${p.title}\nURL: ${p.url}\nContent: ${p.content.substring(0, 500)}`)
      .join('\n---\n');

    const prompt = `Analyze these obesity education website pages and extract insights:

${contentSample}

Provide:
1. Key themes (3-5 main topics covered)
2. Recommendations (2-3 suggestions for improvement)
3. Opportunities (2-3 content gaps or opportunities)

Format as JSON:
{
  "keyThemes": ["theme1", "theme2"],
  "recommendations": ["rec1", "rec2"],
  "opportunities": ["opp1", "opp2"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      keyThemes: [],
      recommendations: [],
      opportunities: [],
    };
  } catch (error) {
    console.error('Insight extraction failed:', error);
    return {
      keyThemes: [],
      recommendations: [],
      opportunities: [],
    };
  }
}