create table if not exists public.gmail_requests (
  id uuid primary key default gen_random_uuid(),
  method text not null,
  url text not null,
  request_headers jsonb,
  request_body jsonb,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists gmail_requests_created_at_idx
  on public.gmail_requests (created_at desc);

alter table public.gmail_requests enable row level security;
