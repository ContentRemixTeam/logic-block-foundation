export type VaultCapability = 'core' | 'ask_faith' | 'current_replay' | 'full_vault';
export type VaultAccessState =
  | { status: 'loading' }
  | { status: 'allowed'; capabilities: VaultCapability[]; checkedAt: string | null }
  | { status: 'limited'; capabilities: VaultCapability[]; checkedAt: string | null }
  | { status: 'not_launched'; memberTier: 'monthly' | 'annual' | 'lifetime'; launchState: 'disabled' | 'pilot'; checkedAt: string | null }
  | { status: 'denied'; reasonCode: string | null; checkedAt: string | null }
  | { status: 'unavailable' };
export interface VaultMoment { momentId: string; matchType: 'best_answer' | 'question' | 'transcript' | 'metadata'; questionId: string | null; startSeconds: number | null; endSeconds: number | null; snippet: string; reason: string; answerer: string | null; }
export interface VaultReplayGroup { resourceId: string; title: string; category: string; sourceType: string; publishedAt: string | null; durationSeconds: number | null; thumbnailUrl: string | null; moments: VaultMoment[]; }
export interface PlaybackResult { resourceId: string; title: string; provider: string; playbackUrl: string; expiresAt: string | null; accessScope: string; startSeconds: number | null; endSeconds?: number | null; questionId?: string | null; momentId?: string | null; }
export interface PlaybackTarget { resourceId: string; title: string; startSeconds: number | null; questionId: string | null; momentId: string | null; }
export interface ProtectedDetailTarget { resourceId: string; questionId: string | null; momentId: string | null; }
