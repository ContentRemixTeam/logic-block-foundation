## What it is

The field you saw on the Daily page is the **third "Today's anchors" slot** in `src/components/daily/BraveMoveSlots.tsx`. It auto-suggests tasks that are stuck — `status = 'waiting'`, in a reschedule loop, or rescheduled 3+ times in 30 days — so you remember to chase them down. It's a current, active feature (not legacy), just poorly labeled.

## Change

Rename the slot from **"Support / Ask"** → **"Waiting On"** so the purpose is obvious at a glance.

### File to edit

- `src/components/daily/BraveMoveSlots.tsx`
  - Line 185: change `label: 'Support / Ask'` → `label: 'Waiting On'`
  - Update the JSDoc comment on line 44 to match (`? Waiting On — tasks blocked / waiting on someone`)
  - Placeholder text in the picker (e.g. "Pick a support / ask task…") will be updated to "Pick a task you're waiting on…"

No database, schema, or logic changes — the underlying field is still `support_task_id` and the candidate filter (waiting / stuck tasks) stays identical. Pure label change.