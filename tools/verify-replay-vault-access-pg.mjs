#!/usr/bin/env node
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const migrationNames=[
  "20260809130000_replay_vault_deterministic_ingestion.sql",
  "20260809140000_replay_vault_access_hardening.sql",
];
if ([...migrationNames].sort().join()!==migrationNames.join()) throw new Error("migration order");
const migrations=migrationNames.map((name)=>path.join(root,"supabase/migrations",name));
for (const migration of migrations) if (!existsSync(migration)) throw new Error(`checked-in migration missing: ${migration}`);

const data=mkdtempSync(path.join(tmpdir(),"replay-vault-pg16-data-"));
const socket=mkdtempSync(path.join(tmpdir(),"replay-vault-pg16-sock-"));
const port=56000+Math.floor(Math.random()*5000),db="replay_vault_access_test";
const env={...process.env,LC_ALL:"en_US.UTF-8",LANG:"en_US.UTF-8",PGHOST:socket,PGPORT:String(port),PGDATABASE:db};
function run(command,args,{allowFailure=false}={}) {
  const result=spawnSync(command,args,{env,encoding:"utf8"});
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!allowFailure&&result.status!==0) throw new Error(`${command} failed (${result.status})`);
  return result;
}
function psql(args=[]) { return run("/opt/homebrew/bin/psql",["-X","-v","ON_ERROR_STOP=1",...args]); }
function concurrentSql(sql) {
  return new Promise((resolve,reject)=>{
    const child=spawn("/opt/homebrew/bin/psql",["-X","-v","ON_ERROR_STOP=1","-Atqc",sql],{env,stdio:["ignore","pipe","pipe"]});
    let out="",err=""; child.stdout.on("data",d=>out+=d); child.stderr.on("data",d=>err+=d);
    child.on("close",code=>code===0?resolve(out.trim()):reject(new Error(`concurrent psql ${code}: ${err}`)));
  });
}
let started=false;
try {
  run("/opt/homebrew/bin/initdb",["-D",data,"--auth=trust","--no-instructions"]);
  run("/opt/homebrew/bin/pg_ctl",["-D",data,"-l",path.join(data,"postgres.log"),"-o",`-p ${port} -k ${socket} -c max_connections=140`,"-w","start"]); started=true;
  run("/opt/homebrew/bin/createdb",[db]);
  psql(["-f",path.join(root,"tools/replay-vault-access-fixtures/mock-base.sql")]);
  for (const migration of migrations) psql(["-f",migration]);
  psql(["-f",path.join(root,"tools/replay-vault-access-fixtures/behavior.sql")]);

  // One hundred delivery IDs for one semantic commercial transaction must
  // produce exactly one transition and ninety-nine durable replays.
  const calls=Array.from({length:100},(_,i)=>concurrentSql(
    `SELECT public.apply_replay_vault_webhook_event('ghl','evt-semantic-${i}','ord-semantic-100','hundred@example.com','grant','annual-product','annual-price',repeat('7',64),'2026-08-09','2027-08-09')::text`
  ));
  const results=await Promise.all(calls);
  if (results.filter(x=>x.includes('"replayed": false')).length!==1 || results.filter(x=>x.includes('"replayed": true')).length!==99)
    throw new Error(`100-way semantic concurrency semantics failed: ${results.join(" | ")}`);
  psql(["-Atqc",`DO $$ BEGIN
    IF (SELECT count(*) FROM public.replay_vault_webhook_events WHERE provider='ghl' AND semantic_transaction_key='purchase:ord-semantic-100')<>1 THEN RAISE EXCEPTION '100-way semantic ledger count'; END IF;
    IF (SELECT access_expires_at FROM public.replay_vault_entitlements WHERE normalized_email='hundred@example.com')::date<>'2027-08-09'::date THEN RAISE EXCEPTION '100-way duplicate stacked expiry'; END IF;
  END $$; SELECT 'PASS replay_vault_100_way_semantic_duplicate';`]);

  // Distinct renewal transaction IDs are distinct commercial evidence and
  // therefore stack exactly once each.
  psql(["-Atqc",`DO $$ DECLARE a jsonb;b jsonb;BEGIN
    a:=public.apply_replay_vault_webhook_event('ghl','evt-renew-1','ord-renew-1','renewal@example.com','grant','annual-product','annual-price',repeat('5',64),'2026-08-09',NULL);
    b:=public.apply_replay_vault_webhook_event('ghl','evt-renew-2','ord-renew-2','renewal@example.com','renewal','annual-product','annual-price',repeat('6',64),'2027-08-09',NULL);
    IF NOT (a->>'success')::boolean OR NOT (b->>'success')::boolean THEN RAISE EXCEPTION 'distinct renewals rejected';END IF;
    IF (SELECT count(*) FROM public.replay_vault_webhook_events WHERE normalized_email='renewal@example.com' AND status='applied')<>2 THEN RAISE EXCEPTION 'distinct renewal ledger count';END IF;
    IF (SELECT access_expires_at FROM public.replay_vault_entitlements WHERE normalized_email='renewal@example.com')::date<>'2028-08-09'::date THEN RAISE EXCEPTION 'distinct renewals did not stack twice';END IF;
  END$$; SELECT 'PASS replay_vault_two_distinct_renewals';`]);
  console.log(`Replay Vault PostgreSQL 16 exact checked-in 1300→1400 fixture passed (port ${port})`);
} finally {
  if (started) run("/opt/homebrew/bin/pg_ctl",["-D",data,"-m","fast","-w","stop"],{allowFailure:true});
  rmSync(data,{recursive:true,force:true}); rmSync(socket,{recursive:true,force:true});
}
