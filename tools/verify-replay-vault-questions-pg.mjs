#!/usr/bin/env node
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const migrations=[
  join(root,'supabase/migrations/20260809130000_replay_vault_deterministic_ingestion.sql'),
  join(root,'supabase/migrations/20260809150000_replay_vault_questions_answered_r1.sql'),
];
const fixture=join(root,'tools/replay-vault-questions-fixtures/questions_answered_r1.sql');
const bin='/opt/homebrew/opt/postgresql@16/bin';
for(const path of [...migrations,fixture,join(bin,'initdb')]){
  if(!existsSync(path)) throw new Error(`required fixture input missing: ${path}`);
}
const dir=mkdtempSync(join(tmpdir(),'replay-questions-r1-pg16-'));
const data=join(dir,'data');
const sock=join(dir,'sock');
const port=59000+(process.pid%1000);
const env={...process.env,LC_ALL:'en_US.UTF-8',LANG:'en_US.UTF-8',PGHOST:sock,PGPORT:String(port),PGUSER:process.env.USER};
const run=(cmd,args)=>{
  const r=spawnSync(cmd,args,{env,encoding:'utf8'});
  if(r.status!==0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})\n${r.stdout}\n${r.stderr}`);
  return `${r.stdout}${r.stderr}`;
};
const prelude=join(dir,'prelude.sql');
writeFileSync(prelude,String.raw`\set ON_ERROR_STOP on
DO $$BEGIN CREATE ROLE anon NOLOGIN;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
DO $$BEGIN CREATE ROLE authenticated NOLOGIN;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
DO $$BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
GRANT anon,authenticated,service_role TO CURRENT_USER;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.mastermind_portal_resources(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), portal_resource_id text UNIQUE NOT NULL,
 title text NOT NULL, product_title text, category_title text, portal_path text,
 resource_type text DEFAULT 'video', approved_access_scope text, available_until date,
 stages text[] DEFAULT '{}', success_paths text[] DEFAULT '{}', updated_at timestamptz DEFAULT now()
);
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
`);
let started=false;
try{
  run(join(bin,'initdb'),['-D',data,'--no-locale','--encoding=UTF8']);
  run('/bin/mkdir',['-p',sock]);
  run(join(bin,'pg_ctl'),['-D',data,'-l',join(data,'postgres.log'),'-o',`-p ${port} -k ${sock}`,'-w','start']);
  started=true;
  run(join(bin,'createdb'),['questions_r1_test']);
  run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-f',prelude]);
  run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-f',migrations[0]]);
  // Reapply the exact Questions migration in the same PG16 database.
  run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-f',migrations[1]]);
  run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-f',migrations[1]]);
  const out=run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-f',fixture]);
  const marker='replay_vault_questions_answered_r2_pg16_ok';
  if(!out.includes(marker)) throw new Error(`success marker missing\n${out}`);
  const concurrentSql=`SET ROLE service_role; SELECT public.replay_questions_create_candidate('20000000-0000-0000-0000-000000000001',0,2000,11000,29000,'extractor-concurrency-r2','Concurrent question?');`;
  const concurrent=()=>new Promise(resolve=>{
    const child=spawn(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-c',concurrentSql],{env});
    let stdout=''; let stderr='';
    child.stdout.on('data',value=>stdout+=value); child.stderr.on('data',value=>stderr+=value);
    child.on('close',status=>resolve({status,stdout,stderr}));
  });
  const results=await Promise.all([concurrent(),concurrent()]);
  if(results.filter(result=>result.status===0).length!==1 || results.filter(result=>result.status!==0).length!==1)
    throw new Error(`concurrent duplicate creation did not fail closed: ${JSON.stringify(results)}`);
  const count=run(join(bin,'psql'),['-X','-At','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-c',
    "SELECT count(*) FROM public.replay_question_candidates WHERE extractor_version='extractor-concurrency-r2'"]).trim();
  if(count!=='1') throw new Error(`concurrent duplicate durable count was ${count}`);
  console.log('PostgreSQL 16 Questions Answered R2 adversarial fixture: PASS');
  console.log('Exact Questions migration apply-twice: PASS');
  console.log('Concurrent duplicate candidate: one success, one denial, one durable row: PASS');
  console.log(out.split('\n').filter(line=>line.includes(marker)).join('\n'));
} finally {
  if(started) spawnSync(join(bin,'pg_ctl'),['-D',data,'-m','fast','-w','stop'],{env,encoding:'utf8'});
  rmSync(dir,{recursive:true,force:true});
}
