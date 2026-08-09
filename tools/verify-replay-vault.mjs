import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
function requireText(file, text, label) {
  if (!read(file).includes(text)) failures.push(`${label}: ${file} is missing ${JSON.stringify(text)}`);
}

// Product/UI regression guards remain supplemental; access/security proof is executable below.
const vault = "src/pages/ReplayVault.tsx";
requireText(vault, "invoke('get-mastermind-portal-access'", "protected access status");
requireText(vault, "invoke('search-mastermind-resources'", "protected transcript search");
requireText(vault, "invoke('get-mastermind-playback-link'", "protected playback lookup");
requireText(vault, "onLoadedMetadata={handleLoadedMetadata}", "metadata-gated exact seek");
requireText("src/components/replay-vault/useVaultSeekCoordinator.ts", "applySeekTarget(media, targetSeconds)", "exact timestamp seek coordinator");
requireText(vault, "You can search the approved current replay window. Older archive results stay private.", "limited current-replay explanation");
requireText("src/App.tsx", 'path="/mastermind/replay-vault"', "Replay Vault route");
requireText("src/App.tsx", "<MastermindGate><PageSuspense><ReplayVault />", "admin launch gate retained");
requireText("supabase/config.toml", "[functions.get-mastermind-portal-access]", "access Edge Function config");
requireText("supabase/config.toml", "[functions.ghl-webhook-grant-planner]", "webhook Edge Function config");
for (const nav of ["src/components/AppSidebar.tsx", "src/components/sidebar/MobileSidebarContent.tsx"]) {
  if (read(nav).includes("/mastermind/replay-vault")) failures.push(`launch gate: ${nav} exposes the unfinished Replay Vault`);
}
if (failures.length) {
  console.error("Replay Vault structural verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const behavior = spawnSync(process.execPath, ["tools/verify-replay-vault-ux.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (behavior.status !== 0) process.exit(behavior.status ?? 1);

const npm = process.env.npm_execpath ? process.execPath : "/Users/faithhawks/.local/bin/npm";
const args = process.env.npm_execpath
  ? [process.env.npm_execpath, "run", "verify:replay-vault-access"]
  : ["run", "verify:replay-vault-access"];
const proof = spawnSync(npm, args, { cwd: root, stdio: "inherit", env: process.env });
if (proof.status !== 0) process.exit(proof.status ?? 1);

console.log("Replay Vault verification passed: executable UX, Edge, PostgreSQL 16 access/security fixtures, and hidden UI launch gate are green.");
