from __future__ import annotations

import importlib.util
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
CLI=ROOT/"tools/manage-replay-vault-questions.py"
MIGRATION=ROOT/"supabase/migrations/20260809150000_replay_vault_questions_answered_r1.sql"
spec=importlib.util.spec_from_file_location("questions_cli",CLI)
if spec is None or spec.loader is None:
    raise RuntimeError("could not load private questions CLI")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class QuestionsPrivateCliTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp=tempfile.TemporaryDirectory()
        self.dir=Path(self.tmp.name)
        self.version={"transcript_version":{"id":"tv-1","resource_id":"r-1","normalized_sha256":"a"*64,"last_ms":60000}}
        self.segments={"segments":[
            {"segment_index":0,"starts_at_ms":0,"ends_at_ms":10000,"transcript_text_private":"How do I choose?"},
            {"segment_index":1,"starts_at_ms":10000,"ends_at_ms":30000,"transcript_text_private":"Choose one useful action."},
            {"segment_index":2,"starts_at_ms":30000,"ends_at_ms":60000,"transcript_text_private":"Review the result."},
        ]}
        self.request={"playback_attempt_id":"media-1","media_snapshot_sha256":"b"*64,"media_duration_ms":60000,
            "question_segment_index":0,"question_start_ms":1000,"answer_start_ms":10000,"answer_end_ms":30000,
            "extractor_version":"extractor-r1","proposed_question_private":"How do I choose?"}

    def tearDown(self) -> None: self.tmp.cleanup()

    def private_json(self,name: str,value: object) -> Path:
        path=self.dir/name; path.write_text(json.dumps(value),encoding="utf-8"); path.chmod(0o600); return path

    def run_cli(self,*args: str,optimize: bool=False) -> subprocess.CompletedProcess[str]:
        command=[sys.executable]
        if optimize: command.append("-O")
        command.extend([str(CLI),*args])
        return subprocess.run(command,text=True,capture_output=True)

    def extract_cli(self,optimize: bool=False) -> Path:
        version=self.private_json("version.json",self.version); segments=self.private_json("segments.json",self.segments)
        request=self.private_json("request.json",self.request); output=self.dir/"candidate.json"
        result=self.run_cli("extract-private","--transcript-version",str(version),"--segments",str(segments),
            "--request",str(request),"--output",str(output),optimize=optimize)
        self.assertEqual(result.returncode,0,result.stderr); self.assertIn("publishable=0",result.stdout)
        self.assertEqual(stat.S_IMODE(output.stat().st_mode),0o600); return output

    def test_exact_bounded_excerpt_and_hash(self) -> None:
        output=self.extract_cli(); value=json.loads(output.read_text())
        self.assertEqual(value["origin"],"generated"); self.assertFalse(value["publishable"])
        self.assertEqual(value["raw_excerpt_private"],"0:0:10000:How do I choose?\n1:10000:30000:Choose one useful action.")
        import hashlib
        self.assertEqual(value["raw_excerpt_sha256"],hashlib.sha256(value["raw_excerpt_private"].encode()).hexdigest())

    def test_full_private_review_path_and_separation(self) -> None:
        current=self.extract_cli()
        steps=[("privacy_review","curator"),("editorial_review","privacy"),("seek_verification","editor"),("approved","seek")]
        for index,(target,actor) in enumerate(steps):
            output=self.dir/f"candidate-{index}.json"; event=self.dir/f"event-{index}.json"
            result=self.run_cli("transition-private","--candidate",str(current),"--target-state",target,"--actor",actor,
                "--reason","review evidence","--checklist-version",f"v{index}","--output",str(output),"--event-output",str(event))
            self.assertEqual(result.returncode,0,result.stderr); self.assertEqual(stat.S_IMODE(event.stat().st_mode),0o600)
            current=output
        final=json.loads(current.read_text()); self.assertEqual(final["state"],"approved"); self.assertEqual(final["origin"],"human_curated")
        self.assertEqual(len(final["events"]),4)

    def test_same_privacy_editorial_reviewer_denied(self) -> None:
        current=self.extract_cli(); promoted=self.dir/"promoted.json"; event=self.dir/"promote-event.json"
        first=self.run_cli("transition-private","--candidate",str(current),"--target-state","privacy_review","--actor","curator",
            "--reason","explicit","--checklist-version","v1","--output",str(promoted),"--event-output",str(event))
        self.assertEqual(first.returncode,0,first.stderr)
        privacy=self.dir/"privacy.json"; pe=self.dir/"privacy-event.json"
        second=self.run_cli("transition-private","--candidate",str(promoted),"--target-state","editorial_review","--actor","reviewer",
            "--reason","privacy","--checklist-version","v1","--output",str(privacy),"--event-output",str(pe))
        self.assertEqual(second.returncode,0,second.stderr)
        denied=self.run_cli("transition-private","--candidate",str(privacy),"--target-state","seek_verification","--actor","reviewer",
            "--reason","editorial","--checklist-version","v1","--output",str(self.dir/"no.json"),"--event-output",str(self.dir/"no-event.json"))
        self.assertNotEqual(denied.returncode,0); self.assertIn("reviewers must differ",denied.stderr)

    def test_invalid_transition_and_tamper_denied(self) -> None:
        output=self.extract_cli(); value=json.loads(output.read_text()); value["proposed_question_private"]="tampered"
        output.write_text(json.dumps(value)); output.chmod(0o600)
        result=self.run_cli("transition-private","--candidate",str(output),"--target-state","approved","--actor","x",
            "--reason","x","--checklist-version","x","--output",str(self.dir/"no.json"),"--event-output",str(self.dir/"e.json"))
        self.assertNotEqual(result.returncode,0); self.assertFalse((self.dir/"no.json").exists())

    def test_symlink_and_open_mode_denied(self) -> None:
        target=self.private_json("target.json",self.version); link=self.dir/"link.json"; link.symlink_to(target)
        seg=self.private_json("s.json",self.segments); req=self.private_json("r.json",self.request)
        denied=self.run_cli("extract-private","--transcript-version",str(link),"--segments",str(seg),"--request",str(req),"--output",str(self.dir/"out.json"))
        self.assertNotEqual(denied.returncode,0); self.assertIn("symlinks",denied.stderr)
        target.chmod(0o644)
        denied2=self.run_cli("extract-private","--transcript-version",str(target),"--segments",str(seg),"--request",str(req),"--output",str(self.dir/"out2.json"))
        self.assertNotEqual(denied2.returncode,0); self.assertIn("0600",denied2.stderr)

    def test_optimized_mode_keeps_guards(self) -> None:
        output=self.extract_cli(optimize=True); self.assertTrue(output.exists())
        help_result=self.run_cli("--help",optimize=True)
        self.assertEqual(help_result.returncode,0); self.assertNotIn("publish ",help_result.stdout.lower())

    def test_migration_static_security_contract(self) -> None:
        sql=MIGRATION.read_text()
        self.assertIn("publication_enabled boolean NOT NULL DEFAULT false",sql)
        self.assertNotIn("GRANT SELECT ON public.replay_published_answers_projection TO authenticated",sql)
        self.assertIn("SET search_path = pg_catalog, public",sql)
        self.assertIn("origin<>'human_curated'",sql)
        self.assertIn("privacy_reviewer=a.editorial_reviewer",sql)
        self.assertIn("replay_questions_excerpt",sql)
        self.assertIn("REVOKE ALL ON TABLE public.replay_question_publication_controls",sql)

if __name__=="__main__": unittest.main(verbosity=2)
