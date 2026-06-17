-- =====================================================================
-- Thread-aware RAG: extend past_replies and few-shot retrieval
-- =====================================================================

-- =====================================================================
-- 1. ALTER PAST_REPLIES TABLE
-- =====================================================================
alter table public.past_replies
  add column if not exists thread_id text,
  add column if not exists thread_history jsonb not null default '[]'::jsonb;

create index if not exists past_replies_thread_id_idx
  on public.past_replies (thread_id);

-- =====================================================================
-- 2. RECREATE FEW-SHOT RETRIEVAL FUNCTION (WATERFALL PRIORITY)
-- =====================================================================
drop function if exists public.get_best_few_shot_examples(
  extensions.vector(1536),
  double precision,
  integer,
  text,
  text
);

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
  thread_history jsonb,
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
    pr.thread_history,
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
    pr.thread_history,
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
    pr.thread_history,
    (1 - (pr.embedding <=> query_embedding))::double precision as similarity,
    'user_only'::text as match_level
  from public.past_replies pr
  where pr.sender = target_sender
    and (1 - (pr.embedding <=> query_embedding)) >= match_threshold
  order by pr.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.get_best_few_shot_examples(
  extensions.vector(1536),
  double precision,
  integer,
  text,
  text
) to authenticated;
