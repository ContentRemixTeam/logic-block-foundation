/**
 * Universal capture tag registry shared by /brain-dump and Daily Plan SmartScratchPad.
 * Phase 1: simple typed-tag routing. No AI, no schema changes.
 */
import { ListTodo, Lightbulb, StickyNote, Rocket, FileText, HelpCircle, Bell, Brain, Trophy, DollarSign, Settings, Mail, Battery, BatteryMedium, Zap, LifeBuoy, Clock, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CaptureDestination = 'task' | 'idea' | 'note' | 'project';

export interface CaptureTag {
  tag: string;
  label: string;
  emoji: string;
  description: string;
  icon: LucideIcon;
  /** destination tags route to a table; modifier tags are preserved in saved text */
  kind: 'destination' | 'modifier';
  /** which destination this tag routes to, only for destination tags */
  destination?: CaptureDestination;
}

export const CAPTURE_TAGS: CaptureTag[] = [
  { tag: 'task',     label: 'Task',     emoji: '📋', description: 'Add to task list',     icon: ListTodo,    kind: 'destination', destination: 'task' },
  { tag: 'idea',     label: 'Idea',     emoji: '💡', description: 'Save to ideas',        icon: Lightbulb,   kind: 'destination', destination: 'idea' },
  { tag: 'note',     label: 'Note',     emoji: '📝', description: 'Keep as note',         icon: StickyNote,  kind: 'destination', destination: 'note' },
  { tag: 'project',  label: 'Project',  emoji: '🚀', description: 'Project idea',         icon: Rocket,      kind: 'destination', destination: 'project' },
  { tag: 'content',  label: 'Content',  emoji: '✍️', description: 'Content spark (idea)', icon: FileText,    kind: 'destination', destination: 'idea' },
  { tag: 'question', label: 'Question', emoji: '❓', description: 'Question to revisit',  icon: HelpCircle,  kind: 'destination', destination: 'note' },
  { tag: 'reminder', label: 'Reminder', emoji: '🔔', description: 'Reminder (task)',      icon: Bell,        kind: 'destination', destination: 'task' },
  { tag: 'thought',  label: 'Thought',  emoji: '🧠', description: 'Capture insight',      icon: Brain,       kind: 'destination', destination: 'note' },
  { tag: 'win',      label: 'Win',      emoji: '🏆', description: 'Celebrate win',        icon: Trophy,      kind: 'destination', destination: 'note' },
  { tag: 'sales',         label: 'Sales',        emoji: '💰', description: 'Tag: sales',         icon: DollarSign,    kind: 'modifier' },
  { tag: 'admin',         label: 'Admin',        emoji: '⚙️', description: 'Tag: admin',         icon: Settings,      kind: 'modifier' },
  { tag: 'email',         label: 'Email',        emoji: '✉️', description: 'Tag: email',         icon: Mail,          kind: 'modifier' },
  { tag: 'low-energy',    label: 'Low energy',   emoji: '🪫', description: 'Energy: low',        icon: Battery,       kind: 'modifier' },
  { tag: 'medium-energy', label: 'Med energy',   emoji: '🔋', description: 'Energy: medium',     icon: BatteryMedium, kind: 'modifier' },
  { tag: 'high-focus',    label: 'High focus',   emoji: '⚡', description: 'Needs deep focus',   icon: Zap,           kind: 'modifier' },
];

export const TAG_BY_NAME: Record<string, CaptureTag> = Object.fromEntries(
  CAPTURE_TAGS.map(t => [t.tag, t])
);

/** Routing precedence — first match wins. */
const ROUTE_PRECEDENCE: CaptureDestination[] = ['task', 'project', 'idea', 'note'];

const TAG_REGEX_GLOBAL = /#([a-z][a-z0-9-]*)/gi;

export function extractTags(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(TAG_REGEX_GLOBAL.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1].toLowerCase());
  }
  return out;
}

export interface RoutedLine {
  raw: string;
  destination: CaptureDestination;
  cleanedText: string;
  routingTag?: string;
  modifiers: string[];
  allTags: string[];
}

/**
 * Determine destination + cleaned text for a single line.
 * - cleanedText only strips the routing tag; other tags are preserved.
 * - untagged lines default to `note` (inbox).
 */
export function routeForLine(line: string, fallback: CaptureDestination = 'note'): RoutedLine {
  const allTags = extractTags(line);
  const known = allTags.filter(t => TAG_BY_NAME[t]);
  const destinations = known
    .map(t => TAG_BY_NAME[t])
    .filter(t => t.kind === 'destination');

  let routingTag: string | undefined;
  let destination: CaptureDestination = fallback;
  for (const d of ROUTE_PRECEDENCE) {
    const hit = destinations.find(t => t.destination === d);
    if (hit) {
      destination = d;
      routingTag = hit.tag;
      break;
    }
  }

  let cleanedText = line;
  if (routingTag) {
    cleanedText = cleanedText.replace(new RegExp(`#${routingTag}\\b`, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
  } else {
    cleanedText = cleanedText.trim();
  }

  const modifiers = known.filter(t => TAG_BY_NAME[t].kind === 'modifier');

  return { raw: line, destination, cleanedText, routingTag, modifiers, allTags };
}

/** Tags whose presence should appear in the "items to review" warning. */
export const DESTINATION_TAG_NAMES = CAPTURE_TAGS.filter(t => t.kind === 'destination').map(t => t.tag);

export const DESTINATION_TAG_REGEX = new RegExp(
  `#(${DESTINATION_TAG_NAMES.join('|')})\\b`,
  'gi'
);
