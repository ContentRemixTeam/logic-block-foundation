# Publish + QA the Mastermind Success Path

## Blocker first (your step)

This workspace is at `d1bd691f` and does not contain the Success Path work. GitHub sync can't be triggered from here, so you need to start it:

Desktop: chat input Plus (+) → GitHub → Connect/manage project → re-sync.
Mobile: Chat mode → Plus (+) → GitHub.

Once the sync lands, tell me and I'll run everything below.

## What I'll do after the sync

1. Verify the workspace now contains commit `6c9bae6` and the Success Path code (Success Path tab, "Based on your 90-day plan" card, next money move, messy action sprint, Ask Faith, Enable Faith AI).
2. Confirm `VITE_ENABLE_MASTERMIND_VIDEO_SEARCH` stays unset/false — no video search enabled.
3. Run a typecheck and production build.
4. Run a security scan and check for unresolved critical findings before publishing.
5. Publish to the live URL.

## QA pass

Signed in as a Mastermind member, on `/mastermind`:

- Success Path tab renders.
- With a saved 90-day cycle: the "Based on your 90-day plan" card appears, and the suggested path, next money move, messy action sprint, Ask Faith button, and Enable Faith AI button all render correctly.
- Without a saved 90-day cycle: the "Build 90-Day Plan" prompt appears instead.
- Video Search is absent (flag off).

I'll verify in a real browser session against the running app, capture screenshots for each state, and report console/network errors if any.

## Notes

- No Supabase migration in this batch — I won't touch the database.
- No code changes unless QA reveals a defect; if one turns up I'll report it and ask before fixing.
