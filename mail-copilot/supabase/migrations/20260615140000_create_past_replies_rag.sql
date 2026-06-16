-- =====================================================================
-- RAG: past email replies with pgvector similarity search
-- =====================================================================

create extension if not exists vector with schema extensions;

-- =====================================================================
-- 1. PAST REPLIES TABLE
-- =====================================================================
create table if not exists public.past_replies (
  id uuid primary key default gen_random_uuid(),
  sender text not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  inbound_email text not null,
  outbound_reply text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- =====================================================================
-- 2. INDICES
-- =====================================================================
create index if not exists past_replies_embedding_hnsw_idx
  on public.past_replies
  using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists past_replies_sender_idx
  on public.past_replies (sender);

create index if not exists past_replies_category_id_idx
  on public.past_replies (category_id);

create index if not exists past_replies_sender_category_id_idx
  on public.past_replies (sender, category_id);

-- =====================================================================
-- 3. AUTOMATIC UPDATED_AT TIMESTAMP
-- =====================================================================
create or replace function public.update_past_replies_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_past_replies_timestamp
  before update on public.past_replies
  for each row execute function public.update_past_replies_updated_at();

-- =====================================================================
-- 4. FEW-SHOT RETRIEVAL FUNCTION (WATERFALL PRIORITY)
-- =====================================================================
create or replace function public.get_best_few_shot_examples(
  query_embedding extensions.vector(1536),
  match_threshold double precision,
  match_count integer,
  target_sender text,
  target_category text
)
returns table (
  id uuid,
  inbound_email text,
  outbound_reply text,
  similarity double precision,
  match_level text
)
language plpgsql
stable
as $$
begin
  -- 1. Strict match: sender AND category
  return query
  select
    pr.id,
    pr.inbound_email,
    pr.outbound_reply,
    (1 - (pr.embedding <=> query_embedding))::double precision as similarity,
    'sender_and_category'::text as match_level
  from public.past_replies pr
  where pr.sender = target_sender
    and pr.category_id::text = target_category
    and (1 - (pr.embedding <=> query_embedding)) >= match_threshold
  order by pr.embedding <=> query_embedding
  limit match_count;

  if found then
    return;
  end if;

  -- 2. Structure match: category only
  return query
  select
    pr.id,
    pr.inbound_email,
    pr.outbound_reply,
    (1 - (pr.embedding <=> query_embedding))::double precision as similarity,
    'category_only'::text as match_level
  from public.past_replies pr
  where pr.category_id::text = target_category
    and (1 - (pr.embedding <=> query_embedding)) >= match_threshold
  order by pr.embedding <=> query_embedding
  limit match_count;

  if found then
    return;
  end if;

  -- 3. Tone match: sender only
  return query
  select
    pr.id,
    pr.inbound_email,
    pr.outbound_reply,
    (1 - (pr.embedding <=> query_embedding))::double precision as similarity,
    'user_only'::text as match_level
  from public.past_replies pr
  where pr.sender = target_sender
    and (1 - (pr.embedding <=> query_embedding)) >= match_threshold
  order by pr.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- =====================================================================
-- 5. SECURITY
-- =====================================================================
alter table public.past_replies enable row level security;

create policy "Allow authenticated users to view past replies"
  on public.past_replies
  for select
  to authenticated
  using (true);

create policy "Allow authenticated users to insert past replies"
  on public.past_replies
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated users to update past replies"
  on public.past_replies
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated users to delete past replies"
  on public.past_replies
  for delete
  to authenticated
  using (true);

grant execute on function public.get_best_few_shot_examples(
  extensions.vector(1536),
  double precision,
  integer,
  text,
  text
) to authenticated;
