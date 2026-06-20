-- Fix inbox cron: shared helper with proper auth headers + 3 separate jobs
-- (sync-gmail, categorise-threads, draft-threads) every minute.
--
-- Prerequisite: vault secrets must exist with exact names:
--   project_url      -> https://YOUR_PROJECT_REF.supabase.co
--   service_role_key -> your service_role JWT

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_edge_function(function_name text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net, vault
as $$
declare
  project_url text;
  service_key text;
  request_id bigint;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret
  into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if project_url is null then
    raise exception 'Vault secret "project_url" is missing. Run vault.create_secret(...) in SQL Editor.';
  end if;

  if service_key is null then
    raise exception 'Vault secret "service_role_key" is missing. Run vault.create_secret(...) in SQL Editor.';
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key,
      'apikey', service_key
    ),
    body := '{}'::jsonb
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_edge_function(text) from public;
grant execute on function public.invoke_edge_function(text) to postgres;

-- Remove previous single-orchestrator job if present.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'process-inbox-every-minute';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

-- Remove and re-register the three pipeline jobs (idempotent).
do $$
declare
  job record;
begin
  for job in
    select jobid
    from cron.job
    where jobname in (
      'sync-gmail-every-minute',
      'categorise-threads-every-minute',
      'draft-threads-every-minute'
    )
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

select cron.schedule(
  'sync-gmail-every-minute',
  '* * * * *',
  $$ select public.invoke_edge_function('sync-gmail'); $$
);

select cron.schedule(
  'categorise-threads-every-minute',
  '* * * * *',
  $$ select public.invoke_edge_function('categorise-threads'); $$
);

select cron.schedule(
  'draft-threads-every-minute',
  '* * * * *',
  $$ select public.invoke_edge_function('draft-threads'); $$
);
