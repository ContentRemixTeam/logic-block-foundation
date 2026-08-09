const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const CAPABILITIES = ['core', 'ask_faith', 'current_replay', 'full_vault'];

export function isStableVaultId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function normalizeAccessResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.error === 'string') {
    return { status: 'unavailable' };
  }
  const checkedAt = typeof data.checkedAt === 'string' ? data.checkedAt : null;
  const capabilities = Array.isArray(data.capabilities)
    ? data.capabilities.filter((value) => CAPABILITIES.includes(value))
    : legacyCapabilities(data);

  if (data.decision === 'denied' || data.replayAccess === 'none') {
    return { status: 'denied', reasonCode: typeof data.reasonCode === 'string' ? data.reasonCode : null, checkedAt };
  }
  if (data.decision === 'limited' || data.replayAccess === 'current_30_day') {
    return { status: 'limited', capabilities, checkedAt };
  }
  if (data.decision === 'allowed' || data.replayAccess === 'full_vault' || data.hasMastermindAccess === true) {
    return { status: capabilities.includes('full_vault') ? 'allowed' : 'limited', capabilities, checkedAt };
  }
  // A malformed 2xx is an availability failure, never evidence of lost entitlement.
  return { status: 'unavailable' };
}

function legacyCapabilities(data) {
  if (data?.replayAccess === 'full_vault') return ['core', 'ask_faith', 'current_replay', 'full_vault'];
  if (data?.replayAccess === 'current_30_day') return ['core', 'ask_faith', 'current_replay'];
  return [];
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
    questionId: isStableVaultId(result?.questionId) ? result.questionId : null,
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
    title: String(item.title ?? 'Replay'),
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
      title: String(row.title ?? 'Replay'),
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
  if (isStableVaultId(questionId)) params.set('question', questionId);
  if (isStableVaultId(momentId)) params.set('moment', momentId);
  return `/mastermind/replay-vault?${params.toString()}`;
}

export function parseDetailTarget(search) {
  const params = new URLSearchParams(search);
  const resourceId = params.get('resource');
  if (!isStableVaultId(resourceId)) return null;
  const question = params.get('question');
  const moment = params.get('moment');
  return { resourceId, questionId: isStableVaultId(question) ? question : null, momentId: isStableVaultId(moment) ? moment : null };
}

export function makeAuthReturnTo(location) {
  return `${location.pathname ?? ''}${location.search ?? ''}${location.hash ?? ''}`;
}

export function validatePlaybackResponse(data, target) {
  if (!data || typeof data !== 'object' || !isStableVaultId(data.resourceId) || data.resourceId !== target.resourceId || typeof data.playbackUrl !== 'string' || !data.playbackUrl) return null;
  if (target.momentId && (data.momentId !== target.momentId || !Number.isFinite(data.startSeconds))) return null;
  if (target.questionId && data.questionId !== target.questionId) return null;
  return {
    ...data,
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
