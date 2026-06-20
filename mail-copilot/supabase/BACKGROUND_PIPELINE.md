# Background email pipeline

Three edge functions run on a **1-minute cron schedule** via `pg_cron` + `pg_net`:

| Cron job | Edge function | What it does |
|----------|---------------|--------------|
| `sync-gmail-every-minute` | `sync-gmail` | Fetch unread Gmail → insert `threads` |
| `categorise-threads-every-minute` | `categorise-threads` | Assign category via OpenAI |
| `draft-threads-every-minute` | `draft-threads` | Generate AI draft reply |

All three fire every minute. A brand-new email may take **1–2 minutes** to appear fully processed (sync → categorise → draft).

You can also invoke the full pipeline manually:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-inbox' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY'
```

## One-time setup (hosted Supabase)

### 1. Enable extensions

Dashboard → **Database** → **Extensions** → enable:

- `pg_cron`
- `pg_net`

### 2. Vault secrets (exact names required)

Run in **SQL Editor**:

```sql
-- Project URL (no trailing slash)
select vault.create_secret('https://ufpmjahoxjgzfcbaatxa.supabase.co', 'project_url');

-- Service role key from Project Settings → API
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
```

**Important:** the second argument is the **name**, not another URL. Names must be exactly `project_url` and `service_role_key`.

Verify:

```sql
select name, created_at from vault.secrets
where name in ('project_url', 'service_role_key');
```

If you created secrets with wrong names, fix them:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'project_url'),
  'https://ufpmjahoxjgzfcbaatxa.supabase.co'
);

select vault.update_secret(
  (select id from vault.secrets where name = 'service_role_key'),
  'YOUR_SERVICE_ROLE_KEY'
);
```

### 3. Apply migration & deploy functions

```bash
cd mail-copilot
supabase db push
supabase functions deploy sync-gmail categorise-threads draft-threads process-inbox
```

## Verify cron is working

**Registered jobs:**

```sql
select jobid, jobname, schedule, active from cron.job
where jobname like '%every-minute%';
```

You should see 3 rows: `sync-gmail-every-minute`, `categorise-threads-every-minute`, `draft-threads-every-minute`.

**Recent cron runs:**

```sql
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;
```

**HTTP responses from pg_net:**

```sql
select id, status_code, error_msg, created
from net._http_response
order by created desc
limit 10;
```

Status `200` = function invoked successfully. `401` = bad JWT / vault secret. `404` = function not deployed.

**Manual test (bypasses cron):**

```bash
curl -X POST 'https://ufpmjahoxjgzfcbaatxa.supabase.co/functions/v1/sync-gmail' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY'
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No cron jobs in `cron.job` | Run `supabase db push` |
| Cron runs but `401` in `net._http_response` | Fix `service_role_key` vault secret |
| Cron runs but `404` | Deploy functions: `supabase functions deploy ...` |
| Sync returns 0 processed | No unread inbox mail, or Gmail token expired |
| Email synced but not categorised | Wait 1 min for next categorise cron, or check categories exist |
| Categorised but no draft | Wait 1 min for draft cron, or check `failures` in draft-threads response |
| `"failed": 1` in draft-threads | See `failures[].error` — common: missing `OPENAI_API_KEY`, echo reply on short test emails |
| Draft saved but not in Gmail | OK — app uses DB draft; Gmail draft creation is optional |

## Local development

`pg_cron` does not run locally. Test with:

```bash
supabase functions serve sync-gmail
curl -X POST 'http://127.0.0.1:54321/functions/v1/sync-gmail' \
  -H 'Authorization: Bearer YOUR_LOCAL_SERVICE_ROLE_KEY' \
  -H 'apikey: YOUR_LOCAL_SERVICE_ROLE_KEY'
```
