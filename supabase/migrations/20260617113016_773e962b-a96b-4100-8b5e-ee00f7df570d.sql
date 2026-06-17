create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, token)
);
grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;
alter table public.push_tokens enable row level security;
create policy "users manage own push tokens" on public.push_tokens for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);