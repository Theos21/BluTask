-- Run this once in the Supabase SQL Editor to enable account deletion.
-- Deletes all user data explicitly, then removes the auth user.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  -- Checklist items (no user_id column — delete via task join)
  delete from public.checklist_items
    where task_id in (select id from public.tasks where user_id = uid);

  -- Owned rows
  delete from public.assignments    where user_id = uid;
  delete from public.tasks          where user_id = uid;
  delete from public.classes        where user_id = uid;
  delete from public.lists          where user_id = uid;
  delete from public.routine_blocks where user_id = uid;
  delete from public.profiles       where id       = uid;

  -- Finally remove the auth user (cascades any remaining references)
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_user() to authenticated;
