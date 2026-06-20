-- Track sent replies and email open events via tracking pixel.

alter table public.threads
  add column if not exists sent_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists open_count int not null default 0,
  add column if not exists tracking_token uuid not null default gen_random_uuid();

create unique index if not exists threads_tracking_token_key
  on public.threads (tracking_token);

create or replace function public.record_email_open(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.threads
  set
    opened_at = coalesce(opened_at, timezone('utc', now())),
    open_count = open_count + 1
  where tracking_token = p_token;
end;
$$;

grant execute on function public.record_email_open(uuid) to service_role;
