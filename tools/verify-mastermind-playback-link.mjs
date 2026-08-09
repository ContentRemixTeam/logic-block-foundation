import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FUNCTION = path.join(ROOT, "supabase/functions/get-mastermind-playback-link/index.ts");
const ACCESS_MIGRATION = path.join(ROOT, "supabase/migrations/20260808220000_mastermind_portal_access_scopes.sql");
const CONFIG = path.join(ROOT, "supabase/config.toml");
const LIVE_QA = path.join(ROOT, "tools/qa-mastermind-live-gates.mjs");
const LIVE_QA_MOCK = path.join(ROOT, "tools/qa-mastermind-live-gates-mock.mjs");
const PACKAGE_JSON = path.join(ROOT, "package.json");
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

if (!existsSync(FUNCTION)) fail("Missing get-mastermind-playback-link Edge Function");
if (!existsSync(ACCESS_MIGRATION)) fail("Missing shared Mastermind portal access-scope migration");
if (!existsSync(CONFIG)) fail("Missing Supabase config");
if (!existsSync(LIVE_QA)) fail("Missing live Mastermind Edge Function QA harness");
if (!existsSync(LIVE_QA_MOCK)) fail("Missing mock live Mastermind Edge Function QA harness");
if (!existsSync(PACKAGE_JSON)) fail("Missing package.json");

const edgeFunction = existsSync(FUNCTION) ? read(FUNCTION) : "";
const accessMigration = existsSync(ACCESS_MIGRATION) ? read(ACCESS_MIGRATION) : "";
const config = existsSync(CONFIG) ? read(CONFIG) : "";
const liveQa = existsSync(LIVE_QA) ? read(LIVE_QA) : "";
const liveQaMock = existsSync(LIVE_QA_MOCK) ? read(LIVE_QA_MOCK) : "";
const packageJson = existsSync(PACKAGE_JSON) ? read(PACKAGE_JSON) : "";

assert(edgeFunction.includes("auth.getUser(token)"), "Playback function must authenticate the bearer token");
assert(edgeFunction.includes("get_mastermind_portal_access_scopes"), "Playback function must use the shared Mastermind access-scope decision");
assert(edgeFunction.includes("mastermind_portal_resources"), "Playback function must load portal resources server-side");
assert(edgeFunction.includes("mastermind_portal_source_evidence"), "Playback function must load private source evidence server-side");
assert(edgeFunction.includes("source_system\", \"portal_playback_source\""), "Playback function must use portal playback source evidence only");
assert(edgeFunction.includes("review_status\", \"approved\""), "Playback function must use approved playback evidence only");
assert(edgeFunction.includes("isAllowedResource(portalResource, allowedAccessScopes)"), "Playback function must enforce member-specific access scopes");
assert(edgeFunction.includes("available_until >= new Date().toISOString().slice(0, 10)"), "Playback function must enforce current replay availability");
assert(edgeFunction.includes("DROPBOX_ACCESS_TOKEN"), "Playback function must keep Dropbox access token server-side");
assert(edgeFunction.includes("https://api.dropboxapi.com/2/files/get_temporary_link"), "Playback function must use Dropbox temporary links for Dropbox paths");
assert(edgeFunction.includes("BLOCKED_DIRECT_SOURCE_HOSTS"), "Playback function must define blocked direct-source hosts");
assert(edgeFunction.includes("canUseDirectSourceUrl(evidence.source_url)"), "Playback function must reject unsafe direct source URL fallbacks");
assert(edgeFunction.includes("\"dropbox.com\""), "Playback function must block old Dropbox shared URLs as direct playback links");
assert(edgeFunction.includes("playbackUrl"), "Playback function must return the normalized playbackUrl field");
assert(edgeFunction.includes("urlType"), "Playback function must return a playback URL type");
assert(edgeFunction.includes("resourceId: portalResource.portal_resource_id"), "Playback function must return resourceId per API contract");

assert(
  accessMigration.includes("ARRAY['core_curriculum', 'current_replay_30_day']"),
  "Shared access decision must restrict monthly playback to core plus current 30-day replays",
);
assert(
  accessMigration.includes("ARRAY['core_curriculum', 'current_replay_30_day', 'replay_vault', 'vault']"),
  "Shared access decision must grant annual/lifetime playback full Vault scopes",
);

const responseObjects = [...edgeFunction.matchAll(/return json\(\{([\s\S]*?)\}\s*(?:,\s*\d+)?\);/g)].map((match) => match[1]);
for (const publicField of ["sourceUrl", "dropboxPath", "ghlVideoUrl", "bunnyVideoId", "youtubeVideoId", "transcriptPath", "transcriptText"]) {
  assert(
    responseObjects.every((responseBody) => !responseBody.includes(`${publicField}:`)),
    `Playback response exposes ${publicField}`,
  );
}

assert(
  /\[functions\.get-mastermind-playback-link\]\s+verify_jwt = false/s.test(config),
  "Supabase config missing get-mastermind-playback-link function entry",
);

assert(liveQa.includes("get-mastermind-playback-link"), "Live QA harness must exercise get-mastermind-playback-link");
assert(liveQa.includes("MASTERMIND_PLAYBACK_RESOURCE_ID"), "Live QA harness must accept a playback resource id");
assert(liveQa.includes("appendSearchResourceIds"), "Live QA harness must collect playback candidates from search results");
assert(liveQa.includes("monthly_playback_link_autodiscovery"), "Live QA harness must auto-discover a playback resource when no id is supplied");
assert(liveQa.includes("non_member_playback_returns_403"), "Live QA harness must check non-member playback denial when possible");
assert(liveQa.includes("assertNoPlaybackRawFields"), "Live QA harness must check playback raw-source fields");
assert(liveQa.includes("assertPlaybackPayload"), "Live QA harness must validate playback response shape");
assert(liveQaMock.includes("monthly_playback_link_autodiscovery"), "Mock live QA harness must verify playback autodiscovery");
assert(liveQaMock.includes("non_member_playback_returns_403"), "Mock live QA harness must verify non-member playback denial");
assert(liveQaMock.includes("attempts=2"), "Mock live QA harness must exercise playback retry after source-review response");
assert(
  packageJson.includes('"qa:mastermind-live-gates"') &&
    packageJson.includes('"qa:mastermind-live-gates:dry-run"') &&
    packageJson.includes('"qa:mastermind-live-gates:mock"'),
  "package.json must expose live QA harness scripts",
);

const srcFiles = existsSync(SRC_DIR) ? findFiles(SRC_DIR, (file) => /\.(ts|tsx|js|jsx)$/.test(file)) : [];
for (const file of srcFiles) {
  const contents = read(file);
  const relative = path.relative(ROOT, file);
  const isHiddenVaultClient = relative === "src/pages/ReplayVault.tsx";
  assert(
    !contents.includes("get-mastermind-playback-link") || isHiddenVaultClient,
    `Protected playback is wired outside the hidden Replay Vault client: ${relative}`,
  );
}

if (failures.length > 0) {
  console.error("Mastermind playback link verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mastermind playback link verification passed.");
