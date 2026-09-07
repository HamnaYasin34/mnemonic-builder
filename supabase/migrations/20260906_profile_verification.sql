-- =============================================================================
-- MnemonicFlow: Profile Verification & One-Time Edit
-- Migration: 20260906_profile_verification.sql
--
-- Adds profile_status and edits_remaining columns to enforce the
-- Draft → Verified → Locked lifecycle with exactly one post-confirm edit.
--
-- SAFE TO RE-RUN: All operations use IF NOT EXISTS / DO $$ guards.
-- =============================================================================

-- ─── 1. Add profile_status column ──────────────────────────────────────────
-- Values: 'draft' (default for existing rows), 'verified', 'locked'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'profile_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN profile_status text NOT NULL DEFAULT 'draft'
      CHECK (profile_status IN ('draft', 'verified', 'locked'));
  END IF;
END $$;

-- ─── 2. Add edits_remaining column ─────────────────────────────────────────
-- Starts at 1 after first confirm, decremented to 0 after one edit.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'edits_remaining'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN edits_remaining integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── 3. Add verified_at timestamp ──────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

-- ─── 4. Backfill existing profiles ─────────────────────────────────────────
-- Existing profiles that already have program + academic_year + college are
-- treated as already verified with no remaining edits (they predate this system).
-- Profiles without complete data remain as 'draft'.

UPDATE public.profiles
SET profile_status = CASE
      WHEN program IS NOT NULL AND academic_year IS NOT NULL AND college IS NOT NULL AND college != ''
        THEN 'verified'
      ELSE 'draft'
    END,
    edits_remaining = CASE
      WHEN program IS NOT NULL AND academic_year IS NOT NULL AND college IS NOT NULL AND college != ''
        THEN 0
      ELSE 0
    END,
    verified_at = CASE
      WHEN program IS NOT NULL AND academic_year IS NOT NULL AND college IS NOT NULL AND college != ''
        THEN now()
      ELSE NULL
    END
WHERE profile_status = 'draft'
  AND (program IS NOT NULL AND academic_year IS NOT NULL AND college IS NOT NULL AND college != '');
