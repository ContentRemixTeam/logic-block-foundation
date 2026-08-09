const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
const URL_OR_PRIVATE_HOST = /(?:https?|ftp|file):\/\/[^\s<>{}\[\]"']+|\bwww\.[^\s<>{}\[\]"']+|\b(?:storage\.googleapis\.com|revex-membership-production|dropbox(?:api)?\.com)\b[^\s<>{}\[\]"']*/gi;
const WINDOWS_PATH = /(?:\b[A-Za-z]:\\|\\\\)[^\s<>{}\[\]"']+/g;
const POSIX_PATH = /(^|[\s([{=:;,'"])(\/(?!\/)[^\s<>{}\[\]"']+)/g;
const PRIVATE_LOCATOR = /\b(?:dbid:|dropbox(?:_path|_file_id)?|source_locator_private|portal_playback_source)\S*/gi;

export function memberSafeText(value, maxLength, fallback = "") {
  const input = typeof value === "string" ? value : fallback;
  return input
    .replace(CONTROL_CHARS, " ")
    .replace(URL_OR_PRIVATE_HOST, "[private source]")
    .replace(WINDOWS_PATH, "[private source]")
    .replace(POSIX_PATH, (_match, prefix) => `${prefix}[private source]`)
    .replace(PRIVATE_LOCATOR, "[private source]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function finiteSeconds(value) {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : null;
}

export function mapSearchRow(row) {
  return {
    resourceId: String(row.portal_resource_id ?? ""),
    momentId: String(row.moment_id ?? ""),
    questionId: row.question_id == null ? null : String(row.question_id),
    title: memberSafeText(row.title, 160, "Replay"),
    productTitle: memberSafeText(row.product_title, 120),
    category: memberSafeText(row.category_title, 120, "Replay"),
    sourceType: memberSafeText(row.resource_type, 64, "video"),
    publishedAt: null,
    durationSeconds: finiteSeconds(row.duration_seconds),
    thumbnailUrl: null,
    matchType: row.question_id == null ? "transcript" : "best_answer",
    snippet: memberSafeText(row.snippet, 320),
    reason: memberSafeText(row.reason, 120),
    answerer: null,
    startSeconds: finiteSeconds(row.starts_at_seconds),
    endSeconds: finiteSeconds(row.ends_at_seconds),
  };
}

export function mapPlaybackResponse(row, playbackUrl, expiresAt) {
  return {
    resourceId: String(row.portal_resource_id ?? ""),
    title: memberSafeText(row.title, 160, "Replay"),
    provider: "dropbox",
    playbackUrl,
    expiresAt,
    accessScope: String(row.access_scope ?? ""),
    startSeconds: finiteSeconds(row.authoritative_start_seconds),
    endSeconds: finiteSeconds(row.authoritative_end_seconds),
    momentId: row.moment_id == null ? null : String(row.moment_id),
    questionId: row.question_id == null ? null : String(row.question_id),
  };
}
