#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const names=["20260809130000_replay_vault_deterministic_ingestion.sql","20260809140000_replay_vault_access_hardening.sql",
  "20260809150000_replay_vault_questions_answered_r1.sql","20260809160500_replay_vault_member_interactions_r2.sql",
  "20260809170000_replay_vault_member_parity_r4.sql","20260809180000_replay_vault_commercial_evidence_r7.sql",
  "20260809190000_replay_vault_complete_search_r1.sql","20260820183000_replay_vault_annual_only_access_r10.sql"];
const migrations=names.map(name=>path.join(root,"supabase/migrations",name));
for(const file of migrations) if(!existsSync(file)) throw new Error(`missing migration ${file}`);
if([...names].sort().join("|")!==names.join("|")) throw new Error("migration order is not exact");
console.log(`MIGRATION_ORDER ${names.map(name=>name.slice(8,14)).join("→")}`);
const base="b5b80651d410f89ffdd20dc2cf846aa184974a03";
for(const name of names.slice(0,2)) {
  const committed=spawnSync("git",["show",`${base}:supabase/migrations/${name}`],{cwd:root,encoding:"utf8"});
  if(committed.status!==0) throw new Error(`cannot read accepted base ${name}`);
  const actual=readFileSync(path.join(root,"supabase/migrations",name));
  const expected=Buffer.from(committed.stdout);
  const hash=value=>createHash("sha256").update(value).digest("hex");
  if(hash(actual)!==hash(expected)) throw new Error(`historical migration drift ${name}`);
  console.log(`EXACT_BASE ${name} sha256=${hash(actual)}`);
}
function cluster(label) {
  const data=mkdtempSync(path.join(tmpdir(),`rv-r7-${label}-data-`));
  const socket=mkdtempSync(path.join(tmpdir(),`rv-r7-${label}-sock-`));
  const port=57500+Math.floor(Math.random()*2500),db=`rv_r7_${label}`;
  const env={...process.env,PGHOST:socket,PGPORT:String(port),PGDATABASE:db,LC_ALL:"en_US.UTF-8",LANG:"en_US.UTF-8"};
  let started=false;
  function run(command,args,{allowFailure=false}={}) { const r=spawnSync(command,args,{env,encoding:"utf8"});
    if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);
    if(!allowFailure&&r.status!==0)throw new Error(`${label}: ${command} failed ${r.status}`);return r; }
  const psql=(args=[])=>run("/opt/homebrew/bin/psql",["-X","-v","ON_ERROR_STOP=1",...args]);
  function start(){run("/opt/homebrew/bin/initdb",["-D",data,"--auth=trust","--no-instructions"]);
    run("/opt/homebrew/bin/pg_ctl",["-D",data,"-l",path.join(data,"postgres.log"),"-o",`-p ${port} -k ${socket} -c max_connections=180`,"-w","start"]);started=true;
    run("/opt/homebrew/bin/createdb",[db]);
    psql(["-f",path.join(root,"tools/replay-vault-access-fixtures/mock-base.sql")]);
    psql(["-c",`CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE FUNCTION public.update_updated_at_column()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=now();RETURN NEW;END$$;
      CREATE FUNCTION auth.uid()RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULL::uuid$$;`]);
    psql(["-f",path.join(root,"supabase/migrations/20251224152606_f3c415a2-b1d5-4412-b892-cc8bba7e0180.sql")]);
  }
  function stop(){if(started)run("/opt/homebrew/bin/pg_ctl",["-D",data,"-m","fast","-w","stop"],{allowFailure:true});
    rmSync(data,{recursive:true,force:true});rmSync(socket,{recursive:true,force:true});}
  function concurrent(sql){return new Promise((resolve,reject)=>{const child=spawn("/opt/homebrew/bin/psql",["-X","-v","ON_ERROR_STOP=1","-Atqc",sql],{env,stdio:["ignore","pipe","pipe"]});
    let out="",err="";child.stdout.on("data",d=>out+=d);child.stderr.on("data",d=>err+=d);child.on("close",code=>code===0?resolve(out.trim()):reject(new Error(`${label} concurrent ${code}: ${err}`)));});}
  return{start,stop,psql,concurrent,port};
}
const sig=i=>String(i%10).repeat(64);
const call=({event,order="concurrent-order",transaction,parentOrder=null,parentTransaction=null,email="hundred@example.com",type="grant",effective="2026-08-09",expires="2027-08-09",hash="7".repeat(64),signature="8".repeat(64)})=>
  `SELECT public.apply_replay_vault_commercial_event_r7('ghl','${event}',${order?`'${order}'`:'NULL'},${transaction?`'${transaction}'`:'NULL'},${parentOrder?`'${parentOrder}'`:'NULL'},${parentTransaction?`'${parentTransaction}'`:'NULL'},'${email}','${type}','vault','annual','${hash}','${signature}',1786291200,'${effective}',${expires?`'${expires}'`:'NULL'})::text`;
const fresh=cluster("fresh");
try{
  fresh.start();for(const migration of migrations)fresh.psql(["-f",migration]);fresh.psql(["-f",migrations.at(-1)]);
  console.log("PASS latest_migration_apply_twice_fresh");
  fresh.psql(["-f",path.join(root,"tools/replay-vault-commercial-r7-fixtures/behavior.sql")]);
  fresh.psql(["-f",path.join(root,"tools/replay-vault-complete-search-fixtures/behavior.sql")]);
  const hundred=await Promise.all(Array.from({length:100},(_,i)=>fresh.concurrent(call({event:`evt-100-${i}`,transaction:"charge-100",hash:sig(i),signature:sig(i+1)}))));
  if(hundred.filter(value=>value.includes('"replayed": false')).length!==1||hundred.filter(value=>value.includes('"replayed": true')).length!==99)
    throw new Error("100-way duplicate did not produce one apply plus 99 replays");
  fresh.psql(["-Atqc",`DO $$BEGIN
    IF(SELECT count(*)FROM public.replay_vault_purchase_contributions WHERE provider='ghl'AND transaction_id='charge-100')<>1 THEN RAISE EXCEPTION '100-way contribution count';END IF;
    IF(SELECT count(*)FROM public.replay_vault_commercial_deliveries WHERE provider='ghl'AND transaction_id='charge-100')<>100 THEN RAISE EXCEPTION '100-way delivery evidence count';END IF;
  END$$;SELECT 'PASS replay_vault_r7_100_way_duplicate';`]);
  fresh.psql(["-Atqc",call({event:"ctrl-old",order:"ctrl-order",transaction:"ctrl-charge-1",email:"control@example.com",effective:"2026-01-01",expires:"2027-01-01"})]);
  const renewal=call({event:"ctrl-renew",order:"ctrl-order",transaction:"ctrl-charge-2",email:"control@example.com",type:"renewal",effective:"2027-01-01",expires:"2028-01-01"});
  const refund=call({event:"ctrl-refund",order:null,transaction:null,parentOrder:"ctrl-order",parentTransaction:"ctrl-charge-1",email:"control@example.com",type:"refund",effective:"2027-02-01",expires:null});
  await Promise.all([fresh.concurrent(renewal),fresh.concurrent(refund)]);
  fresh.psql(["-Atqc",`DO $$DECLARE j jsonb;BEGIN
    j:=public.replay_vault_access_decision('99999999-9999-4999-8999-999999999999','control@example.com',NULL,'access',false,'2027-02-01');
    IF j->>'memberTier'<>'annual' THEN RAISE EXCEPTION 'renewal/refund concurrency exact authority %',j;END IF;END$$;
    SELECT 'PASS replay_vault_r7_concurrent_renewal_refund';`]);
  fresh.psql(["-Atqc",call({event:"double-old",order:"double-order",transaction:"double-charge",email:"double@example.com",effective:"2026-01-01",expires:"2027-01-01"})]);
  await Promise.all([
    fresh.concurrent(call({event:"double-refund",order:null,transaction:null,parentOrder:"double-order",parentTransaction:"double-charge",email:"double@example.com",type:"refund",effective:"2026-06-01",expires:null})),
    fresh.concurrent(call({event:"double-chargeback",order:null,transaction:null,parentOrder:"double-order",parentTransaction:"double-charge",email:"double@example.com",type:"chargeback",effective:"2026-06-02",expires:null})),
  ]);
  fresh.psql(["-Atqc",`DO $$BEGIN IF(SELECT count(*)FROM public.replay_vault_purchase_lifecycle_evidence WHERE parent_transaction_id='double-charge')<>2
    OR(SELECT status FROM public.replay_vault_entitlements WHERE normalized_email='double@example.com')<>'revoked' THEN RAISE EXCEPTION 'refund/chargeback concurrency';END IF;END$$;
    SELECT 'PASS replay_vault_r7_concurrent_refund_chargeback';`]);
  console.log(`PASS fresh_full_stack_pg16 port=${fresh.port}`);
}finally{fresh.stop();}
const upgrade=cluster("upgrade");
try{
  upgrade.start();upgrade.psql(["-f",migrations[0]]);upgrade.psql(["-f",migrations[1]]);
  upgrade.psql(["-f",path.join(root,"tools/replay-vault-commercial-r7-fixtures/upgrade-seed.sql")]);
  for(const migration of migrations.slice(2))upgrade.psql(["-f",migration]);
  upgrade.psql(["-f",migrations.at(-1)]);console.log("PASS latest_migration_apply_twice_upgrade");
  upgrade.psql(["-f",path.join(root,"tools/replay-vault-commercial-r7-fixtures/upgrade-assert.sql")]);
  console.log(`PASS exact_base_upgrade_pg16 port=${upgrade.port}`);
}finally{upgrade.stop();}
console.log("Replay Vault commercial evidence R7 fresh + exact-base-upgrade PG16 verifier passed.");
