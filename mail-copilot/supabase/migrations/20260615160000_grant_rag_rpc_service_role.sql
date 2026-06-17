-- Allow edge functions (service_role) to call RAG retrieval RPC
grant execute on function public.get_best_few_shot_examples(
  extensions.vector(1536),
  double precision,
  integer,
  text,
  text
) to service_role;
