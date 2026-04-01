-- Flips App - Supabase Database Schema
-- Run this in your Supabase SQL Editor to create all required tables.
-- These tables support the full online backend for the Flips app.

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  style_tag TEXT DEFAULT 'budget',
  phone TEXT DEFAULT '',
  services JSONB DEFAULT '[]'::jsonb,
  email TEXT DEFAULT '',
  vehicle_type TEXT DEFAULT '',
  service_radius INTEGER DEFAULT 0,
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Saved deals table
CREATE TABLE IF NOT EXISTS saved_deals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  store_name TEXT DEFAULT '',
  price NUMERIC DEFAULT NULL,
  original_price NUMERIC DEFAULT NULL,
  savings_amount NUMERIC DEFAULT NULL,
  photo_url TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  source_type TEXT DEFAULT NULL,
  saved_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved deals" ON saved_deals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved deals" ON saved_deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved deals" ON saved_deals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved deals" ON saved_deals
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_saved_deals_user ON saved_deals(user_id);

-- 3. Scan history table
CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_uri TEXT DEFAULT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan history" ON scan_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan history" ON scan_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scan history" ON scan_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scan history" ON scan_history
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_scan_history_user ON scan_history(user_id);

-- 4. Profile blocks table
CREATE TABLE IF NOT EXISTS profile_blocks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  header_image_url TEXT DEFAULT NULL,
  tag_left TEXT DEFAULT 'TIP',
  badge_right TEXT DEFAULT NULL,
  action_label TEXT DEFAULT 'Learn More',
  action_type TEXT DEFAULT 'none',
  place_id TEXT DEFAULT NULL,
  url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profile_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON profile_blocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocks" ON profile_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocks" ON profile_blocks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocks" ON profile_blocks
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_profile_blocks_user ON profile_blocks(user_id);

-- 5. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'other',
  store_name TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_expenses_user ON expenses(user_id);

-- 6. Claimed places table
CREATE TABLE IF NOT EXISTS claimed_places (
  place_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT DEFAULT '',
  is_verified BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (place_id, user_id)
);

ALTER TABLE claimed_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON claimed_places
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims" ON claimed_places
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claims" ON claimed_places
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own claims" ON claimed_places
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Online presence table (may already exist)
CREATE TABLE IF NOT EXISTS online_presence (
  user_id TEXT PRIMARY KEY,
  is_online BOOLEAN DEFAULT false,
  full_name TEXT DEFAULT 'Flip User',
  avatar_url TEXT DEFAULT '',
  last_seen TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  profile_ready BOOLEAN DEFAULT false,
  scan_count INTEGER DEFAULT 0,
  activity TEXT DEFAULT 'browsing',
  phone TEXT DEFAULT '',
  services JSONB DEFAULT '[]'::jsonb,
  email TEXT DEFAULT '',
  vehicle_type TEXT DEFAULT '',
  service_radius INTEGER DEFAULT 0,
  city TEXT DEFAULT ''
);

-- Online presence uses permissive policies since it uses text user_id (not auth UUID)
ALTER TABLE online_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read online presence" ON online_presence
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage presence" ON online_presence
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
