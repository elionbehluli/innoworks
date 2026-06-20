# Mail Copilot

AI Mail Copilot for Gmail — a take-home assessment for **Innoworks** (Van Berg Makelaardij pilot).

The app connects to a shared Gmail inbox, continuously ingests unread mail via cron, uses OpenAI to categorize each message against user-defined rules, generates Dutch draft replies from category prompt templates, and lets office staff review, edit, approve (save to Gmail Drafts), or send replies.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) + TypeScript | Required by brief |
| UI | Tailwind 4 + shadcn/ui (radix-nova) + Magic UI dot pattern | House stack + subtle polish |
| Database | Supabase Postgres + RLS | Required; auth + cron + edge functions in one place |
| Auth | Supabase Auth (Google OAuth) | Simple session handling with middleware |
| AI | OpenAI `gpt-4o-mini` + `text-embedding-3-small` | Structured JSON output, embeddings for RAG |
| Forms | react-hook-form + zod | Required pattern |
| Cron | Supabase `pg_cron` + `pg_net` → edge functions | Runs without Vercel; see `supabase/BACKGROUND_PIPELINE.md` |

## Local setup

### 1. Prerequisites

- Node.js 20+
- Supabase CLI (`npm i -g supabase`)
- A Supabase project
- Google Cloud OAuth credentials with Gmail API enabled
- OpenAI API key

### 2. Install & env

```bash
cd mail-copilot
npm install
cp .env.example .env.local
```

Fill in `.env.local` (see `.env.example` for descriptions).

### 3. Database

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies all migrations under `supabase/migrations/`, including RLS policies, RAG functions, cron jobs, and Van Berg seed categories.

Regenerate types after schema changes:

```bash
npm run db:types
```

### 4. Supabase edge functions

Set secrets for edge functions (Dashboard → Edge Functions → Secrets, or CLI):

- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy:

```bash
supabase functions deploy sync-gmail categorise-threads draft-threads process-inbox
```

### 5. Cron (hosted Supabase)

See **`supabase/BACKGROUND_PIPELINE.md`** for Vault secrets (`project_url`, `service_role_key`) and verifying the three 1-minute cron jobs.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google, and use **Refresh inbox** on Threads to trigger a manual sync.

## Architecture

```
Gmail inbox
    ↓ (cron every minute: sync-gmail)
threads table
    ↓ (categorise-threads — OpenAI picks category)
    ↓ (draft-threads — OpenAI structured draft + optional Gmail draft)
Dashboard review
    ↓ Approve & save draft → Gmail Drafts folder
    ↓ Send now (stretch B) → Gmail send + open tracking
```

Manual **Refresh inbox** calls the `process-inbox` orchestrator (sync → categorise → draft) from the Next.js server using the service role key.

## Features vs brief

### Base scope

- Google OAuth, Gmail `readonly` + `modify` (+ `send` for stretch B)
- Cron mail ingest (primary) + manual refresh button
- AI rules engine: categories with routing descriptions + prompt templates
- Structured LLM output: `category`, `draftSubject`, `draftBody`, `reasoning`
- Review dashboard: approve (Gmail draft), edit, skip
- RLS, server-side tokens, no secrets in client bundle
- SQL migrations + this README

### Stretches implemented

- **A — Context / tone learning:** embeddings + `get_best_few_shot_examples` RPC, few-shot in draft prompt
- **B — Send via Gmail:** “Send now?” confirmation modal, `sent_at` logging, open-tracking pixel on `/sent`
- **H — Polish:** dark theme, dashboard stats, pagination, dot background, inbox refresh UX

## Assumptions (documented for reviewers)

| Topic | Assumption |
|-------|------------|
| Fetch volume | Cron runs every minute; each stage processes up to 3 threads per run |
| Gmail query | `is:unread label:INBOX newer_than:7d` |
| Threads vs messages | One DB row per Gmail message; grouped by `gmail_thread_id` for replies |
| Attachments | Not downloaded; snippet/body text only; noted in UI when missing |
| Uncertain category | Fallback category **Overig**; AI instructed to use it when unsure |
| Data retention | No automatic purge; suitable for pilot volume (~400/day) |
| Language | UI in English; all LLM drafts in Dutch when client writes Dutch |
| Mailboxes | Single shared `info@` mailbox via service refresh token |
| Approve flow | Primary action saves to **Gmail Drafts**; optional “Send now” is stretch B |

## What we did not build

- Calendar / WhatsApp / NVM integrations
- Fully automatic send without human review
- Multi-mailbox or multi-tenant auth
- Gmail Watch + Pub/Sub (stretch C)
- Eval suite (stretch D)
- Unit tests (would target zod schemas, interpolate-template, idempotent sync)

## Least sure about

- Open-tracking accuracy across Gmail/Outlook prefetch (5s grace period helps but is best-effort)
- Gmail draft + send idempotency under double-clicks (send guarded by `sent_at` null check)

## Project structure

```
app/
  (dashboard)/     # threads, sent, categories, dashboard
  api/track/       # open-tracking pixel
  sign-in/
components/
lib/
  gmail/           # client, send-reply, create-draft
  rag/             # past reply storage
supabase/
  functions/       # sync-gmail, categorise-threads, draft-threads, process-inbox
  migrations/
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Push migrations to linked Supabase project |
