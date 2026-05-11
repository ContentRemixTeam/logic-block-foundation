export type ContentPurpose =
  | 'discover'
  | 'nurture'
  | 'convert'
  | 'authority'
  | 'proof'
  | 'objection'
  | 'launch'
  | 'retention';

export const CONTENT_PURPOSES: { value: ContentPurpose; label: string; emoji: string; description: string }[] = [
  { value: 'discover', label: 'Discover', emoji: '🔭', description: 'Reach new people' },
  { value: 'nurture', label: 'Nurture', emoji: '🌱', description: 'Build trust over time' },
  { value: 'convert', label: 'Convert', emoji: '💰', description: 'Drive a sale or signup' },
  { value: 'authority', label: 'Authority', emoji: '🎓', description: 'Show expertise' },
  { value: 'proof', label: 'Proof', emoji: '⭐', description: 'Testimonials, results, case studies' },
  { value: 'objection', label: 'Objection', emoji: '🛡️', description: 'Answer doubts and FAQs' },
  { value: 'launch', label: 'Launch', emoji: '🚀', description: 'Tied to an active launch' },
  { value: 'retention', label: 'Retention', emoji: '🤝', description: 'Engage existing customers' },
];

export function getPurposeMeta(value?: string | null) {
  if (!value) return null;
  return CONTENT_PURPOSES.find((p) => p.value === value) ?? null;
}
