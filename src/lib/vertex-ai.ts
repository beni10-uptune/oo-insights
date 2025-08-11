import { HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { vertexAI } from './vertex-ai-init';

// Model configurations - Reading from env variables
// Using Gemini 1.5 Pro as stable fallback if 2.5 not available
const MODELS = {
  GEMINI_PRO: 'gemini-1.5-pro-002',  // Latest stable Gemini Pro
  GEMINI_FLASH: 'gemini-1.5-flash-002', // Latest stable Gemini Flash
  EMBEDDING: 'text-embedding-004',
};

// Log which models we're using
console.log('Vertex AI Models:', {
  pro: MODELS.GEMINI_PRO,
  flash: MODELS.GEMINI_FLASH,
  embedding: MODELS.EMBEDDING,
});

// Safety settings for medical content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Generation config
const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

/**
 * Generate text using Gemini Pro
 */
export async function generateText(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    useFlash?: boolean;
  } = {}
): Promise<string> {
  try {
    const model = vertexAI.preview.getGenerativeModel({
      model: options.useFlash ? MODELS.GEMINI_FLASH : MODELS.GEMINI_PRO,
      generationConfig: {
        ...generationConfig,
        temperature: options.temperature || generationConfig.temperature,
        maxOutputTokens: options.maxTokens || generationConfig.maxOutputTokens,
      },
      safetySettings,
    });

    const fullPrompt = options.systemPrompt 
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No response from Gemini');
    }

    return response.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Vertex AI generation error:', error);
    throw error;
  }
}

/**
 * Generate embeddings for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = vertexAI.preview.getGenerativeModel({
      model: MODELS.EMBEDDING,
    });

    const result = await model.embedContent({
      content: { parts: [{ text }] },
    });

    return result.embedding.values;
  } catch (error) {
    console.error('Vertex AI embedding error:', error);
    throw error;
  }
}

/**
 * Summarize content with medical compliance
 */
export async function summarizeContent(
  content: string,
  options: {
    market?: string;
    language?: string;
    maxLength?: number;
  } = {}
): Promise<string> {
  const systemPrompt = `You are a medical content summarizer for truthaboutweight.global.
Market: ${options.market || 'Global'}
Language: ${options.language || 'English'}

CRITICAL COMPLIANCE RULES:
- NO medical claims or advice
- NO treatment recommendations
- ONLY cite approved sources
- Use approved terminology: "obesity medication" not "weight loss drug"
- Include disclaimers where appropriate

Summarize the following content in ${options.maxLength || 200} words:`;

  return generateText(content, {
    systemPrompt,
    temperature: 0.3, // Lower temperature for more consistent summaries
    useFlash: true, // Use Flash for faster response
  });
}

/**
 * Classify content topics
 */
export async function classifyTopics(
  content: string,
  availableTopics: string[]
): Promise<string[]> {
  const prompt = `Classify the following content into relevant topics.
Available topics: ${availableTopics.join(', ')}

Content: ${content}

Return ONLY a comma-separated list of relevant topics, nothing else:`;

  const response = await generateText(prompt, {
    temperature: 0.1, // Very low temperature for consistent classification
    maxTokens: 100,
    useFlash: true,
  });

  return response.split(',').map(topic => topic.trim()).filter(Boolean);
}

/**
 * Generate search keywords
 */
export async function generateSearchKeywords(
  topic: string,
  market: string
): Promise<string[]> {
  const prompt = `Generate 10 relevant search keywords for:
Topic: ${topic}
Market: ${market}
Context: Obesity medication marketing (Wegovy, Mounjaro, Ozempic)

Return ONLY a comma-separated list of keywords:`;

  const response = await generateText(prompt, {
    temperature: 0.5,
    maxTokens: 200,
    useFlash: true,
  });

  return response.split(',').map(keyword => keyword.trim()).filter(Boolean);
}

/**
 * Analyze competitor content
 */
export async function analyzeCompetitorContent(
  content: string,
  ourBrand: string = 'truthaboutweight.global'
): Promise<{
  keyMessages: string[];
  targetAudience: string;
  callToActions: string[];
  differentiators: string[];
}> {
  const prompt = `Analyze this competitor content for marketing insights:

${content}

Compare to our brand: ${ourBrand}

Provide a JSON response with:
- keyMessages: array of main messages
- targetAudience: description of target audience
- callToActions: array of CTAs found
- differentiators: array of unique selling points

Return ONLY valid JSON:`;

  const response = await generateText(prompt, {
    temperature: 0.2,
    maxTokens: 1000,
  });

  try {
    return JSON.parse(response);
  } catch {
    // Fallback if JSON parsing fails
    return {
      keyMessages: [],
      targetAudience: 'Unknown',
      callToActions: [],
      differentiators: [],
    };
  }
}

/**
 * Generate localized content
 */
export async function localizeContent(
  content: string,
  fromMarket: string,
  toMarket: string,
  language: string
): Promise<string> {
  const marketGuides: Record<string, string> = {
    'UK': 'British English, NHS terminology, MHRA regulations',
    'CA': 'Canadian English/French, Health Canada regulations',
    'BE-NL': 'Dutch, FAMHP regulations',
    'BE-FR': 'French, FAMHP regulations',
    'CH-DE': 'Swiss German, Swissmedic regulations',
    'CH-FR': 'Swiss French, Swissmedic regulations',
    'CH-IT': 'Italian, Swissmedic regulations',
  };

  const prompt = `Localize this content from ${fromMarket} to ${toMarket}:

Original content: ${content}

Target market requirements: ${marketGuides[toMarket] || 'Standard compliance'}
Target language: ${language}

Maintain medical compliance and approved terminology.
Adapt cultural references appropriately.

Localized content:`;

  return generateText(prompt, {
    temperature: 0.3,
    systemPrompt: 'You are a medical marketing localization expert.',
  });
}

const vertexAIHelpers = {
  generateText,
  generateEmbedding,
  summarizeContent,
  classifyTopics,
  generateSearchKeywords,
  analyzeCompetitorContent,
  localizeContent,
};

export default vertexAIHelpers;