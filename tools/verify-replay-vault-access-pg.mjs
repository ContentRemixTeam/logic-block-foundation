#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const data=mkdtempSync(path.join(tmpdir(),"replay-vault-pg16-data-"));
const socket=mkdtempSync(path.join(tmpdir(),"replay-vault-pg16-sock-"));
const port=56000+Math.floor(Math.random()*5000),db="replay_vault_access_test";
const env={...process.env,LC_ALL:"en_US.UTF-8",LANG:"en_US.UTF-8",PGHOST:socket,PGPORT:String(port),PGDATABASE:db};
function run(command,args,{allowFailure=false}={}) {
  const result=spawnSync(command,args,{ env,encoding:"utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!allowFailure&&result.status!==0) throw new Error(`${command} failed (${result.status})`);
  return result;
}
function psql(args=[]) { return run("/opt/homebrew/bin/psql",["-X","-v","ON_ERROR_STOP=1",...args]); }
function concurrentSql(sql) {
  return new Promise((resolve,reject)=>{
    const child=spawn("/opt/homebrew/bin/psql",["-X","-v","ON_ERROR_STOP=1","-Atqc",sql],{env,stdio:["ignore","pipe","pipe"]});
    let out="",err="";child.stdout.on("data",d=>out+=d);child.stderr.on("data",d=>err+=d);
    child.on("close",code=>code===0?resolve(out.trim()):reject(new Error(`concurrent psql ${code}: ${err}`)));
  });
}
let started=false;
try {
  run("/opt/homebrew/bin/initdb",["-D",data,"--auth=trust","--no-instructions"]);
  run("/opt/homebrew/bin/pg_ctl",["-D",data,"-l",path.join(data,"postgres.log"),"-o",`-p ${port} -k ${socket}`,"-w","start"]);started=true;
  run("/opt/homebrew/bin/createdb",[db]);
  psql(["-f",path.join(root,"tools/replay-vault-access-fixtures/mock-base.sql")]);
  psql(["-f",path.join(root,"supabase/migrations/20260809120000_replay_vault_access_hardening.sql")]);
  psql(["-f",path.join(root,"tools/replay-vault-access-fixtures/behavior.sql")]);

  const call=`SELECT public.apply_replay_vault_webhook_event('ghl','evt-concurrent','ord-c','concurrent@example.com','grant','annual-product','annual-price',repeat('9',64),'2026-08-09','2027-08-09')::text`;
  const results=await Promise.all([concurrentSql(call),concurrentSql(call)]);
  if (!results.some(x=>x.includes('"replayed": false'))||!results.some(x=>x.includes('"replayed": true'))) throw new Error(`concurrency semantics failed: ${results.join(' | ')}`);
  const probe=psql(["-Atqc",`DO $$ BEGIN
    IF (SELECT count(*) FROM public.replay_vault_webhook_events WHERE provider='ghl' AND event_id='evt-concurrent')<>1 THEN RAISE EXCEPTION 'concurrent duplicate ledger count'; END IF;
    IF (SELECT access_expires_at FROM public.replay_vault_entitlements WHERE normalized_email='concurrent@example.com') ::date <> '2027-08-09'::date THEN RAISE EXCEPTION 'concurrent duplicate stacked expiry'; END IF;
  END $$; SELECT 'PASS replay_vault_concurrency_duplicate';`]);
  if (probe.status!==0) throw new Error("concurrency probe failed");
  console.log(`Replay Vault PostgreSQL 16 fixture passed (port ${port})`);
} finally {
  if (started) run("/opt/homebrew/bin/pg_ctl",["-D",data,"-m","fast","-w","stop"],{allowFailure:true});
  rmSync(data,{recursive:true,force:true});rmSync(socket,{recursive:true,force:true});
}
