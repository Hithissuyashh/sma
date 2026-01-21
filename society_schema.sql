-- SUPABASE SCHEMA SETUP
-- Run each block separately if you encounter parser errors.

-- BLOCK 1: EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- BLOCK 2: TABLES
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    resident_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
    category TEXT DEFAULT 'General',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    satisfaction_rating INTEGER,
    resident_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    contact_type TEXT DEFAULT 'Other',
    society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'PDF',
    society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
    flat_number TEXT,
    type TEXT DEFAULT 'SOS',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.visitor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    flat_number TEXT NOT NULL,
    purpose TEXT,
    resident_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    exit_time TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC DEFAULT 2500,
    status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BLOCK 3: ENABLE RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- BLOCK 4: POLICIES
-- NOTE: If BLOCK 4 fails with a parser error, simply skip it and use the 
-- Supabase Dashboard UI (Authentication > Policies) to add "Allow All" policies for these tables.

CREATE POLICY "notices_access" ON public.notices FOR ALL TO authenticated USING (true);
CREATE POLICY "complaints_access" ON public.complaints FOR ALL TO authenticated USING (true);
CREATE POLICY "contacts_access" ON public.emergency_contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "resources_access" ON public.resources FOR ALL TO authenticated USING (true);
CREATE POLICY "alerts_access" ON public.security_alerts FOR ALL TO authenticated USING (true);
CREATE POLICY "visitors_access" ON public.visitor_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "maint_access" ON public.maintenance_records FOR ALL TO authenticated USING (true);
