#!/usr/bin/env node
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const migration=join(root,'supabase/migrations/20260809130000_replay_vault_deterministic_ingestion.sql');
const approvalMigration=join(root,'supabase/migrations/20260828233500_replay_vault_hidden_preview_approval.sql');
const fixture=join(root,'tools/replay-vault-ingestion-fixtures/publication_authority.sql');
const bin='/opt/homebrew/opt/postgresql@16/bin';
const dir=mkdtempSync(join(tmpdir(),'replay-ingestion-pg16-'));const data=join(dir,'data'),sock=join(dir,'sock');
const port=56000+(process.pid%3000);const env={...process.env,LC_ALL:'en_US.UTF-8',LANG:'en_US.UTF-8',PGHOST:sock,PGPORT:String(port),PGUSER:process.env.USER};
const run=(cmd,args,opt={})=>{const r=spawnSync(cmd,args,{env,encoding:'utf8',...opt});if(r.status!==0)throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r.stdout+r.stderr};
const prelude=join(dir,'prelude.sql');writeFileSync(prelude,String.raw`\set ON_ERROR_STOP on
DO $$BEGIN CREATE ROLE anon NOLOGIN;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
DO $$BEGIN CREATE ROLE authenticated NOLOGIN;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
DO $$BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS;EXCEPTION WHEN duplicate_object THEN NULL;END$$;
GRANT anon,authenticated,service_role TO CURRENT_USER;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE public.mastermind_portal_resources(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portal_resource_id text UNIQUE NOT NULL,title text NOT NULL,product_title text,category_title text,portal_path text,resource_type text DEFAULT 'video',available_until date,stages text[] DEFAULT '{}',success_paths text[] DEFAULT '{}',updated_at timestamptz DEFAULT now());
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
`);
let started=false;
try{run(join(bin,'initdb'),['-D',data,'--no-locale','--encoding=UTF8']);run('/bin/mkdir',['-p',sock]);run(join(bin,'pg_ctl'),['-D',data,'-l',join(data,'postgres.log'),'-o',`-p ${port} -k ${sock}`,'-w','start']);started=true;run(join(bin,'createdb'),['replay_test']);run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','replay_test','-f',prelude]);run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','replay_test','-f',migration]);run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','replay_test','-f',approvalMigration]);const out=run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1','-d','replay_test','-f',fixture]);if(!out.includes('replay_vault_ingestion_pg16_ok'))throw new Error(`success marker missing\n${out}`);console.log('PostgreSQL 16 publication authority fixture: PASS');console.log(out.split('\n').filter(x=>x.includes('replay_vault_ingestion_pg16_ok')).join('\n'));}
finally{if(started)spawnSync(join(bin,'pg_ctl'),['-D',data,'-m','fast','-w','stop'],{env,encoding:'utf8'});rmSync(dir,{recursive:true,force:true});}
