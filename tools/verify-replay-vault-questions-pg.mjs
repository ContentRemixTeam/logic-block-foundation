#!/usr/bin/env node
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

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
  for(const migration of migrations) run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-f',migration]);
  const out=run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','questions_r1_test','-f',fixture]);
  const marker='replay_vault_questions_answered_r1_pg16_ok';
  if(!out.includes(marker)) throw new Error(`success marker missing\n${out}`);
  console.log('PostgreSQL 16 Questions Answered R1 adversarial fixture: PASS');
  console.log(out.split('\n').filter(line=>line.includes(marker)).join('\n'));
} finally {
  if(started) spawnSync(join(bin,'pg_ctl'),['-D',data,'-m','fast','-w','stop'],{env,encoding:'utf8'});
  rmSync(dir,{recursive:true,force:true});
}
