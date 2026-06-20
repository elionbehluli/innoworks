-- Schedule the process-inbox orchestrator to run every minute via pg_cron + pg_net.
-- Requires one-time Vault secret setup (see supabase/BACKGROUND_PIPELINE.md).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

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

select cron.schedule(
  'process-inbox-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'project_url'
      limit 1
    ) || '/functions/v1/process-inbox',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1
      ),
      'Content-Type',
      'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
