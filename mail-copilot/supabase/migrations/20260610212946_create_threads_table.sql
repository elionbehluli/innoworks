-- =====================================================================
-- 1. CREATE ENUMS
-- =====================================================================
-- We use an ENUM here instead of a lookup table because these states 
-- are hardcoded into your Next.js application logic.
CREATE TYPE public.thread_status AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');

-- =====================================================================
-- 2. CREATE THREADS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.threads (
    -- Core Identity
    id TEXT PRIMARY KEY, -- We use the native Gmail threadId as the PK
    
    -- Relationships
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- State Management
    status public.thread_status NOT NULL DEFAULT 'PENDING'::public.thread_status,
    locked_at TIMESTAMP WITH TIME ZONE,
    
    -- Email Content (For the Dashboard UI)
    sender TEXT NOT NULL DEFAULT 'unknown@sender.com',
    subject TEXT NOT NULL DEFAULT 'No Subject',
    snippet TEXT,
    body_text TEXT,
    ai_draft_reply TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================
-- 3. AUTOMATIC UPDATED_AT TIMESTAMP
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_threads_timestamp
    BEFORE UPDATE ON public.threads
    FOR EACH ROW EXECUTE FUNCTION public.update_threads_updated_at();

-- =====================================================================
-- 4. SECURITY: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

-- Both staff and admins need total operational control over claiming, updating, and viewing emails.
CREATE POLICY "Allow all team members to manage the mail queue" 
ON public.threads
FOR ALL 
TO authenticated 
USING (true);