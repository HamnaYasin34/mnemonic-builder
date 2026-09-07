-- =============================================================================
-- MnemonicFlow: Add subject column to vault_cards for efficient filtering
-- Migration: 20260904_vault_subject_column.sql
--
-- Adds a top-level `subject` text column to vault_cards so subject-based
-- filtering doesn't require JSON extraction from card_data. Backfills from
-- existing card_data->>'subject' where available.
-- SAFE TO RE-RUN: uses IF NOT EXISTS guards.
-- =============================================================================

-- Add subject column (nullable — older cards may not have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vault_cards' AND column_name = 'subject'
  ) THEN
    ALTER TABLE public.vault_cards ADD COLUMN subject text;
  END IF;
END $$;

-- Backfill subject from existing card_data JSON
UPDATE public.vault_cards
SET subject = card_data->>'subject'
WHERE subject IS NULL AND card_data->>'subject' IS NOT NULL;

-- Index for subject-based filtering
CREATE INDEX IF NOT EXISTS idx_vault_cards_user_subject
  ON public.vault_cards (user_id, subject);
