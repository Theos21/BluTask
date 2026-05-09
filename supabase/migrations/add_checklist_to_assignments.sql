alter table public.assignments
  add column if not exists checklist jsonb not null default '[]'::jsonb;
