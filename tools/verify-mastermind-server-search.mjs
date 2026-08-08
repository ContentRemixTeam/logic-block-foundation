import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20260808120000_mastermind_portal_private_search.sql",
);
const FUNCTION = path.join(ROOT, "supabase/functions/search-mastermind-resources/index.ts");
const CONFIG = path.join(ROOT, "supabase/config.toml");
const SRC_DIR = path.join(ROOT, "src");

const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function read(file) {
  return readFileSync(file, "utf8");
}

function findFiles(dir, matcher, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
      findFiles(fullPath, matcher, acc);
    } else if (matcher(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function tableBlock(sql, tableName) {
  const start = sql.indexOf(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
  if (start === -1) return "";
  const nextTable = sql.indexOf("\nCREATE TABLE IF NOT EXISTS", start + 1);
  return sql.slice(start, nextTable === -1 ? undefined : nextTable);
}

function functionBlock(sql, functionName) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}`);
  if (start === -1) return "";
  const nextFunction = sql.indexOf("\nCREATE OR REPLACE FUNCTION", start + 1);
  return sql.slice(start, nextFunction === -1 ? undefined : nextFunction);
}

function extractArrayLiteral(ts, constantName) {
  const match = ts.match(new RegExp(`const\\s+${constantName}\\s*=\\s*\\[([^\\]]+)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

if (!existsSync(MIGRATION)) fail("Missing private search migration");
if (!existsSync(FUNCTION)) fail("Missing search-mastermind-resources Edge Function");
if (!existsSync(CONFIG)) fail("Missing Supabase config");

const migration = existsSync(MIGRATION) ? read(MIGRATION) : "";
const edgeFunction = existsSync(FUNCTION) ? read(FUNCTION) : "";
const config = existsSync(CONFIG) ? read(CONFIG) : "";

const requiredTables = [
  "mastermind_portal_resources",
  "mastermind_portal_source_evidence",
  "mastermind_portal_transcript_segments",
  "mastermind_portal_search_events",
];

for (const table of requiredTables) {
  assert(
    migration.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),
    `Missing table ${table}`,
  );
  assert(
    migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),
    `RLS is not enabled for ${table}`,
  );
  assert(
    migration.includes(`REVOKE ALL ON public.${table} FROM anon`) &&
      migration.includes(`REVOKE ALL ON public.${table} FROM authenticated`),
    `Client roles are not revoked for ${table}`,
  );
  assert(
    migration.includes(`GRANT ALL ON public.${table} TO service_role`) &&
      migration.includes(`ON public.${table}\nFOR ALL\nTO service_role`),
    `Service-role-only policy/grant is missing for ${table}`,
  );
}

const resourcesBlock = tableBlock(migration, "mastermind_portal_resources");
assert(resourcesBlock.includes("access_scope TEXT NOT NULL"), "Resources table missing access_scope");
assert(
  resourcesBlock.includes("'core_curriculum'") &&
    resourcesBlock.includes("'current_replay_30_day'") &&
    resourcesBlock.includes("'replay_vault'") &&
    resourcesBlock.includes("'vault'") &&
    resourcesBlock.includes("'bonus_or_access_review'"),
  "Resources table access scopes do not cover portal tiers",
);
assert(
  resourcesBlock.includes("metadata_search_vector TSVECTOR GENERATED ALWAYS"),
  "Resources table missing metadata search vector",
);

const sourceBlock = tableBlock(migration, "mastermind_portal_source_evidence");
assert(sourceBlock.includes("source_fingerprint TEXT NOT NULL"), "Source evidence missing idempotent source_fingerprint");
assert(sourceBlock.includes("UNIQUE (resource_id, source_fingerprint)"), "Source evidence missing idempotent unique key");
assert(sourceBlock.includes("dropbox_path TEXT"), "Source evidence missing dropbox_path");
assert(sourceBlock.includes("ghl_video_url TEXT"), "Source evidence missing ghl_video_url");
assert(sourceBlock.includes("bunny_video_id TEXT"), "Source evidence missing bunny_video_id");
assert(sourceBlock.includes("youtube_video_id TEXT"), "Source evidence missing youtube_video_id");
assert(sourceBlock.includes("transcript_path TEXT"), "Source evidence missing transcript_path");
assert(sourceBlock.includes("match_confidence TEXT"), "Source evidence match_confidence must store review labels");
assert(sourceBlock.includes("match_score NUMERIC"), "Source evidence missing numeric match_score");

const segmentsBlock = tableBlock(migration, "mastermind_portal_transcript_segments");
assert(segmentsBlock.includes("transcript_text TEXT NOT NULL"), "Transcript segments missing private text");
assert(segmentsBlock.includes("search_vector TSVECTOR GENERATED ALWAYS"), "Transcript segments missing FTS vector");

const eventsBlock = tableBlock(migration, "mastermind_portal_search_events");
assert(eventsBlock.includes("query_hash TEXT NOT NULL"), "Search events must store query_hash");
assert(!/\bquery\s+TEXT\b/i.test(eventsBlock), "Search events must not store raw query text");

const searchRpc = functionBlock(migration, "search_mastermind_portal_resources");
assert(searchRpc.includes("SECURITY DEFINER"), "Search RPC must be SECURITY DEFINER");
assert(searchRpc.includes("REVOKE ALL ON FUNCTION public.search_mastermind_portal_resources"), "Search RPC execute must be revoked from PUBLIC");
assert(searchRpc.includes("GRANT EXECUTE ON FUNCTION public.search_mastermind_portal_resources"), "Search RPC execute must be granted to service_role");
assert(searchRpc.includes("r.access_scope = ANY(p_allowed_access)"), "Search RPC must filter by allowed access");
assert(searchRpc.includes("r.available_until IS NOT NULL AND r.available_until >= CURRENT_DATE"), "Search RPC must enforce current replay availability");
assert(searchRpc.includes("left(") && searchRpc.includes("320"), "Search RPC must cap snippets");
assert(searchRpc.includes("ts_headline") && searchRpc.includes("ts_rank_cd"), "Search RPC must use transcript full-text search");

const returnedSensitiveFields = [
  "source_url",
  "dropbox_path",
  "ghl_video_url",
  "bunny_video_id",
  "youtube_video_id",
  "transcript_path",
  "transcript_text",
];
const returnsSection = searchRpc.slice(searchRpc.indexOf("RETURNS TABLE("), searchRpc.indexOf("LANGUAGE sql"));
for (const field of returnedSensitiveFields) {
  assert(!returnsSection.includes(field), `Search RPC returns sensitive field ${field}`);
}

assert(edgeFunction.includes("auth.getUser(token)"), "Edge Function must authenticate the bearer token");
assert(edgeFunction.includes("check_mastermind_entitlement"), "Edge Function must check Mastermind entitlement");
assert(edgeFunction.includes("search_mastermind_portal_resources"), "Edge Function must call the private search RPC");
assert(edgeFunction.includes("cleanSnippet(row.snippet)"), "Edge Function must sanitize snippets");
assert(edgeFunction.includes("sha256Hex(query.toLowerCase())"), "Edge Function must hash query text before logging");
assert(edgeFunction.includes("query_hash: queryHash"), "Edge Function must log only query_hash");
assert(edgeFunction.includes("resourceId: row.portal_resource_id"), "Edge Function must return resourceId per API contract");
assert(!edgeFunction.includes("raw_query"), "Edge Function must not log raw_query");

const monthlyScopes = extractArrayLiteral(edgeFunction, "MONTHLY_MEMBER_ACCESS_SCOPES");
assert(
  monthlyScopes.length === 2 &&
    monthlyScopes.includes("core_curriculum") &&
    monthlyScopes.includes("current_replay_30_day"),
  "Monthly member search access must be core curriculum plus current 30-day replays",
);
assert(
  monthlyScopes.every((scope) => ["core_curriculum", "current_replay_30_day"].includes(scope)),
  "Monthly member search access includes a restricted scope",
);

for (const publicField of ["sourceUrl", "dropboxPath", "ghlVideoUrl", "bunnyVideoId", "youtubeVideoId", "transcriptPath", "transcriptText"]) {
  assert(!edgeFunction.includes(publicField), `Edge Function response exposes ${publicField}`);
}

assert(
  /\[functions\.search-mastermind-resources\]\s+verify_jwt = false/s.test(config),
  "Supabase config missing search-mastermind-resources function entry",
);

const srcFiles = existsSync(SRC_DIR) ? findFiles(SRC_DIR, (file) => /\.(ts|tsx|js|jsx)$/.test(file)) : [];
for (const file of srcFiles) {
  const contents = read(file);
  assert(
    !contents.includes("search-mastermind-resources") &&
      !contents.includes("search_mastermind_portal_resources"),
    `Frontend is already wired to hidden server search: ${path.relative(ROOT, file)}`,
  );
}

assert(
  !/INSERT\s+INTO\s+public\.mastermind_portal_resources/i.test(migration),
  "Migration must not import content data automatically",
);

if (failures.length > 0) {
  console.error("Mastermind server search verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mastermind server search verification passed.");
