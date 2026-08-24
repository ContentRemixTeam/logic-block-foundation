#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(os.homedir(), 'Desktop/HERMES-FILES/mastermind-private-preview.html');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mastermind-private-preview-'));
const exact = (value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const aliases = { name: 'private-preview-aliases', setup(api) {
  api.onResolve({ filter: exact('@/integrations/supabase/client') }, () => ({ path: path.join(root, 'tools/mastermind-wave4-private-preview-supabase.ts') }));
  api.onResolve({ filter: exact('@/components/Layout') }, () => ({ path: path.join(root, 'tools/mastermind-wave4-private-preview-layout.tsx') }));
} };

try {
  const js = path.join(temp, 'preview.js');
  await build({ entryPoints: [path.join(root, 'tools/mastermind-wave4-private-preview.tsx')], outfile: js, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', tsconfig: path.join(root, 'tsconfig.app.json'), plugins: [aliases], logLevel: 'silent' });
  const css = path.join(temp, 'preview.css');
  const tailwind = spawnSync('npx', ['tailwindcss', '-i', path.join(root, 'src/index.css'), '-o', css, '--minify'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(tailwind.status, 0, tailwind.stderr);
  const script = fs.readFileSync(js, 'utf8').replaceAll('</script', '<\\/script');
  const styles = fs.readFileSync(css, 'utf8');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src 'none'; connect-src 'none'; font-src data:"><title>Private Sample · Mastermind Success Path</title><style>html,body{margin:0}*{box-sizing:border-box}${styles}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, { mode: 0o600 });
  console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), sentinel: 'PRIVATE SAMPLE PREVIEW', network: 'blocked-by-csp' }));
} finally {
  fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
