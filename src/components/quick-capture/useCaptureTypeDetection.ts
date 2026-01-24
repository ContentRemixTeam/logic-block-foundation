export type CaptureType = 'task' | 'idea' | 'content' | 'income' | 'expense';

export interface ParsedTask {
  text: string;
  date?: Date;
  time?: string;
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
  duration?: number;
  projectId?: string;
}

export interface DetectionResult {
  suggestedType: CaptureType;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

// Action verbs that suggest a task
const ACTION_VERBS = [
  'call', 'write', 'send', 'finish', 'record', 'edit', 'post', 'schedule',
  'email', 'meet', 'review', 'create', 'update', 'fix', 'check', 'submit',
  'prepare', 'buy', 'book', 'cancel', 'follow', 'contact', 'complete',
  'start', 'begin', 'organize', 'plan', 'setup', 'set up', 'make', 'do'
];

// Idea-related phrases
const IDEA_PHRASES = [
  'idea', 'content idea', 'offer idea', 'brain dump', 'brainstorm',
  'what if', 'maybe', 'could try', 'concept', 'thought about',
  'inspiration', 'consider', 'explore', 'potential'
];

// Income-related phrases
const INCOME_PHRASES = [
  'sold', 'revenue', 'earned', 'payment received', 'income', 'sale',
  'client paid', 'got paid', 'received', 'deposit', 'refund received'
];

// Expense-related phrases
const EXPENSE_PHRASES = [
  'spent', 'paid', 'bought', 'subscription', 'cost', 'expense',
  'purchase', 'bill', 'fee', 'charged', 'payment for'
];

// Time/date patterns that suggest tasks
const TIME_DATE_PATTERNS = [
  /\btoday\b/i,
  /\btomorrow\b/i,
  /\bnext week\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i,
  /\b\d+(m|h|min|hr|hour)\b/i,
  /!(high|med|medium|low)/i,
];

// Currency pattern (e.g., $50, $100.00)
const CURRENCY_PATTERN = /^\$\d+(\.\d{2})?/;

/**
 * Enhanced detection with confidence scoring
 */
export function detectCaptureTypeWithConfidence(input: string): DetectionResult {
  const trimmed = input.trim().toLowerCase();
  
  // Explicit markers - high confidence
  if (trimmed.startsWith('#idea') || trimmed.startsWith('idea:')) {
    return { suggestedType: 'idea', confidence: 'high', reason: 'Explicit idea marker' };
  }
  
  if (trimmed.startsWith('#income') || trimmed.startsWith('income:')) {
    return { suggestedType: 'income', confidence: 'high', reason: 'Explicit income marker' };
  }
  
  if (trimmed.startsWith('#expense') || trimmed.startsWith('expense:')) {
    return { suggestedType: 'expense', confidence: 'high', reason: 'Explicit expense marker' };
  }
  
  // Check for currency at start (likely financial)
  if (CURRENCY_PATTERN.test(trimmed)) {
    // Check context for income vs expense
    const hasIncomePhrase = INCOME_PHRASES.some(phrase => trimmed.includes(phrase));
    const hasExpensePhrase = EXPENSE_PHRASES.some(phrase => trimmed.includes(phrase));
    
    if (hasIncomePhrase) {
      return { suggestedType: 'income', confidence: 'high', reason: 'Currency with income context' };
    }
    if (hasExpensePhrase) {
      return { suggestedType: 'expense', confidence: 'high', reason: 'Currency with expense context' };
    }
    // Default currency to expense (more common)
    return { suggestedType: 'expense', confidence: 'medium', reason: 'Currency pattern detected' };
  }
  
  // Check for income phrases
  const hasIncomePhrase = INCOME_PHRASES.some(phrase => trimmed.includes(phrase));
  if (hasIncomePhrase) {
    return { suggestedType: 'income', confidence: 'medium', reason: 'Contains income-related phrase' };
  }
  
  // Check for expense phrases
  const hasExpensePhrase = EXPENSE_PHRASES.some(phrase => trimmed.includes(phrase));
  if (hasExpensePhrase) {
    return { suggestedType: 'expense', confidence: 'medium', reason: 'Contains expense-related phrase' };
  }
  
  // Check for idea phrases
  const hasIdeaPhrase = IDEA_PHRASES.some(phrase => trimmed.includes(phrase));
  if (hasIdeaPhrase) {
    return { suggestedType: 'idea', confidence: 'medium', reason: 'Contains idea-related phrase' };
  }
  
  // Check for time/date patterns - suggests task
  const hasTimeDate = TIME_DATE_PATTERNS.some(pattern => pattern.test(trimmed));
  if (hasTimeDate) {
    return { suggestedType: 'task', confidence: 'high', reason: 'Contains time/date pattern' };
  }
  
  // Check for action verbs at the start
  const firstWord = trimmed.split(/\s+/)[0];
  const startsWithAction = ACTION_VERBS.some(verb => 
    firstWord === verb || firstWord === verb + 's' || firstWord === verb + 'ing'
  );
  if (startsWithAction) {
    return { suggestedType: 'task', confidence: 'medium', reason: 'Starts with action verb' };
  }
  
  // Default to task with low confidence
  return { suggestedType: 'task', confidence: 'low', reason: 'Default' };
}

/**
 * Simple detection for backwards compatibility
 */
export function detectCaptureType(input: string): CaptureType {
  return detectCaptureTypeWithConfidence(input).suggestedType;
}

/**
 * Removes the idea prefix from input if present
 */
export function cleanIdeaInput(input: string): string {
  let cleaned = input.trim();
  
  // Remove #idea prefix
  if (cleaned.toLowerCase().startsWith('#idea')) {
    cleaned = cleaned.slice(5).trim();
  }
  // Remove idea: prefix
  else if (cleaned.toLowerCase().startsWith('idea:')) {
    cleaned = cleaned.slice(5).trim();
  }
  
  return cleaned;
}

/**
 * Parse natural language input for task creation
 * Reuses logic from TaskQuickAdd
 */
export function parseTaskInput(text: string): ParsedTask {
  const result: ParsedTask = { text: text, tags: [] };
  let cleanText = text;

  // Extract tags (#tag)
  const tagMatches = cleanText.match(/#(\w+)/g);
  if (tagMatches) {
    result.tags = tagMatches.map(t => t.slice(1));
    cleanText = cleanText.replace(/#\w+/g, '').trim();
  }

  // Extract priority (!high, !med, !low)
  const priorityMatch = cleanText.match(/!(high|med|medium|low)/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    result.priority = p === 'med' ? 'medium' : p as 'high' | 'medium' | 'low';
    cleanText = cleanText.replace(/!(high|med|medium|low)/i, '').trim();
  }

  // Extract duration (30m, 1h, 2h, etc.)
  const durationMatch = cleanText.match(/(\d+)(m|h|min|hr|hour)/i);
  if (durationMatch) {
    const num = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    result.duration = unit.startsWith('h') ? num * 60 : num;
    cleanText = cleanText.replace(/\d+(m|h|min|hr|hour)/i, '').trim();
  }

  // Extract date keywords
  const today = new Date();
  if (/\btoday\b/i.test(cleanText)) {
    result.date = today;
    cleanText = cleanText.replace(/\btoday\b/i, '').trim();
  } else if (/\btomorrow\b/i.test(cleanText)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.date = tomorrow;
    cleanText = cleanText.replace(/\btomorrow\b/i, '').trim();
  } else if (/\bnext week\b/i.test(cleanText)) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    result.date = nextWeek;
    cleanText = cleanText.replace(/\bnext week\b/i, '').trim();
  } else {
    // Check for weekday names
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekdayMatch = cleanText.match(new RegExp(`\\b(${weekdays.join('|')})\\b`, 'i'));
    if (weekdayMatch) {
      const targetDay = weekdays.indexOf(weekdayMatch[1].toLowerCase());
      const currentDay = today.getDay();
      // Convert Sunday = 0 to Sunday = 6 for easier calculation
      const currentDayMondayBased = currentDay === 0 ? 6 : currentDay - 1;
      let daysToAdd = targetDay - currentDayMondayBased;
      if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      result.date = targetDate;
      cleanText = cleanText.replace(new RegExp(`\\b${weekdayMatch[1]}\\b`, 'i'), '').trim();
    }
  }

  // Extract time (2pm, 14:00, etc.)
  const timeMatch = cleanText.match(/\b(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i);
  if (timeMatch) {
    result.time = timeMatch[0];
    cleanText = cleanText.replace(timeMatch[0], '').trim();
  }

  // Clean up multiple spaces
  result.text = cleanText.replace(/\s+/g, ' ').trim();

  return result;
}
