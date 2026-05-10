import { routeForLine, type CaptureDestination } from '@/lib/captureTags';

export type CaptureType = 'task' | 'idea' | 'note' | 'project' | 'content' | 'question' | 'reminder';

export type EnergyLevel = 'low_energy' | 'medium' | 'high_focus';

export interface ParsedTask {
  text: string;
  date?: Date | null;
  time?: string | null;
  tags: string[];
  priority?: 'high' | 'medium' | 'low' | null;
  duration?: number | null;
  projectId?: string | null;
  energy_level?: EnergyLevel | null;
}

export interface DetectionResult {
  suggestedType: CaptureType;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

const ACTION_VERBS = [
  'call', 'write', 'send', 'finish', 'record', 'edit', 'post', 'schedule',
  'email', 'meet', 'review', 'create', 'update', 'fix', 'check', 'submit',
  'prepare', 'buy', 'book', 'cancel', 'follow', 'contact', 'complete',
  'start', 'begin', 'organize', 'plan', 'setup', 'set up', 'make', 'do'
];

const IDEA_PHRASES = [
  'idea', 'content idea', 'offer idea', 'brain dump', 'brainstorm',
  'what if', 'maybe', 'could try', 'concept', 'thought about',
  'inspiration', 'consider', 'explore', 'potential'
];

// Strict time pattern: requires am/pm OR H:MM colon. Bare numbers are NOT time.
const TIME_REGEX = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i;

const TIME_DATE_PATTERNS = [
  /\btoday\b/i,
  /\btomorrow\b/i,
  /\bnext week\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  TIME_REGEX,
  /\b\d+(m|h|min|hr|hour)\b/i,
  /!(high|med|medium|low)/i,
];

// Routing destination -> capture type for the modal
const DESTINATION_TO_TYPE: Record<CaptureDestination, CaptureType> = {
  task: 'task',
  idea: 'idea',
  note: 'note',
  project: 'project',
};

/**
 * Use shared tag registry to determine capture type from explicit tags.
 * Returns null if no destination tag is present.
 */
export function detectTypeFromTags(input: string): CaptureType | null {
  const routed = routeForLine(input, 'note');
  if (routed.routingTag) {
    return DESTINATION_TO_TYPE[routed.destination];
  }
  return null;
}

export function detectCaptureTypeWithConfidence(input: string): DetectionResult {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return { suggestedType: 'task', confidence: 'low', reason: 'Empty input' };
  }

  // Explicit tag routing wins
  const tagged = detectTypeFromTags(input);
  if (tagged) {
    return { suggestedType: tagged, confidence: 'high', reason: 'Explicit destination tag' };
  }

  if (trimmed.startsWith('idea:')) {
    return { suggestedType: 'idea', confidence: 'high', reason: 'idea: prefix' };
  }

  // Idea phrases
  const hasIdeaPhrase = IDEA_PHRASES.some(p => trimmed.includes(p));
  if (hasIdeaPhrase) {
    return { suggestedType: 'idea', confidence: 'medium', reason: 'Contains idea phrase' };
  }

  // Time/date strongly suggests task
  if (TIME_DATE_PATTERNS.some(p => p.test(trimmed))) {
    return { suggestedType: 'task', confidence: 'high', reason: 'Time/date pattern' };
  }

  // Action verb at start
  const firstWord = trimmed.split(/\s+/)[0];
  if (ACTION_VERBS.some(v => firstWord === v || firstWord === v + 's' || firstWord === v + 'ing')) {
    return { suggestedType: 'task', confidence: 'medium', reason: 'Action verb' };
  }

  // Low confidence -> note (gentle inbox), not task
  return { suggestedType: 'note', confidence: 'low', reason: 'Default to note inbox' };
}

export function detectCaptureType(input: string): CaptureType {
  return detectCaptureTypeWithConfidence(input).suggestedType;
}

export function cleanIdeaInput(input: string): string {
  let cleaned = input.trim();
  if (cleaned.toLowerCase().startsWith('#idea')) {
    cleaned = cleaned.slice(5).trim();
  } else if (cleaned.toLowerCase().startsWith('idea:')) {
    cleaned = cleaned.slice(5).trim();
  }
  return cleaned;
}

const ENERGY_PATTERNS: Array<{ regex: RegExp; level: EnergyLevel }> = [
  { regex: /#low-energy\b/i,        level: 'low_energy' },
  { regex: /#medium-energy\b/i,     level: 'medium_energy' },
  { regex: /#high-focus\b/i,        level: 'high_focus' },
  { regex: /\blow energy\b/i,       level: 'low_energy' },
  { regex: /\bmedium energy\b/i,    level: 'medium_energy' },
  { regex: /\bhigh focus\b/i,       level: 'high_focus' },
];

const ENERGY_TAG_NAMES = new Set(['low-energy', 'medium-energy', 'high-focus']);

export function parseTaskInput(text: string): ParsedTask {
  const result: ParsedTask = { text, tags: [] };
  let cleanText = text;

  // Energy first (so we can strip natural-language phrases before tag extraction)
  for (const { regex, level } of ENERGY_PATTERNS) {
    if (regex.test(cleanText)) {
      result.energy_level = level;
      cleanText = cleanText.replace(regex, '').trim();
      break;
    }
  }

  // Tags (#tag) - exclude energy tags from context_tags
  const tagMatches = cleanText.match(/#([a-z][a-z0-9-]*)/gi);
  if (tagMatches) {
    const allTags = tagMatches.map(t => t.slice(1).toLowerCase());
    result.tags = allTags.filter(t => !ENERGY_TAG_NAMES.has(t));
    cleanText = cleanText.replace(/#[a-z][a-z0-9-]*/gi, '').trim();
  }

  // Priority (!high, !med, !low)
  const priorityMatch = cleanText.match(/!(high|med|medium|low)/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    result.priority = p === 'med' ? 'medium' : (p as 'high' | 'medium' | 'low');
    cleanText = cleanText.replace(/!(high|med|medium|low)/i, '').trim();
  }

  // Duration (30m, 1h, etc.)
  const durationMatch = cleanText.match(/\b(\d+)(m|h|min|hr|hour)\b/i);
  if (durationMatch) {
    const num = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    result.duration = unit.startsWith('h') ? num * 60 : num;
    cleanText = cleanText.replace(/\b\d+(m|h|min|hr|hour)\b/i, '').trim();
  }

  // Date keywords
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
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekdayMatch = cleanText.match(new RegExp(`\\b(${weekdays.join('|')})\\b`, 'i'));
    if (weekdayMatch) {
      const targetDay = weekdays.indexOf(weekdayMatch[1].toLowerCase());
      const currentDay = today.getDay();
      const currentDayMondayBased = currentDay === 0 ? 6 : currentDay - 1;
      let daysToAdd = targetDay - currentDayMondayBased;
      if (daysToAdd <= 0) daysToAdd += 7;
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      result.date = targetDate;
      cleanText = cleanText.replace(new RegExp(`\\b${weekdayMatch[1]}\\b`, 'i'), '').trim();
    }
  }

  // Time — STRICT: requires am/pm or H:MM colon, never bare numbers
  const timeMatch = cleanText.match(TIME_REGEX);
  if (timeMatch) {
    result.time = timeMatch[0];
    cleanText = cleanText.replace(timeMatch[0], '').trim();
  }

  result.text = cleanText.replace(/\s+/g, ' ').trim();
  return result;
}
