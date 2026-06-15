-- 1. Create the table
create table if not exists public.gmail_token (
  id text primary key default 'gmail_token',
  access_token text not null,
  expires_at timestamptz not null,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 2. Enable Row Level Security (RLS)
alter table public.gmail_token enable row level security;