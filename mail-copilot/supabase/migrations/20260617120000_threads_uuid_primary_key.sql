-- =====================================================================
-- Threads: UUID primary key per inbound message, Gmail IDs as metadata
-- =====================================================================

-- 1. Rename legacy Gmail thread PK column
alter table public.threads rename column id to gmail_thread_id;

-- 2. New UUID primary key for each queue item (inbound message)
alter table public.threads
  add column id uuid default gen_random_uuid() not null;

alter table public.threads drop constraint threads_pkey;
alter table public.threads add primary key (id);

-- 3. Unique Gmail message id so sync inserts new rows instead of overwriting
alter table public.threads
  add column gmail_message_id text;

update public.threads
set gmail_message_id = gmail_thread_id || '-legacy-' || id::text
where gmail_message_id is null;

alter table public.threads
  alter column gmail_message_id set not null;

create unique index if not exists threads_gmail_message_id_key
  on public.threads (gmail_message_id);

create index if not exists threads_gmail_thread_id_idx
  on public.threads (gmail_thread_id);

alter table public.threads
  alter column gmail_thread_id set not null;
