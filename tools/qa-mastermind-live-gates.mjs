import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const SEARCH_FUNCTION = "search-mastermind-resources";
const PLAYBACK_FUNCTION = "get-mastermind-playback-link";
const MONTHLY_ALLOWED_ACCESS = new Set(["core_curriculum", "current_replay_30_day"]);
const RESTRICTED_ACCESS = new Set(["replay_vault", "vault", "bonus_or_access_review"]);
const SEARCH_SOURCE_LEAK_PATTERNS = [
  /source_url/i,
  /dropbox_path/i,
  /ghl_video_url/i,
  /bunny_video_id/i,
  /youtube_video_id/i,
  /transcript_path/i,
  /transcript_text/i,
  /https?:\/\//i,
  /dropbox\.com/i,
  /storage\.googleapis\.com/i,
  /bunnycdn/i,
  /revex-membership-production/i,
];
const PLAYBACK_RAW_SOURCE_FIELDS = [
  /sourceUrl/i,
  /source_url/i,
  /dropboxPath/i,
  /dropbox_path/i,
  /ghlVideoUrl/i,
  /ghl_video_url/i,
  /bunnyVideoId/i,
  /bunny_video_id/i,
  /youtubeVideoId/i,
  /youtube_video_id/i,
  /transcriptPath/i,
  /transcript_path/i,
  /transcriptText/i,
  /transcript_text/i,
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
let verifiedPlaybackResourceId = "";

function env(name) {
  return process.env[name]?.trim() ?? "";
}

function baseFunctionsUrl() {
  const explicit = env("SUPABASE_FUNCTIONS_URL");
  if (explicit) return explicit.replace(/\/$/, "");

  const supabaseUrl = env("SUPABASE_URL");
  if (!supabaseUrl) return "";
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

function endpoint(functionName) {
  return `${baseFunctionsUrl()}/${functionName}`;
}

function redact(value) {
  if (!value) return "";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function jsonString(value) {
  return JSON.stringify(value, null, 2);
}

async function postJson(functionName, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(endpoint(functionName), {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { rawText: text };
  }

  return {
    functionName,
    status: response.status,
    ok: response.ok,
    payload,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStatus(result, expectedStatus) {
  assert(
    result.status === expectedStatus,
    `${result.functionName} expected HTTP ${expectedStatus}, got ${result.status}: ${jsonString(result.payload)}`,
  );
}

function assertNoSearchLeaks(payload) {
  const blob = JSON.stringify(payload ?? {});
  for (const pattern of SEARCH_SOURCE_LEAK_PATTERNS) {
    assert(!pattern.test(blob), `Search response leaked private source content matching ${pattern}`);
  }
}

function assertNoPlaybackRawFields(payload) {
  const blob = JSON.stringify(payload ?? {});
  for (const pattern of PLAYBACK_RAW_SOURCE_FIELDS) {
    assert(!pattern.test(blob), `Playback response exposed raw source field matching ${pattern}`);
  }
}

function assertMonthlySearchResults(payload, label) {
  assert(payload && Array.isArray(payload.results), `${label} did not return a results array`);
  assert(payload.results.length > 0, `${label} returned no results`);
  for (const result of payload.results) {
    assert(
      MONTHLY_ALLOWED_ACCESS.has(result.accessScope),
      `${label} leaked access scope ${result.accessScope}`,
    );
    assert(!RESTRICTED_ACCESS.has(result.accessScope), `${label} returned restricted scope ${result.accessScope}`);
    assert(
      typeof result.snippet !== "string" || result.snippet.length <= 320,
      `${label} snippet exceeded 320 characters`,
    );
  }
  assertNoSearchLeaks(payload);
}

function assertOldReplayDoesNotLeak(payload) {
  assert(payload && Array.isArray(payload.results), "old replay query did not return a results array");
  for (const result of payload.results) {
    const text = JSON.stringify(result).toLowerCase();
    assert(!text.includes("july 6"), "Monthly old-replay query leaked July 6 replay");
    assert(!RESTRICTED_ACCESS.has(result.accessScope), `Monthly old-replay query leaked ${result.accessScope}`);
  }
  assertNoSearchLeaks(payload);
}

function assertPlaybackPayload(payload) {
  assert(payload && typeof payload === "object", "Playback response was not an object");
  assert(typeof payload.resourceId === "string" && payload.resourceId, "Playback response missing resourceId");
  assert(typeof payload.playbackUrl === "string" && payload.playbackUrl, "Playback response missing playbackUrl");
  assert(MONTHLY_ALLOWED_ACCESS.has(payload.accessScope), `Playback response leaked ${payload.accessScope}`);
  assertNoPlaybackRawFields(payload);
}

function appendSearchResourceIds(payload, candidateIds) {
  if (!payload || !Array.isArray(payload.results)) return;
  for (const result of payload.results) {
    if (typeof result.resourceId !== "string" || result.resourceId.trim() === "") continue;
    const resourceId = result.resourceId.trim();
    if (!candidateIds.includes(resourceId)) candidateIds.push(resourceId);
  }
}

async function assertFirstWorkingPlayback(candidateIds, token) {
  assert(candidateIds.length > 0, "No monthly-safe resource IDs were available for playback auto-discovery");

  const attempts = [];
  for (const resourceId of candidateIds) {
    const result = await postJson(PLAYBACK_FUNCTION, { resourceId }, token);
    attempts.push(`${resourceId}:${result.status}`);
    assertNoPlaybackRawFields(result.payload);

    if (result.status === 200) {
      assertPlaybackPayload(result.payload);
      verifiedPlaybackResourceId = resourceId;
      return {
        status: result.status,
        detail: `${result.payload.provider}:${result.payload.urlType}; resourceId=${resourceId}; attempts=${attempts.length}`,
      };
    }

    if (result.status !== 409) {
      throw new Error(
        `Playback candidate ${resourceId} returned unexpected HTTP ${result.status}: ${jsonString(result.payload)}`,
      );
    }
  }

  throw new Error(
    `No playback candidate returned a usable link. Tried ${attempts.join(", ")}. Confirm portal_playback_source import or provide MASTERMIND_PLAYBACK_RESOURCE_ID.`,
  );
}

function artifactSummary(results) {
  return {
    generatedAt: new Date().toISOString(),
    baseUrl: baseFunctionsUrl(),
    monthlyTokenPresent: Boolean(env("MASTERMIND_MONTHLY_JWT")),
    nonMemberTokenPresent: Boolean(env("MASTERMIND_NONMEMBER_JWT")),
    playbackResourceIdPresent: Boolean(env("MASTERMIND_PLAYBACK_RESOURCE_ID")),
    verifiedPlaybackResourceId: verifiedPlaybackResourceId || null,
    results: results.map((result) => ({
      name: result.name,
      functionName: result.functionName,
      status: result.status,
      passed: result.passed,
      detail: result.detail,
    })),
  };
}

function writeArtifact(results) {
  const artifactPath = env("MASTERMIND_LIVE_QA_ARTIFACT");
  if (!artifactPath) return;
  mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${jsonString(artifactSummary(results))}\n`);
}

async function runCase(results, name, functionName, callback) {
  try {
    const detail = await callback();
    results.push({ name, functionName, status: detail?.status ?? null, passed: true, detail: detail?.detail ?? "passed" });
  } catch (error) {
    results.push({
      name,
      functionName,
      status: error?.status ?? null,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function requiredConfig() {
  return {
    SUPABASE_URL: env("SUPABASE_URL"),
    SUPABASE_FUNCTIONS_URL: env("SUPABASE_FUNCTIONS_URL"),
    MASTERMIND_MONTHLY_JWT: env("MASTERMIND_MONTHLY_JWT"),
    MASTERMIND_NONMEMBER_JWT: env("MASTERMIND_NONMEMBER_JWT"),
    MASTERMIND_PLAYBACK_RESOURCE_ID: env("MASTERMIND_PLAYBACK_RESOURCE_ID"),
    MASTERMIND_LIVE_QA_ARTIFACT: env("MASTERMIND_LIVE_QA_ARTIFACT"),
  };
}

function printUsage() {
  console.log(`Mastermind live Edge Function QA

Required for real live QA:
  SUPABASE_URL or SUPABASE_FUNCTIONS_URL
  MASTERMIND_MONTHLY_JWT

Optional:
  MASTERMIND_NONMEMBER_JWT        verifies signed-in non-member/expired access returns 403
  MASTERMIND_PLAYBACK_RESOURCE_ID optional; otherwise playback QA auto-discovers candidates from monthly search results
  MASTERMIND_LIVE_QA_ARTIFACT     writes a redacted JSON result receipt

Dry run:
  npm run qa:mastermind-live-gates:dry-run

Real run:
  SUPABASE_URL="https://<project>.supabase.co" \\
  MASTERMIND_MONTHLY_JWT="<token>" \\
  MASTERMIND_NONMEMBER_JWT="<token>" \\
  MASTERMIND_PLAYBACK_RESOURCE_ID="<optional portal_resource_id>" \\
  npm run qa:mastermind-live-gates
`);
}

async function main() {
  const config = requiredConfig();

  if (dryRun) {
    printUsage();
    console.log("Dry-run config summary:");
    console.log(
      jsonString({
        functionsBase: baseFunctionsUrl() || "(missing)",
        monthlyToken: redact(config.MASTERMIND_MONTHLY_JWT) || "(missing)",
        nonMemberToken: redact(config.MASTERMIND_NONMEMBER_JWT) || "(optional missing)",
        playbackResourceId: config.MASTERMIND_PLAYBACK_RESOURCE_ID || "(optional missing)",
        artifactPath: config.MASTERMIND_LIVE_QA_ARTIFACT || "(optional missing)",
      }),
    );
    return;
  }

  if (!baseFunctionsUrl()) {
    printUsage();
    throw new Error("SUPABASE_URL or SUPABASE_FUNCTIONS_URL is required");
  }
  if (!config.MASTERMIND_MONTHLY_JWT) {
    printUsage();
    throw new Error("MASTERMIND_MONTHLY_JWT is required for live monthly access QA");
  }

  const results = [];
  const playbackCandidateIds = [];

  await runCase(results, "signed_out_search_returns_401", SEARCH_FUNCTION, async () => {
    const result = await postJson(SEARCH_FUNCTION, { query: "sales page", path: "sell", limit: 3 });
    assertStatus(result, 401);
    return { status: result.status };
  });

  await runCase(results, "signed_out_playback_returns_401", PLAYBACK_FUNCTION, async () => {
    const result = await postJson(PLAYBACK_FUNCTION, { resourceId: config.MASTERMIND_PLAYBACK_RESOURCE_ID || "missing" });
    assertStatus(result, 401);
    return { status: result.status };
  });

  if (config.MASTERMIND_NONMEMBER_JWT) {
    await runCase(results, "non_member_search_returns_403", SEARCH_FUNCTION, async () => {
      const result = await postJson(SEARCH_FUNCTION, { query: "sales page", path: "sell", limit: 3 }, config.MASTERMIND_NONMEMBER_JWT);
      assertStatus(result, 403);
      return { status: result.status };
    });
  }

  const monthlySearchCases = [
    {
      name: "monthly_sales_page_search",
      body: {
        query: "sales page",
        path: "sell",
        filters: { includeMetadataFallback: false },
        limit: 6,
      },
    },
    {
      name: "monthly_email_list_search",
      body: {
        query: "email list",
        path: "find",
        filters: { includeMetadataFallback: false },
        limit: 6,
      },
    },
    {
      name: "monthly_ai_search",
      body: {
        query: "AI",
        path: "leverage",
        filters: { includeMetadataFallback: true },
        limit: 6,
      },
    },
  ];

  for (const testCase of monthlySearchCases) {
    await runCase(results, testCase.name, SEARCH_FUNCTION, async () => {
      const result = await postJson(SEARCH_FUNCTION, testCase.body, config.MASTERMIND_MONTHLY_JWT);
      assertStatus(result, 200);
      assertMonthlySearchResults(result.payload, testCase.name);
      appendSearchResourceIds(result.payload, playbackCandidateIds);
      return { status: result.status, detail: `${result.payload.results.length} monthly-safe results` };
    });
  }

  await runCase(results, "monthly_old_replay_query_does_not_leak", SEARCH_FUNCTION, async () => {
    const result = await postJson(
      SEARCH_FUNCTION,
      {
        query: "weekly planning july 6",
        filters: { includeMetadataFallback: false },
        limit: 8,
      },
      config.MASTERMIND_MONTHLY_JWT,
    );
    assertStatus(result, 200);
    assertOldReplayDoesNotLeak(result.payload);
    return { status: result.status, detail: `${result.payload.results.length} allowed results` };
  });

  if (config.MASTERMIND_PLAYBACK_RESOURCE_ID) {
    await runCase(results, "monthly_playback_link_allowed_resource", PLAYBACK_FUNCTION, async () => {
      const result = await postJson(
        PLAYBACK_FUNCTION,
        { resourceId: config.MASTERMIND_PLAYBACK_RESOURCE_ID },
        config.MASTERMIND_MONTHLY_JWT,
      );
      assertStatus(result, 200);
      assertPlaybackPayload(result.payload);
      verifiedPlaybackResourceId = config.MASTERMIND_PLAYBACK_RESOURCE_ID;
      return { status: result.status, detail: `${result.payload.provider}:${result.payload.urlType}` };
    });
  } else {
    await runCase(results, "monthly_playback_link_autodiscovery", PLAYBACK_FUNCTION, async () => {
      return assertFirstWorkingPlayback(playbackCandidateIds, config.MASTERMIND_MONTHLY_JWT);
    });
  }

  if (config.MASTERMIND_NONMEMBER_JWT && verifiedPlaybackResourceId) {
    await runCase(results, "non_member_playback_returns_403", PLAYBACK_FUNCTION, async () => {
      const result = await postJson(
        PLAYBACK_FUNCTION,
        { resourceId: verifiedPlaybackResourceId },
        config.MASTERMIND_NONMEMBER_JWT,
      );
      assertStatus(result, 403);
      assertNoPlaybackRawFields(result.payload);
      return { status: result.status };
    });
  }

  writeArtifact(results);

  const failed = results.filter((result) => !result.passed);
  console.log(jsonString({ passed: failed.length === 0, results }));
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
