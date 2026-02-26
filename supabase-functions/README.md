# Supabase Edge Functions (Habit Tracker)

This folder contains Edge Functions used by the Habit Tracker app. When deploying functions via the Supabase Dashboard, set the following environment variables (do NOT use names that start with `SUPABASE_`):

- `PROJECT_URL` = your Supabase project URL (e.g. https://abc123.supabase.co)
- `SERVICE_ROLE_KEY` = your Supabase Service Role key (keep secret)
`APP_URL` = your frontend base URL (used by frontend pages)

Edge Function files:
- `generate-reminders` — creates in-app reminders every 3 hours (uses `PROJECT_URL` & `SERVICE_ROLE_KEY`)
Note: this project currently uses only in-app notifications. Email-based flows are optional and not included by default.
Deployment (Dashboard):
1. Open Supabase → Edge Functions → Create new function
2. Paste the TypeScript code from the corresponding `supabase-functions/<name>/index.ts`
3. Deploy and then set the environment variables above in the function's Settings

Scheduling:
- For `generate-reminders`, use cron `0 */3 * * *` (every 3 hours).
