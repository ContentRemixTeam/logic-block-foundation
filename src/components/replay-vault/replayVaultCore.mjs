const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~:-]{0,219}$/;
const MEMBER_TIERS = new Set(['monthly', 'annual', 'lifetime']);
const LAUNCH_STATES = new Set(['disabled', 'pilot', 'launched']);
const TITLE_ACRONYMS = new Set(['AI', 'CEO', 'CFO', 'COO', 'CRM', 'DIY', 'DM', 'DMS', 'EFT', 'FAQ', 'FB', 'GHL', 'LLC', 'PDF', 'SEO', 'URL', 'VIP']);

export function formatVaultTitle(value) {
  const words = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\.(mp4|mov|m4v|webm)$/i, '')
    .replace(/_+/g, ' ')
    .replace(/AskFaith/gi, 'Ask Faith')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  return words.map((word) => {
    const upper = word.toUpperCase();
    if (TITLE_ACRONYMS.has(upper) || /^Q[1-4]$/.test(upper)) return upper === 'DMS' ? 'DMs' : upper;
    return /^[A-Z]{3,}$/.test(word) ? `${word[0]}${word.slice(1).toLowerCase()}` : word;
  }).join(' ') || 'Replay';
}

export function isStableVaultId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function producerAccessShape(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.error === 'string') return false;
  return typeof data.allowed === 'boolean'
    && typeof data.memberEntitled === 'boolean'
    && (data.memberTier === null || MEMBER_TIERS.has(data.memberTier))
    && isStringArray(data.memberScopes)
    && isStringArray(data.previewCapabilities)
    && typeof data.previewActive === 'boolean'
    && LAUNCH_STATES.has(data.launchState);
}

function memberCapabilities(scopes) {
  const capabilities = [];
  if (scopes.includes('core_curriculum')) capabilities.push('core');
  if (scopes.includes('current_replay_30_day')) capabilities.push('current_replay');
  if (scopes.includes('replay_vault')) capabilities.push('full_vault');
  return capabilities;
}

export function normalizeAccessResponse(data) {
  // A malformed 2xx or transport error is an availability failure, never evidence of lost entitlement.
  if (!producerAccessShape(data)) return { status: 'unavailable' };

  const checkedAt = null;
  if (data.previewActive) {
    if (!data.allowed || !data.previewCapabilities.includes('preview_vault')) return { status: 'unavailable' };
    return { status: 'allowed', capabilities: ['core', 'current_replay', 'full_vault'], checkedAt };
  }

  if (data.allowed) {
    if (!data.memberEntitled || data.memberTier === null || data.launchState === 'disabled') return { status: 'unavailable' };
    const capabilities = memberCapabilities(data.memberScopes);
    const hasFull = capabilities.includes('full_vault');
    if ((data.memberTier === 'annual' || data.memberTier === 'lifetime') && hasFull) {
      return { status: 'allowed', capabilities, checkedAt };
    }
    return { status: 'unavailable' };
  }

  if (data.memberEntitled) {
    if (data.memberTier === 'monthly' && !data.memberScopes.includes('replay_vault')) {
      return { status: 'denied', reasonCode: null, checkedAt };
    }
    if (data.memberTier === null || !data.memberScopes.includes('replay_vault')) return { status: 'unavailable' };
    if (data.launchState === 'disabled' || data.launchState === 'pilot') {
      return { status: 'not_launched', memberTier: data.memberTier, launchState: data.launchState, checkedAt };
    }
    return { status: 'unavailable' };
  }

  if (data.memberTier !== null || data.memberScopes.length > 0) return { status: 'unavailable' };
  return { status: 'denied', reasonCode: null, checkedAt };
}

function normalizedMoment(result) {
  if (!isStableVaultId(result?.momentId)) return null;
  const startSeconds = Number.isFinite(result?.startSeconds)
    ? Math.max(0, Number(result.startSeconds))
    : Number.isFinite(result?.startsAtSeconds)
      ? Math.max(0, Number(result.startsAtSeconds))
      : null;
  return {
    momentId: result.momentId,
    matchType: ['best_answer', 'question', 'transcript', 'metadata'].includes(result?.matchType) ? result.matchType : 'transcript',
    // Search rows always carry a durable moment ID; send exactly that resolver ID because playback rejects dual targets.
    questionId: null,
    startSeconds,
    endSeconds: Number.isFinite(result?.endSeconds) ? Math.max(startSeconds ?? 0, Number(result.endSeconds)) : null,
    snippet: typeof result?.snippet === 'string' ? result.snippet : '',
    reason: typeof result?.reason === 'string' ? result.reason : '',
    answerer: typeof result?.answerer === 'string' ? result.answerer : null,
  };
}

function groupRecord(item) {
  if (!isStableVaultId(item?.resourceId) || !Array.isArray(item?.moments)) return null;
  const moments = item.moments.map(normalizedMoment).filter(Boolean).slice(0, 8);
  if (!moments.length) return null;
  return {
    resourceId: item.resourceId,
    title: formatVaultTitle(item.title),
    category: String(item.category ?? item.categoryTitle ?? 'Replay'),
    sourceType: String(item.sourceType ?? item.resourceType ?? 'video'),
    publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : null,
    durationSeconds: Number.isFinite(item.durationSeconds) ? Number(item.durationSeconds) : null,
    thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : null,
    moments,
  };
}

export function groupSearchResults(payload) {
  if (Array.isArray(payload?.groups)) return payload.groups.map(groupRecord).filter(Boolean).slice(0, 20);
  const rows = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
  const groups = new Map();
  for (const row of rows) {
    if (!isStableVaultId(row?.resourceId)) continue;
    const moment = normalizedMoment(row);
    if (!moment) continue;
    const existing = groups.get(row.resourceId) ?? {
      resourceId: row.resourceId,
      title: formatVaultTitle(row.title),
      category: String(row.category ?? row.categoryTitle ?? 'Replay'),
      sourceType: String(row.sourceType ?? row.resourceType ?? 'video'),
      publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : null,
      durationSeconds: Number.isFinite(row.durationSeconds) ? Number(row.durationSeconds) : null,
      thumbnailUrl: typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl : null,
      moments: [],
    };
    if (existing.moments.length < 8) existing.moments.push(moment);
    groups.set(row.resourceId, existing);
  }
  return [...groups.values()].slice(0, 20);
}

export function makeDetailHref({ resourceId, questionId = null, momentId = null }) {
  if (!isStableVaultId(resourceId)) throw new Error('A stable resource ID is required');
  const params = new URLSearchParams({ resource: resourceId });
  if (isStableVaultId(momentId)) params.set('moment', momentId);
  else if (isStableVaultId(questionId)) params.set('question', questionId);
  return `/mastermind/replay-vault?${params.toString()}`;
}

export function parseDetailTarget(search) {
  const params = new URLSearchParams(search);
  const resourceId = params.get('resource');
  if (!isStableVaultId(resourceId)) return null;
  const question = params.get('question');
  const moment = params.get('moment');
  if (isStableVaultId(moment)) return { resourceId, questionId: null, momentId: moment };
  return { resourceId, questionId: isStableVaultId(question) ? question : null, momentId: null };
}

export function makeAuthReturnTo(location) {
  return `${location.pathname ?? ''}${location.search ?? ''}${location.hash ?? ''}`;
}

export function validatePlaybackResponse(data, target) {
  if (target?.momentId && target?.questionId) return null;
  if (!data || typeof data !== 'object' || !isStableVaultId(data.resourceId) || data.resourceId !== target.resourceId || typeof data.playbackUrl !== 'string' || !data.playbackUrl) return null;
  if (target.momentId && (data.momentId !== target.momentId || !Number.isFinite(data.startSeconds))) return null;
  if (target.questionId && data.questionId !== target.questionId) return null;
  return {
    ...data,
    title: formatVaultTitle(data.title),
    startSeconds: Number.isFinite(data.startSeconds) ? Math.max(0, Number(data.startSeconds)) : null,
    endSeconds: Number.isFinite(data.endSeconds) ? Math.max(Number(data.startSeconds ?? 0), Number(data.endSeconds)) : null,
  };
}

export function clampSeekTarget(target, duration, safetyMargin = 0.25) {
  if (!Number.isFinite(target)) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, target);
  return Math.min(Math.max(0, target), Math.max(0, duration - safetyMargin));
}

export function applySeekTarget(media, target) {
  const next = clampSeekTarget(target, media.duration);
  media.currentTime = next;
  return next;
}

export function formatCompactTime(seconds) {
  if (!Number.isFinite(seconds)) return 'Start replay';
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatSpokenTime(seconds) {
  if (!Number.isFinite(seconds)) return 'the start';
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${minutes} minute${minutes === 1 ? '' : 's'} ${remainder} second${remainder === 1 ? '' : 's'}`;
}

export function shouldAutoRefresh(attempts) { return attempts < 1; }
