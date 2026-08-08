import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FUNCTION = path.join(ROOT, "supabase/functions/get-mastermind-playback-link/index.ts");
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

function extractArrayLiteral(ts, constantName) {
  const match = ts.match(new RegExp(`const\\s+${constantName}\\s*=\\s*\\[([^\\]]+)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

if (!existsSync(FUNCTION)) fail("Missing get-mastermind-playback-link Edge Function");
if (!existsSync(CONFIG)) fail("Missing Supabase config");

const edgeFunction = existsSync(FUNCTION) ? read(FUNCTION) : "";
const config = existsSync(CONFIG) ? read(CONFIG) : "";

assert(edgeFunction.includes("auth.getUser(token)"), "Playback function must authenticate the bearer token");
assert(edgeFunction.includes("check_mastermind_entitlement"), "Playback function must check Mastermind entitlement");
assert(edgeFunction.includes("mastermind_portal_resources"), "Playback function must load portal resources server-side");
assert(edgeFunction.includes("mastermind_portal_source_evidence"), "Playback function must load private source evidence server-side");
assert(edgeFunction.includes("source_system\", \"portal_playback_source\""), "Playback function must use portal playback source evidence only");
assert(edgeFunction.includes("review_status\", \"approved\""), "Playback function must use approved playback evidence only");
assert(edgeFunction.includes("isAllowedMonthlyResource(portalResource)"), "Playback function must enforce monthly access scopes");
assert(edgeFunction.includes("available_until >= new Date().toISOString().slice(0, 10)"), "Playback function must enforce current replay availability");
assert(edgeFunction.includes("DROPBOX_ACCESS_TOKEN"), "Playback function must keep Dropbox access token server-side");
assert(edgeFunction.includes("https://api.dropboxapi.com/2/files/get_temporary_link"), "Playback function must use Dropbox temporary links for Dropbox paths");
assert(edgeFunction.includes("playbackUrl"), "Playback function must return the normalized playbackUrl field");
assert(edgeFunction.includes("urlType"), "Playback function must return a playback URL type");
assert(edgeFunction.includes("resourceId: portalResource.portal_resource_id"), "Playback function must return resourceId per API contract");

const monthlyScopes = extractArrayLiteral(edgeFunction, "MONTHLY_MEMBER_ACCESS_SCOPES");
assert(
  monthlyScopes.length === 2 &&
    monthlyScopes.includes("core_curriculum") &&
    monthlyScopes.includes("current_replay_30_day"),
  "Monthly playback access must be core curriculum plus current 30-day replays",
);
assert(
  monthlyScopes.every((scope) => ["core_curriculum", "current_replay_30_day"].includes(scope)),
  "Monthly playback access includes a restricted scope",
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

const srcFiles = existsSync(SRC_DIR) ? findFiles(SRC_DIR, (file) => /\.(ts|tsx|js|jsx)$/.test(file)) : [];
for (const file of srcFiles) {
  const contents = read(file);
  assert(
    !contents.includes("get-mastermind-playback-link"),
    `Frontend is already wired to hidden playback link function: ${path.relative(ROOT, file)}`,
  );
}

if (failures.length > 0) {
  console.error("Mastermind playback link verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mastermind playback link verification passed.");
