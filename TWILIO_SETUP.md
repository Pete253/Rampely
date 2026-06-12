# Twilio Dialer Setup — What Only You Can Do

Everything is built and in the repo. The dialer shows a friendly "not set up yet" message until you add these secrets. Should take ~15 minutes in the Twilio Console.

---

## Step 1 — Get a phone number (your caller ID)

1. Log into https://console.twilio.com
2. Go to **Phone Numbers → Manage → Buy a number**
3. Pick a Danish number (or whichever country you're calling from)
4. Note it in **E.164 format**: `+4531XXXXXX`

→ This becomes **`TWILIO_CALLER_ID`**

---

## Step 2 — Get your Account SID and Auth Token

On the **Twilio Console main dashboard** (front page after login):

- **Account SID** → `TWILIO_ACCOUNT_SID`
- **Auth Token** (click to reveal) → `TWILIO_AUTH_TOKEN`

---

## Step 3 — Create an API Key

1. Go to **Account → API keys & tokens → Create API key**
2. Choose **Standard** type, name it e.g. "Rampely Dialer"
3. Copy both values **immediately** — the Secret is only shown once:
   - SID → `TWILIO_API_KEY_SID`
   - Secret → `TWILIO_API_KEY_SECRET`

---

## Step 4 — Create a TwiML App

1. Go to **Voice → TwiML Apps → Create new TwiML App**
2. Name it e.g. "Rampely Softphone"
3. Under **Voice → A call comes in**, set the webhook to **HTTP POST** with this URL:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/twilio-voice
   ```
   Replace `<YOUR_SUPABASE_PROJECT_REF>` with your actual Supabase project ref (visible in your Supabase project URL).
4. Save and copy the **TwiML App SID** → `TWILIO_TWIML_APP_SID`

---

## Step 5 — Add all 6 secrets to Supabase

In your **Supabase Dashboard → Edge Functions → Secrets** (or via Lovable's Secrets panel), add:

| Secret name             | Where to get it                        |
|-------------------------|----------------------------------------|
| `TWILIO_ACCOUNT_SID`    | Step 2 — Twilio Console dashboard      |
| `TWILIO_AUTH_TOKEN`     | Step 2 — Twilio Console dashboard      |
| `TWILIO_API_KEY_SID`    | Step 3 — shown when you create the key |
| `TWILIO_API_KEY_SECRET` | Step 3 — shown **once**, copy it now!  |
| `TWILIO_TWIML_APP_SID`  | Step 4 — TwiML App SID                 |
| `TWILIO_CALLER_ID`      | Step 1 — E.164 format e.g. `+4531XXXXXX` |

---

## Step 6 — Apply the database migrations

Three new migrations are in the repo (branch `claude/charming-johnson-be2us6`):

- `supabase/migrations/20260612090000_bookings.sql`
- `supabase/migrations/20260612130000_comp_models.sql`
- `supabase/migrations/20260612150000_calls.sql`

These apply **automatically when Lovable syncs the branch**. If they don't apply automatically, run them manually in the **Supabase SQL Editor**.

---

## Done — what happens next

Once all 6 secrets are set and migrations applied:

- Click any phone icon next to a contact → browser dials through Twilio
- The floating softphone panel appears with mute, end call, and optional recording
- After the call you log outcome + notes → saves to the contact timeline
- The status webhook (`/functions/v1/twilio-status`) updates the call record automatically

---

## What's queued for later (no action needed from you yet)

- **Stripe / billing** — Phase 1.7, needed before you can monetise seats
- **Transcription + AI call scoring** — Phase 2b, needs live calls flowing first
- **SMS + Email sync** — Phase 2c
- **Gamification** (XP, streaks) — Phase 3b
- **Manager dashboard + onboarding** — Phase 4
