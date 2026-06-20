-- Ignore open-tracking pixel hits within 5 seconds of send (Gmail image prefetch).

create or replace function public.record_email_open(
  p_token uuid,
  p_sent_at timestamptz default null
)
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
  where tracking_token = p_token
    and coalesce(sent_at, p_sent_at, updated_at) is not null
    and timezone('utc', now()) >= (
      coalesce(sent_at, p_sent_at, updated_at) + interval '5 seconds'
    );
end;
$$;

create or replace function public.record_email_open(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_email_open(p_token, null::timestamptz);
end;
$$;

grant execute on function public.record_email_open(uuid, timestamptz) to service_role;
grant execute on function public.record_email_open(uuid) to service_role;
