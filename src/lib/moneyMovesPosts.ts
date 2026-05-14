import { TRACK_LABELS, type MoneyTrack } from '@/constants/moneyMovesConfig';

export interface TrackerLite {
  track: MoneyTrack;
  rung: number;
  move_title: string | null;
  block: string | null;
  actions: Array<{ label: string; completed: boolean; notes?: string }>;
  result_note?: string | null;
}

export function postDiagnostic(t: TrackerLite): string {
  const actions = t.actions.map(a => a.label).join('; ');
  return `I'm in for Money Moves. My track is ${TRACK_LABELS[t.track]}, my rung is ${t.rung}, and my move this week is ${t.move_title ?? '—'}. By Friday, I'm committing to ${actions}. The thing most likely to stop me is ${t.block || '(naming this now)'}.`;
}

export function postActionDone(t: TrackerLite, actionIndex: number): string {
  const done = t.actions[actionIndex];
  const next = t.actions.slice(actionIndex + 1).find(a => !a.completed);
  return `Action done: I ${done?.label ?? 'completed an action'}. What came up for me was ${done?.notes || '(noting this now)'}. My next move is ${next?.label ?? 'celebrating — that was the last one'}.`;
}

export function postAllDone(t: TrackerLite): string {
  const actions = t.actions.map(a => a.label).join('; ');
  return `I completed my Money Move for the week. My track was ${TRACK_LABELS[t.track]}, my move was ${t.move_title ?? '—'}, and I finished ${actions}. What I learned: ${t.result_note || '(adding my reflection)'}.`;
}

export function postSale(t: TrackerLite): string {
  return `It worked. I ${t.move_title ?? 'made my move'}, and the result was ${t.result_note || '(sharing my result)'}. If you're on ${TRACK_LABELS[t.track]} rung ${t.rung}, this is your reminder that the action counts.`;
}
