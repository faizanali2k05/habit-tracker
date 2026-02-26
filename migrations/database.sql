-- ================================
-- ENABLE UUID EXTENSION
-- ================================
create extension if not exists "uuid-ossp";

-- ================================
-- TASKS TABLE
-- ================================
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  due_at timestamptz,
  priority text check (priority in ('High','Medium','Low')) default 'Medium',
  status text check (status in ('pending','completed')) default 'pending',
  reminder_count integer default 0,
  last_reminder_sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- ================================
-- HABITS TABLE
-- ================================
create table if not exists public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  frequency text check (frequency in ('Daily','Weekly','Custom')) default 'Daily',
  created_at timestamp with time zone default now()
);

-- ================================
-- HABIT LOGS TABLE
-- ================================
create table if not exists public.habit_logs (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid references public.habits(id) on delete cascade,
  completed_date date default current_date
);

-- ================================
-- NOTIFICATIONS TABLE
-- ================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  type text check (type in ('task_created','habit_created','task_reminder','habit_reminder','info','task_completed','habit_completed')) not null,
  title text,
  body text,
  task_id uuid null references public.tasks(id) on delete cascade,
  habit_id uuid null references public.habits(id) on delete cascade,
  read boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_notifications_user_read_created on public.notifications(user_id, read, created_at);

-- ensure type constraint includes completed values even on existing DBs
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check,
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN ('task_created','habit_created','task_reminder','habit_reminder','info','task_completed','habit_completed')
  );

-- backfill notifications for already completed tasks/habits (run once)
INSERT INTO public.notifications(user_id, type, title, body, task_id, created_at)
SELECT user_id,
       'task_completed',
       'Task completed',
       title,
       id,
       now()
FROM public.tasks
WHERE status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.task_id = tasks.id
      AND n.type = 'task_completed'
  );

INSERT INTO public.notifications(user_id, type, title, body, habit_id, created_at)
SELECT h.user_id,
       'habit_completed',
       'Habit completed',
       h.name,
       h.id,
       now()
FROM public.habits h
JOIN public.habit_logs l ON l.habit_id = h.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.habit_id = h.id
      AND n.type = 'habit_completed'
);


-- Enable RLS on notifications and allow users to SELECT/UPDATE/INSERT their own notifications
alter table public.notifications enable row level security;
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notifications" on public.notifications;
create policy "Users can insert own notifications"
on public.notifications
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ================================
-- ENABLE ROW LEVEL SECURITY
-- ================================
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- ================================
-- RLS POLICIES FOR TASKS
-- ================================
drop policy if exists "Users can manage own tasks" on public.tasks;
create policy "Users can manage own tasks"
on public.tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ================================
-- RLS POLICIES FOR HABITS
-- ================================
drop policy if exists "Users can manage own habits" on public.habits;
create policy "Users can manage own habits"
on public.habits
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ================================
-- RLS POLICIES FOR HABIT LOGS
-- ================================
drop policy if exists "Users can manage own habit logs" on public.habit_logs;
create policy "Users can manage own habit logs"
on public.habit_logs
for all
using (
  exists (
    select 1 from public.habits
    where habits.id = habit_logs.habit_id
    and habits.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.habits
    where habits.id = habit_logs.habit_id
    and habits.user_id = auth.uid()
  )
);
-- run the migration SQL from migrations/001_add_goal_to_habits.sql
alter table if exists public.habits add column if not exists goal text;

-- ================================
-- TRIGGERS: create initial notifications when tasks/habits are created
-- ================================
-- Function: notify_on_task_insert
create or replace function public.notify_on_task_insert()
returns trigger as $$
begin
  insert into public.notifications(user_id, type, title, body, task_id)
  values (NEW.user_id, 'task_created', 'New task created', NEW.title, NEW.id);
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_task_notify on public.tasks;
create trigger trg_task_notify
after insert on public.tasks
for each row execute procedure public.notify_on_task_insert();

-- Function: notify_on_habit_insert
create or replace function public.notify_on_habit_insert()
returns trigger as $$
begin
  insert into public.notifications(user_id, type, title, body, habit_id)
  values (NEW.user_id, 'habit_created', 'New habit added', NEW.name, NEW.id);
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_habit_notify on public.habits;
create trigger trg_habit_notify
after insert on public.habits
for each row execute procedure public.notify_on_habit_insert();

