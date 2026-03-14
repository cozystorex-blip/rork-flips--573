-- ============================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  bio text default '' check (char_length(bio) <= 120),
  style_tag text not null default 'budget' check (style_tag in ('budget', 'healthy', 'bulk', 'deals')),
  avatar_url text default '',
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- 2. BLOCKS TABLE
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  block_type text not null check (block_type in ('deal', 'tip', 'store', 'list', 'recipe', 'bulk_purchase')),
  style_badge text check (style_badge is null or style_badge in ('hot', 'new', 'trending', 'update')),
  show_new_badge boolean default false,
  title text not null check (char_length(title) <= 60),
  description text default '' check (char_length(description) <= 300),
  header_image_url text not null,
  action_type text not null default 'none' check (action_type in ('none', 'view_on_map', 'open_place_profile', 'open_url')),
  action_label text default 'Learn More' check (char_length(action_label) <= 30),
  place_id text,
  url text,
  created_at timestamptz default now()
);

-- 3. RLS POLICIES FOR PROFILES
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. RLS POLICIES FOR BLOCKS
alter table public.blocks enable row level security;

create policy "Users can read own blocks"
  on public.blocks for select
  using (auth.uid() = user_id);

create policy "Users can insert own blocks"
  on public.blocks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own blocks"
  on public.blocks for update
  using (auth.uid() = user_id);

create policy "Users can delete own blocks"
  on public.blocks for delete
  using (auth.uid() = user_id);

-- 5. PROFILES_PEOPLES TABLE (Discover profiles for all users)
create table if not exists public.profiles_peoples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  bio text default '',
  avatar_url text default '',
  style text default 'budget',
  weekly_spend numeric default 0,
  logs_count integer default 0,
  created_at timestamptz default now()
);

-- 6. RLS POLICIES FOR PROFILES_PEOPLES
alter table public.profiles_peoples enable row level security;

create policy "Anyone authenticated can read profiles_peoples"
  on public.profiles_peoples for select
  to authenticated
  using (true);

create policy "Users can insert own profiles_peoples row"
  on public.profiles_peoples for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profiles_peoples row"
  on public.profiles_peoples for update
  using (auth.uid() = user_id);

-- 7. STORAGE BUCKETS
-- Go to Supabase Dashboard > Storage and create these buckets:
--   - "avatars" (public)
--   - "block_images" (public)
--
-- Then run these policies:

-- For avatars bucket
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public avatar read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 8. FOLLOWS TABLE
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  following_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  constraint follows_unique unique (follower_user_id, following_user_id),
  constraint no_self_follow check (follower_user_id != following_user_id)
);

-- 9. RLS POLICIES FOR FOLLOWS
alter table public.follows enable row level security;

create policy "Anyone authenticated can read follows"
  on public.follows for select
  to authenticated
  using (true);

create policy "Users can insert own follow rows"
  on public.follows for insert
  with check (auth.uid() = follower_user_id);

create policy "Users can delete own follow rows"
  on public.follows for delete
  using (auth.uid() = follower_user_id);

-- For block_images bucket
insert into storage.buckets (id, name, public) values ('block_images', 'block_images', true)
on conflict (id) do nothing;

create policy "Users can upload block images"
  on storage.objects for insert
  with check (bucket_id = 'block_images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update block images"
  on storage.objects for update
  using (bucket_id = 'block_images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public block image read"
  on storage.objects for select
  using (bucket_id = 'block_images');

-- ============================================
-- 10. DEALS TABLE UPGRADE — STORE-BRAND VERIFIED DEALS
-- ============================================
-- Run these ALTER statements to add verified deal columns.
-- They use IF NOT EXISTS / safe patterns so re-running is harmless.

alter table public.deals add column if not exists source_url text;
alter table public.deals add column if not exists original_price numeric;
alter table public.deals add column if not exists last_verified timestamptz;
alter table public.deals add column if not exists is_verified boolean default false;
alter table public.deals add column if not exists brand_slug text;
alter table public.deals add column if not exists deal_expires_at timestamptz;
alter table public.deals add column if not exists savings_percent numeric;

-- Update the category check to accept both cased and lowercase values
-- (drop old constraint first if it exists, then re-add)
do $
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'deals_category_check' and table_name = 'deals'
  ) then
    alter table public.deals drop constraint deals_category_check;
  end if;
end $;

alter table public.deals add constraint deals_category_check
  check (category in ('Deals', 'Budget', 'Healthy', 'Bulk'));

-- Update source_type check to include 'store_brand'
do $
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'deals_source_type_check' and table_name = 'deals'
  ) then
    alter table public.deals drop constraint deals_source_type_check;
  end if;
end $;

alter table public.deals add constraint deals_source_type_check
  check (source_type in ('user', 'store_brand', 'sample'));

-- Index for faster verified deal queries
create index if not exists idx_deals_source_type on public.deals (source_type);
create index if not exists idx_deals_brand_slug on public.deals (brand_slug);
create index if not exists idx_deals_is_verified on public.deals (is_verified);
create index if not exists idx_deals_is_active on public.deals (is_active);

-- Allow public read on deals for unauthenticated users too (deals are public)
create policy "Anyone can read active deals"
  on public.deals for select
  using (is_active = true);

-- Allow authenticated users to insert deals
create policy "Authenticated users can insert deals"
  on public.deals for insert
  to authenticated
  with check (true);

-- Allow authenticated users to update their own deals
create policy "Users can update own deals"
  on public.deals for update
  to authenticated
  using (auth.uid()::text = user_id or source_type = 'store_brand');
