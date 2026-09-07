-- =============================================================================
-- MnemonicFlow: Create public.profiles table + RLS + auto-creation trigger
-- Migration: 20260829_create_profiles_table.sql
--
-- This migration:
--   1. Creates the public.profiles table (if not exists)
--   2. Enables Row Level Security
--   3. Adds policies so users can only access their own profile
--   4. Adds a trigger to auto-create a profile row on user signup
--   5. Backfills profiles for any existing auth.users without a profile row
--
-- SAFE TO RE-RUN: All operations use IF NOT EXISTS / IF NOT EXISTS guards.
-- =============================================================================

-- ─── 1. Create the profiles table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL DEFAULT '',
  full_name   text,
  avatar_url  text,
  program     text CHECK (program IN ('mbbs', 'bds')),
  academic_year text,
  college     text,
  total_cards   integer NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  streak_days   integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Enable Row Level Security ──────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS Policies ───────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ─── 4. Auto-create profile on signup ──────────────────────────────────────

-- Drop first to make re-runs safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── 5. Backfill existing users without a profile row ──────────────────────

INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data ->> 'full_name', NULL),
  COALESCE(u.raw_user_meta_data ->> 'avatar_url', NULL)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ─── 6. Auto-update updated_at timestamp ───────────────────────────────────

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
