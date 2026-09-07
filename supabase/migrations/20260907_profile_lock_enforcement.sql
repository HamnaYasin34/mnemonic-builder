-- =============================================================================
-- MnemonicFlow: Profile Verification + Lock Enforcement (Combined)
-- Migration: 20260907_profile_lock_enforcement.sql
--
-- SINGLE MIGRATION that replaces both 20260906 and 20260907.
-- Combines column creation, backfill, and security trigger into one
-- idempotent script. Safe to run on any state of the database.
--
-- What this does:
--   1. Adds profile_status, edits_remaining, verified_at columns (if missing)
--   2. Backfills existing complete profiles as verified (1 edit remaining)
--   3. Adds CHECK constraint on edits_remaining (0 or 1 only)
--   4. Creates BEFORE UPDATE trigger that enforces:
--      - Locked profiles: program and college are IMMUTABLE;
--        academic_year CAN be updated (student progression)
--      - Draft → Verified requires edits_remaining = 1
--      - Verified → Locked requires edits_remaining = 0
--      - Verified → Draft is blocked
--      - Verified + 1 edit: changing program or college AUTO-CONSUMES the edit (→ locked, 0 edits)
--      - Verified + 0 edits cannot modify program or college
--      - academic_year is always updateable (student progression)
--      - edits_remaining is clamped to 0–1 for verified profiles
--
-- SAFE TO RE-RUN: Every step uses IF NOT EXISTS / DO $$ guards.
-- =============================================================================

-- ─── STEP 1: Add columns (if they don't already exist) ─────────────────────

DO $$
BEGIN
  -- 1a. profile_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'profile_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN profile_status text NOT NULL DEFAULT 'draft';
  END IF;

  -- 1b. edits_remaining
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'edits_remaining'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN edits_remaining integer NOT NULL DEFAULT 0;
  END IF;

  -- 1c. verified_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

-- ─── STEP 2: CHECK constraint on profile_status values ─────────────────────
-- Added separately so it works whether the column was just created or already existed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_profile_status_values'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_profile_status_values
      CHECK (profile_status IN ('draft', 'verified', 'locked'));
  END IF;
END $$;

-- ─── STEP 3: CHECK constraint on edits_remaining range ─────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_edits_remaining_range'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_edits_remaining_range
      CHECK (edits_remaining >= 0 AND edits_remaining <= 1);
  END IF;
END $$;

-- ─── STEP 4: Backfill existing complete profiles ───────────────────────────
-- Profiles that already have program + academic_year + college are treated as
-- verified with 1 remaining edit — giving existing users their one allowed edit.
-- Only touches rows still in 'draft' with complete data — never overwrites
-- a profile that was already verified or locked.

UPDATE public.profiles
SET profile_status  = 'verified',
    edits_remaining = 1,
    verified_at     = now()
WHERE profile_status = 'draft'
  AND program        IS NOT NULL
  AND academic_year  IS NOT NULL
  AND college        IS NOT NULL
  AND college        != '';

-- ─── STEP 5: BEFORE UPDATE trigger — lifecycle enforcement ─────────────────
-- Fires on EVERY UPDATE regardless of origin (client, console, API, RPC).
-- This is the security layer that makes the one-time edit rule unbreakable.
--
-- Protected fields (immutable after lock): program, college
-- Progression field (always updateable):   academic_year

DROP TRIGGER IF EXISTS enforce_profile_lifecycle ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_profile_lifecycle();

CREATE OR REPLACE FUNCTION public.enforce_profile_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
BEGIN
  v_old_status := OLD.profile_status;
  v_new_status := NEW.profile_status;

  -- ── Rule 1: LOCKED profiles — program and college are IMMUTABLE ─────────
  -- academic_year may still be updated (student progression).
  IF v_old_status = 'locked' THEN
    IF NEW.program IS DISTINCT FROM OLD.program
       OR NEW.college IS DISTINCT FROM OLD.college THEN
      RAISE EXCEPTION 'Locked profile: degree and college cannot be modified';
    END IF;
    IF v_new_status != 'locked' THEN
      RAISE EXCEPTION 'Locked profile status cannot be changed';
    END IF;
  END IF;

  -- ── Rule 2: Status transition validation ───────────────────────────────
  IF v_new_status != v_old_status THEN

    -- Draft → Verified: must grant exactly 1 edit
    IF v_old_status = 'draft' AND v_new_status = 'verified' THEN
      IF NEW.edits_remaining != 1 THEN
        RAISE EXCEPTION 'Confirming profile must set edits_remaining to 1';
      END IF;

    -- Verified → Locked: must consume all edits (set to 0)
    ELSIF v_old_status = 'verified' AND v_new_status = 'locked' THEN
      IF NEW.edits_remaining != 0 THEN
        RAISE EXCEPTION 'Locking profile must set edits_remaining to 0';
      END IF;

    -- Draft → Locked: not valid, must confirm first
    ELSIF v_old_status = 'draft' AND v_new_status = 'locked' THEN
      RAISE EXCEPTION 'Cannot lock a draft profile; confirm first';

    -- Verified → Draft: regression blocked
    ELSIF v_old_status = 'verified' AND v_new_status = 'draft' THEN
      RAISE EXCEPTION 'Cannot revert verified profile to draft';

    END IF;
  END IF;

  -- ── Rule 3: Edits remaining bounds (defense in depth) ──────────────────
  IF v_new_status = 'verified' AND (NEW.edits_remaining < 0 OR NEW.edits_remaining > 1) THEN
    RAISE EXCEPTION 'Verified profile edits_remaining must be 0 or 1';
  END IF;

  -- ── Rule 4: Verified + 0 edits cannot modify protected fields ──────────
  -- Protected fields: program, college (NOT academic_year).
  IF v_old_status = 'verified' AND OLD.edits_remaining = 0
     AND v_new_status = 'verified'
     AND (NEW.program IS DISTINCT FROM OLD.program
       OR NEW.college IS DISTINCT FROM OLD.college) THEN
    RAISE EXCEPTION 'Verified profile with 0 edits cannot modify degree or college';
  END IF;

  -- ── Rule 5: Verified + 1 edit — auto-consume on protected field change ──
  -- If a verified profile with 1 edit remaining changes program or college
  -- and the client tries to keep status as 'verified' with edits=1,
  -- the trigger AUTO-CONSUMES the edit: → locked, edits=0.
  -- This closes the bypass where a malicious user repeatedly changes
  -- degree/college via DevTools while keeping verified + edits=1.
  -- Changing academic_year alone does NOT consume the edit.
  IF v_old_status = 'verified' AND OLD.edits_remaining = 1
     AND v_new_status = 'verified' AND NEW.edits_remaining = 1
     AND (NEW.program IS DISTINCT FROM OLD.program
       OR NEW.college IS DISTINCT FROM OLD.college) THEN
    NEW.profile_status  := 'locked';
    NEW.edits_remaining := 0;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_profile_lifecycle
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_lifecycle();
