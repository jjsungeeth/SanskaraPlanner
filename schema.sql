-- ============================================================
-- SANSKARA PLANNER — SUPABASE DATABASE SCHEMA
-- Paste this entire file into Supabase > SQL Editor > New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text not null default 'client', -- 'client' | 'planner'
  full_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Planners can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'planner')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- WEDDING PROFILES
-- ─────────────────────────────────────────────
create table public.wedding_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  partner1_name text,
  partner2_name text,
  wedding_date date,
  profile_photo_url text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.wedding_profiles enable row level security;
create policy "Users manage own wedding profile" on public.wedding_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Planners view all wedding profiles" on public.wedding_profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'planner')
);

-- ─────────────────────────────────────────────
-- CHAPTERS (purchased access)
-- ─────────────────────────────────────────────
create table public.chapters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  chapter_type text not null default 'wedding',
  plan_duration_months integer not null default 6,
  start_date date not null default current_date,
  end_date date not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.chapters enable row level security;
create policy "Users view own chapters" on public.chapters using (auth.uid() = user_id);
create policy "Planners manage all chapters" on public.chapters using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'planner')
);

-- ─────────────────────────────────────────────
-- BUDGET
-- ─────────────────────────────────────────────
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  overall_budget numeric(12,2) default 0,
  -- Optional per-subchapter budgets
  catering_budget numeric(12,2),
  vendor_budget numeric(12,2),
  decor_budget numeric(12,2),
  hair_makeup_budget numeric(12,2),
  stationery_budget numeric(12,2),
  updated_at timestamptz default now()
);

alter table public.budgets enable row level security;
create policy "Chapter owner manages budget" on public.budgets using (
  exists (select 1 from public.chapters c where c.id = chapter_id and c.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- VENDORS (Catering, Décor, Hair & Makeup, General Vendor)
-- ─────────────────────────────────────────────
create table public.vendors (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  category text not null, -- 'catering' | 'decor' | 'hair_makeup' | 'vendor'
  vendor_name text not null,
  notes text,
  prompt_answers jsonb default '{}',
  is_booked boolean default false,
  booked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vendors enable row level security;
create policy "Chapter owner manages vendors" on public.vendors using (
  exists (select 1 from public.chapters c where c.id = chapter_id and c.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- VENDOR LINE ITEMS
-- ─────────────────────────────────────────────
create table public.vendor_line_items (
  id uuid default uuid_generate_v4() primary key,
  vendor_id uuid references public.vendors(id) on delete cascade not null,
  category text,
  description text not null,
  price numeric(10,2) default 0,
  sort_order integer default 0
);

alter table public.vendor_line_items enable row level security;
create policy "Vendor owner manages line items" on public.vendor_line_items using (
  exists (
    select 1 from public.vendors v
    join public.chapters c on c.id = v.chapter_id
    where v.id = vendor_id and c.user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────
-- GUESTS
-- ─────────────────────────────────────────────
create table public.guests (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  rsvp_status text default 'pending', -- 'pending' | 'confirmed' | 'declined'
  dietary_notes text,
  table_number integer,
  side text, -- 'bride' | 'groom' | 'both'
  notes text,
  created_at timestamptz default now()
);

alter table public.guests enable row level security;
create policy "Chapter owner manages guests" on public.guests using (
  exists (select 1 from public.chapters c where c.id = chapter_id and c.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- CALENDAR EVENTS
-- ─────────────────────────────────────────────
create table public.calendar_events (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  title text not null,
  event_date timestamptz not null,
  event_type text default 'reminder', -- 'reminder' | 'vendor_call' | 'payment' | 'custom'
  notes text,
  vendor_id uuid references public.vendors(id) on delete set null,
  is_complete boolean default false,
  created_at timestamptz default now()
);

alter table public.calendar_events enable row level security;
create policy "Chapter owner manages calendar" on public.calendar_events using (
  exists (select 1 from public.chapters c where c.id = chapter_id and c.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- SUBCHAPTER NOTES (Stationery, Additional Notes)
-- ─────────────────────────────────────────────
create table public.subchapter_notes (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  subchapter text not null, -- 'stationery' | 'notes' | 'seating'
  notes text,
  prompt_answers jsonb default '{}',
  updated_at timestamptz default now()
);

alter table public.subchapter_notes enable row level security;
create policy "Chapter owner manages notes" on public.subchapter_notes using (
  exists (select 1 from public.chapters c where c.id = chapter_id and c.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- UPLOADS
-- ─────────────────────────────────────────────
create table public.uploads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  chapter_id uuid references public.chapters(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text, -- 'image' | 'pdf' | 'csv'
  related_to text, -- subchapter name
  file_size_bytes bigint,
  created_at timestamptz default now()
);

alter table public.uploads enable row level security;
create policy "Users manage own uploads" on public.uploads using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- MOODBOARD ITEMS
-- ─────────────────────────────────────────────
create table public.moodboard_items (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  item_type text not null, -- 'image' | 'drawing' | 'text'
  content_url text, -- for images
  drawing_data jsonb, -- for canvas drawing paths
  pos_x numeric default 0,
  pos_y numeric default 0,
  width numeric default 200,
  height numeric default 200,
  z_index integer default 0,
  created_at timestamptz default now()
);

alter table public.moodboard_items enable row level security;
create policy "Chapter owner manages moodboard" on public.moodboard_items using (
  exists (select 1 from public.chapters c where c.id = chapter_id and c.user_id = auth.uid())
);

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS (run manually in Supabase dashboard too)
-- ─────────────────────────────────────────────
-- Create these buckets in Supabase > Storage:
-- 1. 'profile-photos'  (public: true)
-- 2. 'uploads'         (public: false)
-- 3. 'moodboard'       (public: false)

-- ─────────────────────────────────────────────
-- HELPFUL VIEWS
-- ─────────────────────────────────────────────

-- Budget actual (sum of booked vendors)
create or replace view public.budget_actuals as
select
  v.chapter_id,
  v.category,
  sum(li.price) as actual_total
from public.vendors v
join public.vendor_line_items li on li.vendor_id = v.id
where v.is_booked = true
group by v.chapter_id, v.category;

-- Guest summary
create or replace view public.guest_summary as
select
  chapter_id,
  count(*) as total_guests,
  count(*) filter (where rsvp_status = 'confirmed') as confirmed,
  count(*) filter (where rsvp_status = 'declined') as declined,
  count(*) filter (where rsvp_status = 'pending') as pending
from public.guests
group by chapter_id;
