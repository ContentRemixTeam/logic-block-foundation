from pathlib import Path
import csv, hashlib, re

base = Path('/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-curriculum-audit-overnight-20260822/outputs/mastermind-curriculum-audit-2026-08-22')
rows = list(csv.DictReader((base / 'success-path-24-milestone-candidate-matrix.csv').read_text('utf-8-sig').splitlines()))

def clean(s):
    return re.sub(r"\s+", ' ', s or '').strip()

def sql(s):
    return "'" + s.replace("'", "''") + "'"

gapfill = {
    8:  {'title': 'Digital Product Lab — Day 2 (conversion testing section)', 'prov': 'from-membershipio/digital-product-lab-day-2.md', 'srcid': 'dpl-day-2', 'sys': 'membershipio'},
    12: {'title': 'BBA Content Crush (audience questions section)', 'prov': 'content-repurpose-audit/transcripts/business-breakthroughs-academy-content-crush.txt', 'srcid': 'bba-content-crush', 'sys': 'transcript-library'},
    14: {'title': 'Money Moves Sprint — Day 3 (sales plan section)', 'prov': 'from-membershipio/money-moves-sprint-day-three.md', 'srcid': 'money-moves-day-3', 'sys': 'membershipio'},
    17: {'title': 'Digital Product Lab — Day 1 (transformation square)', 'prov': 'from-membershipio/digital-product-lab-day-1.md', 'srcid': 'dpl-day-1', 'sys': 'membershipio'},
    19: {'title': 'Digital Product Lab — Day 1 (accountability section)', 'prov': 'from-membershipio/digital-product-lab-day-1.md', 'srcid': 'dpl-day-1', 'sys': 'membershipio'},
    23: {'title': 'BBA Systems for Scaling', 'prov': 'content-repurpose-audit/transcripts/business-breakthroughs-academy-systems-for-scaling.txt', 'srcid': 'bba-systems-for-scaling', 'sys': 'transcript-library'},
    24: {'title': 'Magic Evaluation of Strategic Improvement', 'prov': 'from-membershipio/magic-evaluation-of-strategic-improvement-links-in-the-description.md', 'srcid': 'magic-evaluation', 'sys': 'membershipio'},
}

version_key = 'success-path-catalog-v1'
created_by = 'curriculum-approval-migration-2026-08-25'

L = []
L.append('-- Mastermind Success Path: real curriculum catalog seed (24 milestones).')
L.append('-- Generated from the approved 24-milestone candidate matrix (2026-08-22 audit)')
L.append('-- + transcript gap-fill sweep (2026-08-25).')
L.append('-- Honest state: every item is `candidate`, QA states default `pending`, no media attached.')
L.append('-- Published through the canonical draft->publish path with a content receipt.')
L.append('')
L.append('BEGIN;')
L.append('')
L.append('INSERT INTO public.curriculum_catalog_versions (')
L.append('  catalog_context, version_key, version_number, lifecycle_state, created_by')
L.append(') VALUES (')
L.append("  'planner_learning', 'success-path-catalog-v1', 1, 'draft', 'curriculum-approval-migration-2026-08-25');")
L.append('')
L.append('INSERT INTO public.curriculum_catalog_items (')
L.append('  catalog_version_id, stable_item_key, item_state, stage, milestone_key, milestone_title, item_role, item_order,')
L.append('  title, intended_output, action_prompt, evidence_prompt, teacher_display_name, attribution_text,')
L.append('  source_system, source_native_id, source_provenance, provenance_sha256, created_by')
L.append(')')
L.append("SELECT v.catalog_version_id, i.* FROM (SELECT catalog_version_id FROM public.curriculum_catalog_versions WHERE version_key = 'success-path-catalog-v1') v, (VALUES")

vals = []
for idx, r in enumerate(rows, 1):
    stage = r['stage'].lower()
    milestone = r['milestone']
    src_title = clean(r['primary_title'])
    prov = clean(r['primary_provenance'])
    srcid = clean(r['primary_source_id'])
    sys = 'membershipio'
    if r['status'] == 'Gap' and idx in gapfill:
        g = gapfill[idx]
        src_title = g['title']
        prov = g['prov']
        srcid = g['srcid']
        sys = g['sys']
    state = 'gap' if (r['status'] == 'Gap' and idx not in gapfill) else 'candidate'
    why = clean(r['why_it_fits'])
    act = clean(r['concrete_member_action'])
    ev = clean(r['expected_evidence'])
    mk = stage + '-m' + str(idx).zfill(2)
    prov_hash = hashlib.sha256(prov.encode()).hexdigest()
    vals.append(
        '  (' + sql(mk) + ', ' + sql(state) + ', ' + sql(stage) + ', ' + sql(mk) + ', ' + sql(milestone) + ", 'primary', " + str(idx) + ', '
        + sql(src_title) + ', ' + sql(act) + ', ' + sql(why) + ', ' + sql(ev) + ", 'Faith Mariah', " + sql(src_title) + ', '
        + sql(sys) + ', ' + sql(srcid) + ', ' + sql(prov) + ', ' + sql(prov_hash) + ', ' + sql(created_by) + ')'
    )

L.append(',\n'.join(vals))
L.append(') AS i(')
L.append('  stable_item_key, item_state, stage, milestone_key, milestone_title, item_role, item_order,')
L.append('  title, intended_output, action_prompt, evidence_prompt, teacher_display_name, attribution_text,')
L.append('  source_system, source_native_id, source_provenance, provenance_sha256, created_by')
L.append(')')
L.append('ON CONFLICT DO NOTHING;')
L.append('')
L.append('-- Publish through the canonical guard path (draft -> active with content receipt).')
L.append('DO $$')
L.append('DECLARE v_id uuid; v_receipt jsonb;')
L.append('BEGIN')
L.append("  SELECT catalog_version_id INTO v_id FROM public.curriculum_catalog_versions")
L.append("   WHERE version_key = 'success-path-catalog-v1';")
L.append('  v_receipt := public.publish_curriculum_catalog_version(v_id);')
L.append("  IF v_receipt->>'content_sha256' IS NULL OR length(v_receipt->>'content_sha256') <> 64 THEN")
L.append("    RAISE EXCEPTION 'catalog publish did not return a content receipt';")
L.append('  END IF;')
L.append('END $$;')
L.append('')
L.append('COMMIT;')

out = Path('/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822/supabase/migrations/20260825090000_success_path_real_curriculum_catalog_seed.sql')
out.write_text('\n'.join(L))
print('WROTE', out, len('\n'.join(L)), 'chars,', len(vals), 'items')
