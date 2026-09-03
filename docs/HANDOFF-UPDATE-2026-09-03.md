# Current AI Handoff — field updates to apply (Claude, 2026-09-03)

The Claude Code web session on 2026-09-03 had read-only Business Brain access (Tailscale bridge), so these fields could not be written in place. Apply them to `00-NorthStar/CURRENT AI HANDOFF.md` by editing the named fields; do not append a dated section.

## updated_at
2026-09-03 (time of apply) EDT

## updated_by
Claude

## Right now (replace the primary-focus bullet)
- **Primary focus (2026-09-03):** Decide the rebuild scope for the Mastermind portal. A full read-only audit of the planner, execution loop, Success Path, Replay Vault, and app architecture is on GitHub branch `claude/mastermind-portal-planner-audit-ncf2nx` at `docs/MASTERMIND-PORTAL-AUDIT-2026-09-03.md` (page: https://claude.ai/code/artifact/cd71bb7e-4780-4f32-b7e9-f4c0dd06cc66). Verdict: the 2026-08-08 spec is right and the code does not implement it. The Success Path is a static roadmap with a first-match keyword classifier; the 140-field setup form overwrites members' drafts on open; the plan → week → day → task chain is linked only by copied text; the vault has 1,292 transcripts and no chapters, tags, summaries, dates, or plan link. Hidden-launch QA on the current curriculum should pause until the engine is real.

## Last completed (add at top)
- **2026-09-03 — Mastermind portal, vault, and 90-day planner audit (Claude).** Five parallel code audits (planner core, execution loop, curriculum layer, Replay Vault, app-wide) consolidated into one report with a target member IA (5-item planner nav + gated Mastermind section: My Success Path, Learn, Ask Faith, Coaching & Community, Vault), a custom-curriculum engine driven by twelve structured intake questions and deterministic stage scoring, a vault plan built on LLM chapter enrichment with batch approval, a nightly member-state table for proof and re-engagement, and a 10-week sequenced plan (Phase 0 security and draft-loss fixes this week). Decided and why: personalization must come from typed plan fields, not keyword matching, because the current classifier routes "I can't sell my program" to Offer. **Hermes should stop:** adding QA gates, verify scripts, hash-bound publication paths, or three-reviewer Q&A workflows; running signed-in playback/checkoff QA on the current curriculum; adding wizards, AI packs, or workshop funnels to the planner app. **Hermes should not redo:** the audit itself; the 2026-08-08 spec (it stands). **Flag:** `00-Canonical/Mastermind Success Path Learning Product Requirements - 2026-08-24` is an empty stub (198 bytes, frontmatter only) yet is cited as canonical; point to the 2026-08-08 spec instead.

## Single next action
Faith reads sections 0, 3, and 6 of the audit and answers the four decisions (cut list; retire `/cycle-setup` for one ~25-field wizard; LLM vault enrichment with batch approval; the twelve intake questions). Then start Phase 0: lock the four unauthenticated AI generators, verify JWTs in the 18 functions, fix the draft clobber, remove the placeholder-cycle insert, set `status='done'` on task completion, hide the bloat by flag, replace the email allowlists with `check_mastermind_entitlement`.

## Blocker
Four product decisions above are Faith's. Business Brain write access from Claude web sessions is still read-only (bridge), so Claude cannot update this note directly; Hermes or Faith must apply this block.

## Faith decision or action needed (add as item 0, renumber the rest)
0. **Answer the four audit decisions** in `docs/MASTERMIND-PORTAL-AUDIT-2026-09-03.md` section 6. Until then, no further hidden-launch QA, verify-script, or Q&A-review work on the portal is authorized by this audit.

## Working set (add)
- GitHub `ContentRemixTeam/logic-block-foundation` branch `claude/mastermind-portal-planner-audit-ncf2nx`: `docs/MASTERMIND-PORTAL-AUDIT-2026-09-03.md`, `docs/HANDOFF-UPDATE-2026-09-03.md`
- Artifact: https://claude.ai/code/artifact/cd71bb7e-4780-4f32-b7e9-f4c0dd06cc66
