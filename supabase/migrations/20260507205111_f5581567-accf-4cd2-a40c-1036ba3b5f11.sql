create table public.sync_payloads (
  token uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  entry_count integer not null default 0,
  site_count integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sync_payloads enable row level security;

create index sync_payloads_expires_at_idx on public.sync_payloads (expires_at);

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-payloads-cleanup',
  '17 3 * * *',
  $$
  delete from public.sync_payloads
   where expires_at < now() - interval '1 day'
      or consumed_at < now() - interval '1 day';
  $$
);