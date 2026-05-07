-- Enable RLS
alter database postgres set "app.jwt_secret" to 'your-jwt-secret';

-- Profiles (mirrors auth.users, one row per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can manage their own profile" on public.profiles
  for all using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC for account self-deletion
create or replace function public.delete_user()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Classes
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  teacher text,
  period text,
  created_at timestamptz default now()
);

-- Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  class_id uuid references public.classes(id) on delete cascade not null,
  title text not null,
  type text not null default 'homework' check (type in ('homework','quiz','test','project','essay','lab','reading')),
  due_date timestamptz,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  status text not null default 'todo' check (status in ('todo','inprogress','submitted','graded')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lists
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#14b8a6',
  created_at timestamptz default now()
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  list_id uuid references public.lists(id) on delete set null,
  title text not null,
  due_date timestamptz,
  repeat_rule text,
  notes text,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Checklist items
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0
);

-- Routine blocks
create table if not exists public.routine_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  days_of_week integer[] not null default '{}',
  start_time time not null,
  end_time time not null,
  notes text
);

-- Row Level Security
alter table public.classes enable row level security;
alter table public.assignments enable row level security;
alter table public.lists enable row level security;
alter table public.tasks enable row level security;
alter table public.checklist_items enable row level security;
alter table public.routine_blocks enable row level security;

-- RLS Policies
create policy "Users can manage their own classes" on public.classes
  for all using (auth.uid() = user_id);

create policy "Users can manage their own assignments" on public.assignments
  for all using (auth.uid() = user_id);

create policy "Users can manage their own lists" on public.lists
  for all using (auth.uid() = user_id);

create policy "Users can manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id);

create policy "Users can manage checklist items of their tasks" on public.checklist_items
  for all using (
    exists (
      select 1 from public.tasks
      where tasks.id = checklist_items.task_id
      and tasks.user_id = auth.uid()
    )
  );

create policy "Users can manage their own routine blocks" on public.routine_blocks
  for all using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_assignments_user_due on public.assignments(user_id, due_date);
create index if not exists idx_tasks_user_due on public.tasks(user_id, due_date);
create index if not exists idx_tasks_list on public.tasks(list_id);
create index if not exists idx_checklist_task on public.checklist_items(task_id, position);

-- ── Phase 1 migrations ──────────────────────────────────────────────────────
-- Run these in Supabase SQL Editor if upgrading an existing database:
--
-- alter table public.profiles
--   add column if not exists show_school boolean not null default true;
--
-- alter table public.assignments
--   add column if not exists checklist  jsonb        not null default '[]',
--   add column if not exists completed  boolean      not null default false,
--   add column if not exists completed_at timestamptz;
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists show_school boolean not null default true;

alter table public.assignments
  add column if not exists checklist     jsonb        not null default '[]',
  add column if not exists completed     boolean      not null default false,
  add column if not exists completed_at  timestamptz;
