/**
 * AI Detection Checker
 * Analyzes copy for AI-generated content red flags
 * Returns score 0-10 (0 = human, 10 = obviously AI)
 */

export interface AIDetectionResult {
  score: number; // 0-10
  warnings: string[];
  suggestions: string[];
}

const FORBIDDEN_PHRASES = [
  'embark on a journey',
  'delve into',
  'dive deep',
  'unlock the secrets',
  'game-changer',
  'revolutionary',
  'transform your life',
  'at the end of the day',
  "in today's world",
  "in today's landscape",
  "in today's digital age",
  'needless to say',
  "it's worth noting that",
  "let's be honest",
  'picture this',
  'imagine this',
  'the bottom line is',
  'in conclusion',
  'harness the power',
  'leverage the',
  'in essence',
  'moreover',
  'furthermore',
  'it is important to note',
  'it goes without saying',
];

const AI_PATTERNS = [
  /here's what/gi,
  /here are/gi,
  /let me know your thoughts/gi,
  /feel free to/gi,
  /don't hesitate to/gi,
  /i hope this helps/gi,
  /i'd be happy to/gi,
  /certainly!/gi,
  /absolutely!/gi,
  /great question/gi,
];

const QUALIFIER_WORDS = [
  'really',
  'very',
  'actually',
  'literally',
  'powerful',
  'amazing',
  'incredible',
  'game-changing',
  'transformative',
  'revolutionary',
];

/**
 * Analyze text for AI detection red flags
 */
export function checkAIDetection(text: string): AIDetectionResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const lowerText = text.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  // Check forbidden phrases
  FORBIDDEN_PHRASES.forEach((phrase) => {
    if (lowerText.includes(phrase)) {
      score += 2;
      warnings.push(`Contains AI phrase: "${phrase}"`);
      suggestions.push(`Remove or rephrase: "${phrase}"`);
    }
  });

  // Check AI patterns
  AI_PATTERNS.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      score += 1;
      warnings.push(`Generic AI pattern: "${matches[0]}"`);
      suggestions.push(`Rephrase or remove: "${matches[0]}"`);
    }
  });

  // Check exclamation overuse
  const exclamations = (text.match(/!/g) || []).length;
  if (sentences.length > 0 && exclamations > sentences.length * 0.3) {
    score += 1;
    warnings.push('Too many exclamation points');
    suggestions.push('Use exclamations more sparingly (max 1 per 3-4 sentences)');
  }

  // Check em dash overuse
  const emDashes = (text.match(/—|–/g) || []).length;
  if (paragraphs.length > 0 && emDashes > paragraphs.length * 2) {
    score += 1;
    warnings.push('Too many em dashes');
    suggestions.push('Maximum 2 em dashes per paragraph');
  }

  // Check parenthetical overuse
  const parentheticals = (text.match(/\([^)]+\)/g) || []).length;
  if (paragraphs.length > 0 && parentheticals > paragraphs.length) {
    score += 1;
    warnings.push('Too many parentheticals');
    suggestions.push('Maximum 1 parenthetical per paragraph');
  }

  // Check qualifier word overuse
  const qualifierCount = QUALIFIER_WORDS.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);

  if (sentences.length > 0 && qualifierCount > sentences.length * 0.2) {
    score += 1;
    warnings.push('Too many qualifier words (really, very, actually, etc.)');
    suggestions.push('Remove unnecessary qualifiers - be direct');
  }

  // Check for triple adjectives pattern (AI tell)
  const tripleAdjectivePattern = /\b\w+,\s+\w+,\s+(and\s+)?\w+\b/g;
  if (tripleAdjectivePattern.test(text)) {
    score += 1;
    warnings.push('Multiple adjectives in sequence (common AI pattern)');
    suggestions.push('Use single, strong adjectives instead of lists');
  }

  // Check sentence variety
  if (sentences.length > 3) {
    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
    const variance = calculateVariance(sentenceLengths);

    if (variance < 10) {
      score += 1;
      warnings.push('Sentences are too uniform in length');
      suggestions.push('Vary sentence length: short (3-7 words), medium (8-15), long (16-25)');
    }
  }

  // Check for colon overuse in setups
  const colonSetups = (text.match(/:\s*\n|:\s*$/gm) || []).length;
  if (colonSetups > 2) {
    score += 1;
    warnings.push('Too many colon setups');
    suggestions.push('Vary your sentence structures - not every point needs a colon setup');
  }

  // Check for bullet/list overuse relative to prose
  const bullets = (text.match(/^[\s]*[-•*]\s/gm) || []).length;
  const proseWords = text.replace(/^[\s]*[-•*].*/gm, '').split(/\s+/).length;
  if (bullets > 5 && proseWords < bullets * 20) {
    score += 1;
    warnings.push('Too many bullet points relative to prose');
    suggestions.push('Balance lists with conversational paragraphs');
  }

  // Cap score at 10
  score = Math.min(10, Math.max(0, score));

  return { score, warnings, suggestions };
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Get a human-readable assessment based on score
 */
export function getAIDetectionAssessment(score: number): {
  level: 'excellent' | 'good' | 'warning' | 'danger';
  label: string;
  description: string;
} {
  if (score <= 1) {
    return {
      level: 'excellent',
      label: 'Excellent',
      description: 'Sounds completely human',
    };
  } else if (score <= 3) {
    return {
      level: 'good',
      label: 'Good',
      description: 'Mostly human, minor tweaks suggested',
    };
  } else if (score <= 5) {
    return {
      level: 'warning',
      label: 'Needs Work',
      description: 'Some AI patterns detected - review suggestions',
    };
  } else {
    return {
      level: 'danger',
      label: 'High Risk',
      description: 'Multiple AI tells - significant rewrite needed',
    };
  }
}
