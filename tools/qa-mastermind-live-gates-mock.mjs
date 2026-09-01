import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

const MONTHLY_TOKEN = "mock-monthly-token";
const NONMEMBER_TOKEN = "mock-nonmember-token";

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function bearerToken(request) {
  const auth = request.headers.authorization ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function searchResults(body) {
  const query = String(body.query ?? "").toLowerCase();
  const surface = String(body.surface ?? "");

  if (query.includes("weekly planning july 6") && surface === "recent_replay") {
    return {
      results: [
        {
          resourceId: "portal_weekly_planning_current",
          title: "Weekly Planning",
          productTitle: "Core Curriculum",
          categoryTitle: "Planning",
          portalPath: "/mastermind/resources/weekly-planning",
          accessScope: "core_curriculum",
          stages: ["leverage"],
          resourceType: "video",
          snippet: "Choose the next small planning move for this week.",
          startsAtSeconds: 0,
          reason: "monthly safe planning result",
        },
      ],
    };
  }

  if (query.includes("sales page") && surface === "recent_replay") {
    return {
      results: [
        {
          resourceId: "portal_sales_source_review",
          title: "Sales Page Prep",
          productTitle: "Core Curriculum",
          categoryTitle: "Sales",
          portalPath: "/mastermind/resources/sales-page-prep",
          accessScope: "core_curriculum",
          stages: ["sell"],
          resourceType: "video",
          snippet: "Clarify the page promise before writing sections.",
          startsAtSeconds: 0,
          reason: "tests playback 409 retry",
        },
        {
          resourceId: "portal_sales_page_workshop",
          title: "Sales Page Workshop",
          productTitle: "Current Call Replays",
          categoryTitle: "Weekly Business Retreat",
          portalPath: "/mastermind/resources/sales-page-workshop",
          accessScope: "current_replay_30_day",
          stages: ["sell"],
          resourceType: "video",
          snippet: "Tighten the promise, proof, and next step.",
          startsAtSeconds: 240,
          reason: "tests playback success",
        },
      ],
    };
  }

  if (query.includes("email list") && surface === "curriculum") {
    return {
      results: [
        {
          resourceId: "portal_email_list",
          title: "Grow Your Email List",
          productTitle: "Core Curriculum",
          categoryTitle: "Audience",
          portalPath: "/mastermind/resources/grow-your-email-list",
          accessScope: "core_curriculum",
          stages: ["find"],
          resourceType: "video",
          snippet: "Pick one list growth path and make the next ask.",
          startsAtSeconds: 0,
          reason: "monthly safe list result",
        },
      ],
    };
  }

  if (query.includes("ai") && surface === "curriculum") {
    return {
      results: [
        {
          resourceId: "portal_faith_ai",
          title: "Enable Faith AI",
          productTitle: "Core Curriculum",
          categoryTitle: "Leverage",
          portalPath: "/mastermind/resources/faith-ai",
          accessScope: "core_curriculum",
          stages: ["leverage"],
          resourceType: "tool",
          snippet: "Use your own key for optional AI support.",
          startsAtSeconds: null,
          reason: "monthly safe AI result",
        },
      ],
    };
  }

  return { results: [] };
}

async function handleSearch(request, response) {
  const token = bearerToken(request);
  if (!token) return sendJson(response, 401, { error: "Unauthorized" });
  if (token === NONMEMBER_TOKEN) return sendJson(response, 403, { error: "Forbidden" });
  if (token !== MONTHLY_TOKEN) return sendJson(response, 401, { error: "Unauthorized" });

  const body = await readBody(request);
  return sendJson(response, 200, searchResults(body));
}

async function handlePlayback(request, response) {
  const token = bearerToken(request);
  if (!token) return sendJson(response, 401, { error: "Unauthorized" });
  if (token === NONMEMBER_TOKEN) return sendJson(response, 403, { error: "Forbidden" });
  if (token !== MONTHLY_TOKEN) return sendJson(response, 401, { error: "Unauthorized" });

  const body = await readBody(request);
  if (body.surface !== "recent_replay") {
    return sendJson(response, 404, { error: "Resource not found" });
  }
  if (body.resourceId === "portal_sales_source_review") {
    return sendJson(response, 409, { error: "Playback source needs review" });
  }
  if (body.resourceId !== "portal_sales_page_workshop") {
    return sendJson(response, 404, { error: "Resource not found" });
  }

  return sendJson(response, 200, {
    resourceId: "portal_sales_page_workshop",
    title: "Sales Page Workshop",
    productTitle: "Current Call Replays",
    categoryTitle: "Weekly Business Retreat",
    portalPath: "/mastermind/resources/sales-page-workshop",
    accessScope: "current_replay_30_day",
    resourceType: "video",
    provider: "ghl_google_storage",
    playbackUrl: "https://video.example.test/mastermind/sales-page-workshop.mp4",
    expiresAt: null,
    urlType: "access_checked_direct_url",
  });
}

function makeServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

      if (request.url === "/search-mastermind-resources") {
        return handleSearch(request, response);
      }
      if (request.url === "/get-mastermind-playback-link") {
        return handlePlayback(request, response);
      }

      return sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      return sendJson(response, 500, { error: error instanceof Error ? error.message : "Unexpected mock error" });
    }
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertResultNames(payload, names) {
  const resultNames = new Set(payload.results?.map((result) => result.name) ?? []);
  for (const name of names) {
    assert(resultNames.has(name), `mock run missing result ${name}`);
  }
}

async function runHarness(functionsUrl, artifactPath) {
  const child = spawn(process.execPath, ["tools/qa-mastermind-live-gates.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_FUNCTIONS_URL: functionsUrl,
      MASTERMIND_MONTHLY_JWT: MONTHLY_TOKEN,
      MASTERMIND_NONMEMBER_JWT: NONMEMBER_TOKEN,
      MASTERMIND_LIVE_QA_ARTIFACT: artifactPath,
    },
    encoding: "utf8",
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const status = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  if (status !== 0) {
    throw new Error(`mock live-gates run failed\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }

  return JSON.parse(stdout);
}

async function main() {
  const server = makeServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const functionsUrl = `http://127.0.0.1:${address.port}`;
    const artifactDir = mkdtempSync(path.join(tmpdir(), "mastermind-live-gates-"));
    const artifactPath = path.join(artifactDir, "mock-result.json");
    const payload = await runHarness(functionsUrl, artifactPath);

    assert(payload.passed === true, "mock live-gates payload did not pass");
    assertResultNames(payload, [
      "signed_out_search_returns_401",
      "signed_out_playback_returns_401",
      "non_member_search_returns_403",
      "monthly_sales_page_search",
      "monthly_email_list_search",
      "monthly_ai_search",
      "monthly_old_replay_query_does_not_leak",
      "monthly_playback_link_autodiscovery",
      "non_member_playback_returns_403",
    ]);

    const playbackResult = payload.results.find((result) => result.name === "monthly_playback_link_autodiscovery");
    assert(playbackResult?.detail?.includes("attempts=2"), "mock playback autodiscovery did not exercise retry");
    assert(existsSync(artifactPath), "mock artifact was not written");

    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    assert(artifact.verifiedPlaybackResourceId === "portal_sales_page_workshop", "mock artifact missing verified playback id");

    console.log(JSON.stringify({ passed: true, cases: payload.results.length, artifactPath }, null, 2));
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
