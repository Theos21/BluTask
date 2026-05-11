# BluTask Push Notification Backend Setup

## 1. Supabase Secrets

Run these once from your project root (requires Supabase CLI logged in):

```sh
# APNs credentials (from Apple Developer Portal)
supabase secrets set APNS_KEY_ID=8R478KJHFP
supabase secrets set APNS_TEAM_ID=9FXRBZ9H3L

# Base64-encode the .p8 file and store it
# macOS / Linux:
supabase secrets set APNS_KEY_B64="$(base64 -i /path/to/AuthKey_8R478KJHFP.p8)"

# Windows PowerShell:
# $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\AuthKey_8R478KJHFP.p8"))
# supabase secrets set APNS_KEY_B64="$b64"

# Android (FCM) — placeholder until Android ships
supabase secrets set FCM_SERVER_KEY="placeholder"
```

---

## 2. Deploy Edge Functions

```sh
supabase functions deploy send-push-notification
supabase functions deploy schedule-reminders

# Legacy low-level sender (kept for backwards compatibility)
supabase functions deploy send-push
```

---

## 3. Database Tables

Run in the Supabase SQL editor:

```sql
-- Push device tokens
create table if not exists push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  token       text not null,
  platform    text not null,  -- 'ios' | 'android'
  updated_at  timestamptz default now(),
  unique(user_id, platform)
);
alter table push_tokens enable row level security;
create policy "Users manage own tokens" on push_tokens
  for all using (auth.uid() = user_id);

-- Per-user notification preferences
create table if not exists notification_preferences (
  user_id             uuid primary key references auth.users,
  task_reminders_1d   boolean default true,
  task_reminders_1h   boolean default true,
  calendar_alerts     boolean default true,
  assignment_alerts   boolean default true,
  updated_at          timestamptz default now()
);
alter table notification_preferences enable row level security;
create policy "Users manage own prefs" on notification_preferences
  for all using (auth.uid() = user_id);
```

---

## 4. pg_cron Schedules

Run in the Supabase SQL editor (requires `pg_cron` and `pg_net` extensions):

```sql
-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Task/assignment/calendar reminders — every 30 minutes
select cron.schedule(
  'blutask-reminders',
  '*/30 * * * *',
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/schedule-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{"mode":"reminders"}'::jsonb
    );
  $$
);

-- Daily productivity summary — every day at 8:00 AM UTC
select cron.schedule(
  'blutask-daily-summary',
  '0 8 * * *',
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/schedule-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{"mode":"daily_summary"}'::jsonb
    );
  $$
);
```

Set the required settings (if not already set by Supabase):
```sql
alter database postgres set "app.supabase_url"      = 'https://<project-ref>.supabase.co';
alter database postgres set "app.service_role_key"  = '<service-role-key>';
```

---

## 5. Test a Notification

```sh
# Send a test notification to yourself
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "userId": "<your-user-id>"
  }'

# Test a task reminder
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task_reminder",
    "userId": "<your-user-id>",
    "payload": {
      "taskTitle": "Finish Physics homework",
      "taskId": "abc-123",
      "dueIn": "1h"
    }
  }'

# Test a daily summary
curl -X POST https://<project-ref>.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_summary",
    "userId": "<your-user-id>",
    "payload": {
      "completedCount": 4,
      "pendingCount": 3,
      "overdueCount": 1
    }
  }'
```

---

## 6. Switch to APNs Production

By default the function uses `api.sandbox.push.apple.com`. When submitting to App Store:
1. Change `App.entitlements` → `aps-environment` from `development` to `production`
2. Pass `"production": true` in the request body, or update the default in `send-push-notification/index.ts`

---

## 7. Notification Types Reference

| type | Required payload fields | When triggered |
|------|------------------------|----------------|
| `task_reminder` | `taskTitle`, `dueIn` (`1h`\|`1d`), optionally `taskId` | schedule-reminders every 30 min |
| `assignment_alert` | `assignmentTitle`, `dueIn`, optionally `assignmentId` | schedule-reminders every 30 min |
| `calendar_reminder` | `eventTitle`, `eventTime`, `minutesUntil` (15\|60) | schedule-reminders every 30 min |
| `daily_summary` | `completedCount`, `pendingCount`, `overdueCount` | schedule-reminders daily at 8 AM |
| `test` | _(none)_ | manual curl / test suite |
