/**
 * Simple translation fallback when AI is unavailable
 * This provides basic translations for common content
 */

const COMMON_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    "obésité": "obesity",
    "traitement": "treatment",
    "patient": "patient",
    "médecin": "doctor",
    "santé": "health",
    "poids": "weight",
    "maladie": "disease",
    "risque": "risk",
    "étude": "study",
    "nouvelle": "new",
    "recherche": "research",
  },
  it: {
    "obesità": "obesity",
    "trattamento": "treatment",
    "paziente": "patient",
    "medico": "doctor",
    "salute": "health",
    "peso": "weight",
    "malattia": "disease",
    "rischio": "risk",
    "studio": "study",
    "nuovo": "new",
    "ricerca": "research",
  },
  es: {
    "obesidad": "obesity",
    "tratamiento": "treatment",
    "paciente": "patient",
    "médico": "doctor",
    "salud": "health",
    "peso": "weight",
    "enfermedad": "disease",
    "riesgo": "risk",
    "estudio": "study",
    "nuevo": "new",
    "investigación": "research",
  },
  de: {
    "adipositas": "obesity",
    "übergewicht": "overweight",
    "behandlung": "treatment",
    "patient": "patient",
    "arzt": "doctor",
    "gesundheit": "health",
    "gewicht": "weight",
    "krankheit": "disease",
    "risiko": "risk",
    "studie": "study",
    "neu": "new",
    "forschung": "research",
  },
};

/**
 * Extract key topics from content
 */
export function extractKeyTopics(content: string, language: string): string[] {
  const topics: string[] = [];
  const translations = COMMON_TRANSLATIONS[language] || {};
  
  const contentLower = content.toLowerCase();
  
  // Check for medical terms
  if (contentLower.includes('obesit') || contentLower.includes('adiposit')) {
    topics.push('obesity');
  }
  if (contentLower.includes('wegovy') || contentLower.includes('mounjaro') || contentLower.includes('ozempic')) {
    topics.push('medication');
  }
  if (contentLower.includes('treatment') || contentLower.includes('traitement') || contentLower.includes('trattamento')) {
    topics.push('treatment');
  }
  if (contentLower.includes('patient') || contentLower.includes('paziente')) {
    topics.push('patient resources');
  }
  if (contentLower.includes('study') || contentLower.includes('étude') || contentLower.includes('studio')) {
    topics.push('research');
  }
  
  return topics;
}

/**
 * Generate a simple English summary based on content structure
 */
export function generateSimpleEnglishSummary(
  content: string,
  title: string,
  language: string
): string {
  // If content is already in English, return first 200 chars
  if (language === 'en' || language.startsWith('en-')) {
    const cleaned = content.replace(/<[^>]*>/g, '').trim();
    return cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : '');
  }
  
  // Extract topics
  const topics = extractKeyTopics(content, language);
  
  // Build a basic summary
  const marketName = getMarketNameFromLanguage(language);
  
  if (topics.includes('obesity') && topics.includes('treatment')) {
    return `This ${marketName} page discusses obesity treatment options and medical approaches to weight management.`;
  }
  
  if (topics.includes('medication')) {
    return `This ${marketName} page provides information about weight management medications and their usage.`;
  }
  
  if (topics.includes('patient resources')) {
    return `This ${marketName} page offers resources and support information for patients dealing with obesity.`;
  }
  
  if (topics.includes('research')) {
    return `This ${marketName} page presents research findings and studies related to obesity and weight management.`;
  }
  
  // Default fallback
  return `This ${marketName} page contains information about obesity, its treatment, and related health topics.`;
}

/**
 * Get market name from language code
 */
function getMarketNameFromLanguage(language: string): string {
  const marketMap: Record<string, string> = {
    'fr': 'French',
    'it': 'Italian',
    'es': 'Spanish',
    'de': 'German',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
  };
  
  return marketMap[language] || 'European';
}

/**
 * Fallback translation when AI is unavailable
 */
export function fallbackTranslate(
  content: string,
  title: string,
  language: string
): { original: string; english: string } {
  // Get first 200 chars of content for original summary
  const cleanContent = content.replace(/<[^>]*>/g, '').trim();
  const original = cleanContent.substring(0, 200) + (cleanContent.length > 200 ? '...' : '');
  
  // Generate simple English summary
  const english = generateSimpleEnglishSummary(content, title, language);
  
  return {
    original,
    english,
  };
}