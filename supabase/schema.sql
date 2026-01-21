-- =============================================
-- SOCIETY MANAGEMENT APP - DATABASE SCHEMA
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- Drop existing tables if needed (BE CAREFUL - this deletes data)
-- Uncomment these lines if you want to reset the database:
-- drop table if exists public.watchman_requests cascade;
-- drop table if exists public.resident_requests cascade;
-- drop table if exists public.profiles cascade;
-- drop table if exists public.societies cascade;

-- 1. SOCIETIES TABLE (for society registration requests)
create table if not exists public.societies (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  address text not null,
  contact_number text,
  admin_name text not null,
  admin_email text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  image_url text
);

-- 2. PROFILES TABLE (for all user profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text check (role in ('executive', 'admin', 'resident', 'watchman')),
  society_id uuid references public.societies(id) on delete set null,
  flat_number text,
  phone_number text,
  ownership_type text check (ownership_type in ('owner', 'rental')),
  shift text check (shift in ('Day', 'Night')),
  is_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. RESIDENT REQUESTS TABLE (pending approval by admin)
create table if not exists public.resident_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  email text not null,
  phone_number text not null,
  society_id uuid references public.societies(id) on delete cascade not null,
  flat_number text not null,
  ownership_type text check (ownership_type in ('owner', 'rental')) not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

-- 4. WATCHMAN REQUESTS TABLE (pending approval by admin)
create table if not exists public.watchman_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  email text not null,
  phone_number text not null,
  society_id uuid references public.societies(id) on delete cascade not null,
  shift text check (shift in ('Day', 'Night')) not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

-- 5. NOTICES TABLE
create table if not exists public.notices (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  society_id uuid references public.societies(id) on delete cascade not null,
  title text not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete cascade
);

-- 6. COMPLAINTS/TICKETS TABLE
create table if not exists public.complaints (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resident_id uuid references public.profiles(id) on delete cascade not null,
  society_id uuid references public.societies(id) on delete cascade not null,
  title text not null,
  description text not null,
  category text, -- Can be mapped by "AI"
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  status text default 'open' check (status in ('open', 'in-progress', 'resolved', 'closed')),
  satisfaction_rating int check (satisfaction_rating between 1 and 5),
  resident_feedback text
);

-- 7. VISITOR REQUESTS TABLE (Real-time approval)
create table if not exists public.visitor_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  watchman_id uuid references public.profiles(id) on delete cascade not null,
  resident_id uuid references public.profiles(id) on delete cascade not null,
  visitor_name text not null,
  visitor_phone text,
  purpose text,
  status text default 'pending' check (status in ('pending', 'approved', 'declined')),
  society_id uuid references public.societies(id) on delete cascade not null
);

-- 8. MAINTENANCE RECORDS TABLE
create table if not exists public.maintenance_records (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resident_id uuid references public.profiles(id) on delete cascade not null,
  society_id uuid references public.societies(id) on delete cascade not null,
  amount decimal not null,
  month text not null,
  year text not null,
  status text default 'pending' check (status in ('pending', 'paid'))
);

-- 9. EMERGENCY CONTACTS TABLE
create table if not exists public.emergency_contacts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  society_id uuid references public.societies(id) on delete cascade not null,
  name text not null,
  phone_number text not null,
  contact_type text -- e.g., Fire, Police, Ambulance, Plumber
);

-- 10. DOCUMENTS TABLE
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  society_id uuid references public.societies(id) on delete cascade not null,
  name text not null,
  file_url text not null,
  file_type text,
  uploaded_by uuid references public.profiles(id)
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
alter table public.societies enable row level security;
alter table public.profiles enable row level security;
alter table public.resident_requests enable row level security;
alter table public.watchman_requests enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Public societies are viewable by everyone" on public.societies;
drop policy if exists "Anyone can insert societies" on public.societies;
drop policy if exists "Anyone can update societies" on public.societies;
drop policy if exists "Anyone can delete societies" on public.societies;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Anyone can insert profiles" on public.profiles;
drop policy if exists "Anyone can update profiles" on public.profiles;
drop policy if exists "Anyone can view resident requests" on public.resident_requests;
drop policy if exists "Anyone can insert resident requests" on public.resident_requests;
drop policy if exists "Anyone can update resident requests" on public.resident_requests;
drop policy if exists "Anyone can delete resident requests" on public.resident_requests;
drop policy if exists "Anyone can view watchman requests" on public.watchman_requests;
drop policy if exists "Anyone can insert watchman requests" on public.watchman_requests;
drop policy if exists "Anyone can update watchman requests" on public.watchman_requests;
drop policy if exists "Anyone can delete watchman requests" on public.watchman_requests;

-- SOCIETIES POLICIES
create policy "Public societies are viewable by everyone" on public.societies for select using (true);
create policy "Anyone can insert societies" on public.societies for insert with check (true);
create policy "Anyone can update societies" on public.societies for update using (true);
create policy "Anyone can delete societies" on public.societies for delete using (true);

-- PROFILES POLICIES
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Anyone can insert profiles" on public.profiles for insert with check (true);
create policy "Anyone can update profiles" on public.profiles for update using (true);

-- RESIDENT REQUESTS POLICIES
create policy "Anyone can view resident requests" on public.resident_requests for select using (true);
create policy "Anyone can insert resident requests" on public.resident_requests for insert with check (true);
create policy "Anyone can update resident requests" on public.resident_requests for update using (true);
create policy "Anyone can delete resident requests" on public.resident_requests for delete using (true);

-- WATCHMAN REQUESTS POLICIES
create policy "Anyone can view watchman requests" on public.watchman_requests for select using (true);
create policy "Anyone can insert watchman requests" on public.watchman_requests for insert with check (true);
create policy "Anyone can update watchman requests" on public.watchman_requests for update using (true);
create policy "Anyone can delete watchman requests" on public.watchman_requests for delete using (true);

-- NOTICES POLICIES
alter table public.notices enable row level security;
create policy "Notices are viewable by society members" on public.notices for select using (true);
create policy "Admins can manage notices" on public.notices for all using (true);

-- COMPLAINTS POLICIES
alter table public.complaints enable row level security;
create policy "Residents can view their own complaints" on public.complaints for select using (true);
create policy "Residents can insert complaints" on public.complaints for insert with check (true);
create policy "Admins can view and update all complaints" on public.complaints for all using (true);

-- VISITOR REQUESTS POLICIES
alter table public.visitor_requests enable row level security;
create policy "Watchman and Residents can view visitor requests" on public.visitor_requests for select using (true);
create policy "Watchman can insert visitor requests" on public.visitor_requests for insert with check (true);
create policy "Residents can update visitor requests" on public.visitor_requests for update using (true);

-- MAINTENANCE RECORDS POLICIES
alter table public.maintenance_records enable row level security;
create policy "Residents can view their own maintenance" on public.maintenance_records for select using (true);
create policy "Admins can manage maintenance" on public.maintenance_records for all using (true);

-- EMERGENCY CONTACTS POLICIES
alter table public.emergency_contacts enable row level security;
create policy "Contacts are viewable by society members" on public.emergency_contacts for select using (true);
create policy "Admins can manage emergency contacts" on public.emergency_contacts for all using (true);

-- DOCUMENTS POLICIES
alter table public.documents enable row level security;
create policy "Documents are viewable by society members" on public.documents for select using (true);
create policy "Admins can manage documents" on public.documents for all using (true);
