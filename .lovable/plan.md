

# Current State & Findings

## Admin Dashboard — Members Tab
Your admin panel at `/admin` already has a **Members tab** that shows all entitlements from the database. You can see active vs cancelled members, add new ones manually, bulk import via CSV, cancel, and reactivate. So yes — you CAN see all mastermind members there.

## Current Data
- **204 total entitlements** (172 active, 32 cancelled)
- **Last member added: January 24, 2026** — over 6 weeks ago. No one has been added since.

## GHL Webhook Status: NOT WORKING
The `ghl-webhook-add-member` edge function exists and is deployed, and the `GHL_WEBHOOK_SECRET` is configured. However:
- **Zero logs** exist for the webhook — it has literally never been called
- This confirms the webhook was **never connected in GoHighLevel**

The code is ready on your end. What's missing is the GoHighLevel side — you need to set up the webhook in GHL pointing to your edge function URL.

## What You Need To Do in GoHighLevel

1. **Webhook URL** (for adding members):
   ```
   https://wdxelomsouudmidakxiz.supabase.co/functions/v1/ghl-webhook-add-member
   ```

2. **Webhook URL** (for removing members):
   ```
   https://wdxelomsouudmidakxiz.supabase.co/functions/v1/ghl-webhook-remove-member
   ```

3. **Required header** on both webhooks:
   ```
   X-Webhook-Secret: lbv_wh_9Kf3mXpQ7rT2sYdA8jNcE5wZ1
   ```

4. **Payload**: JSON with `email`, `first_name`, `last_name` fields

5. **Trigger**: Set the webhook to fire on your membership purchase/cancellation workflows

## Plan: Improve Admin Visibility

To make this easier to monitor going forward, I'll add to the existing Members tab:

1. **"Last Added" timestamp** — prominently displayed at the top showing when the most recent member was added
2. **"Webhook Status" indicator** — shows whether the webhook has received any calls recently (based on latest `created_at` timestamps)
3. **Quick stats banner** — Active count, cancelled count, last added date, all at a glance

These are small UI additions to the existing `Admin.tsx` Members tab — no new pages needed.

