-- ===========================================
-- CodeWix: Projects Table Migration
-- ===========================================
-- Run this in the Supabase SQL Editor.
-- This creates the projects table with RLS.

create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id text not null,
  name text not null default 'Untitled Project',
  type text not null default 'Website' check (type in ('Website', 'Web App')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_user_id_created_at on public.projects(user_id, created_at desc);
create index if not exists idx_projects_chat_id on public.projects(chat_id);

-- Enable Row Level Security
alter table public.projects enable row level security;

-- RLS Policies: Users can only access their own projects
create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();
