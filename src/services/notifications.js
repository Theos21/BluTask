/*
-- Run in Supabase SQL editor:
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  token text not null,
  platform text not null,
  updated_at timestamptz default now(),
  unique(user_id, platform)
);
alter table push_tokens enable row level security;
create policy "Users manage own tokens" on push_tokens
  for all using (auth.uid() = user_id);

create table if not exists notification_preferences (
  user_id uuid primary key references auth.users,
  task_reminders_1d boolean default true,
  task_reminders_1h boolean default true,
  calendar_alerts boolean default true,
  assignment_alerts boolean default true,
  updated_at timestamptz default now()
);
alter table notification_preferences enable row level security;
create policy "Users manage own prefs" on notification_preferences
  for all using (auth.uid() = user_id);
*/

import { Capacitor } from '@capacitor/core'

async function getPushNotifications() {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  return PushNotifications
}

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return null

  const PushNotifications = await getPushNotifications()

  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') return null

  await PushNotifications.register()

  return new Promise((resolve) => {
    const registrationListener = PushNotifications.addListener('registration', (tokenData) => {
      registrationListener.then(handle => handle.remove()).catch(() => {})
      resolve(tokenData.value)
    })

    const errorListener = PushNotifications.addListener('registrationError', () => {
      errorListener.then(handle => handle.remove()).catch(() => {})
      resolve(null)
    })
  })
}

export async function savePushToken(supabase, userId, token, platform) {
  if (!token || !userId) return

  await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,platform' }
  )
}

export function scheduleLocalNotification(title, body, scheduledAt) {
  // Stub — local scheduling requires @capacitor/local-notifications; wired up when added
  console.log('[notifications] scheduleLocalNotification (stub):', { title, body, scheduledAt })
}
