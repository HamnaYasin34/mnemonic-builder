-- =============================================================================
-- MnemonicFlow Phase 5 — Supabase Schema Migration
-- Run this SQL in the Supabase SQL Editor to create Phase 5 tables.
-- Idempotent: uses IF NOT EXISTS / DO $$ ... END $$ blocks.
-- =============================================================================

-- ── A. retrieval_attempts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.retrieval_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mnemonic_id text NOT NULL,
  symbol_id text NOT NULL,

  target_fact text,
  target_answer text,
  retrieval_prompt text,

  test_type text NOT NULL DEFAULT 'immediate',
  response text,
  is_correct boolean NOT NULL DEFAULT false,
  false_recall boolean DEFAULT false,
  confidence integer CHECK (confidence >= 1 AND confidence <= 5),
  response_time_ms integer,

  delay_interval text,
  distractors jsonb,

  subject text,
  architecture text,
  representation_type text,
  memory_problem text,

  evidence_label text,
  attempt_number integer NOT NULL DEFAULT 1,

  tested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_retrieval_attempts_user_tested
  ON public.retrieval_attempts (user_id, tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_retrieval_attempts_user_mnemonic
  ON public.retrieval_attempts (user_id, mnemonic_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_attempts_user_symbol
  ON public.retrieval_attempts (user_id, symbol_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_attempts_user_subject
  ON public.retrieval_attempts (user_id, subject);
CREATE INDEX IF NOT EXISTS idx_retrieval_attempts_user_architecture
  ON public.retrieval_attempts (user_id, architecture);

-- RLS
ALTER TABLE public.retrieval_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'retrieval_attempts_select_own' AND tablename = 'retrieval_attempts'
  ) THEN
    CREATE POLICY retrieval_attempts_select_own
      ON public.retrieval_attempts FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'retrieval_attempts_insert_own' AND tablename = 'retrieval_attempts'
  ) THEN
    CREATE POLICY retrieval_attempts_insert_own
      ON public.retrieval_attempts FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'retrieval_attempts_delete_own' AND tablename = 'retrieval_attempts'
  ) THEN
    CREATE POLICY retrieval_attempts_delete_own
      ON public.retrieval_attempts FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── B. learner_memory_profiles ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.learner_memory_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_accuracy numeric DEFAULT 0,
  average_confidence numeric DEFAULT 0,
  confidence_calibration text DEFAULT 'insufficient_data',
  average_latency_ms numeric DEFAULT 0,

  total_retrieval_attempts integer DEFAULT 0,
  total_successful_retrievals integer DEFAULT 0,

  strongest_strategy text,
  weakest_strategy text,

  profile_version integer DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.learner_memory_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'learner_profiles_select_own' AND tablename = 'learner_memory_profiles'
  ) THEN
    CREATE POLICY learner_profiles_select_own
      ON public.learner_memory_profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'learner_profiles_upsert_own' AND tablename = 'learner_memory_profiles'
  ) THEN
    CREATE POLICY learner_profiles_upsert_own
      ON public.learner_memory_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'learner_profiles_update_own' AND tablename = 'learner_memory_profiles'
  ) THEN
    CREATE POLICY learner_profiles_update_own
      ON public.learner_memory_profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── C. learner_strategy_performance ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.learner_strategy_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  strategy text NOT NULL,
  subject text,
  fact_type text,

  attempts integer DEFAULT 0,
  correct integer DEFAULT 0,
  accuracy numeric DEFAULT 0,

  average_confidence numeric DEFAULT 0,
  average_latency_ms numeric DEFAULT 0,

  false_recall_rate numeric DEFAULT 0,
  high_confidence_error_rate numeric DEFAULT 0,

  delayed_attempts integer DEFAULT 0,
  delayed_correct integer DEFAULT 0,
  delayed_accuracy numeric DEFAULT 0,

  evidence_level text DEFAULT 'insufficient',

  updated_at timestamptz DEFAULT now(),

  UNIQUE (user_id, strategy, subject, fact_type)
);

CREATE INDEX IF NOT EXISTS idx_strategy_perf_user
  ON public.learner_strategy_performance (user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_perf_user_strategy
  ON public.learner_strategy_performance (user_id, strategy);

ALTER TABLE public.learner_strategy_performance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'strategy_perf_select_own' AND tablename = 'learner_strategy_performance'
  ) THEN
    CREATE POLICY strategy_perf_select_own
      ON public.learner_strategy_performance FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'strategy_perf_insert_own' AND tablename = 'learner_strategy_performance'
  ) THEN
    CREATE POLICY strategy_perf_insert_own
      ON public.learner_strategy_performance FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'strategy_perf_update_own' AND tablename = 'learner_strategy_performance'
  ) THEN
    CREATE POLICY strategy_perf_update_own
      ON public.learner_strategy_performance FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'strategy_perf_delete_own' AND tablename = 'learner_strategy_performance'
  ) THEN
    CREATE POLICY strategy_perf_delete_own
      ON public.learner_strategy_performance FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── D. vault_cards ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vault_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mnemonic_id text NOT NULL,
  card_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_cards_user
  ON public.vault_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_vault_cards_user_mnemonic
  ON public.vault_cards (user_id, mnemonic_id);

ALTER TABLE public.vault_cards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_cards_select_own' AND tablename = 'vault_cards'
  ) THEN
    CREATE POLICY vault_cards_select_own
      ON public.vault_cards FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_cards_insert_own' AND tablename = 'vault_cards'
  ) THEN
    CREATE POLICY vault_cards_insert_own
      ON public.vault_cards FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_cards_update_own' AND tablename = 'vault_cards'
  ) THEN
    CREATE POLICY vault_cards_update_own
      ON public.vault_cards FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_cards_delete_own' AND tablename = 'vault_cards'
  ) THEN
    CREATE POLICY vault_cards_delete_own
      ON public.vault_cards FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── E. analytics_events ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  topic text,
  subject text,
  metadata jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_timestamp
  ON public.analytics_events (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_type
  ON public.analytics_events (user_id, event_type);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'analytics_events_select_own' AND tablename = 'analytics_events'
  ) THEN
    CREATE POLICY analytics_events_select_own
      ON public.analytics_events FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'analytics_events_insert_own' AND tablename = 'analytics_events'
  ) THEN
    CREATE POLICY analytics_events_insert_own
      ON public.analytics_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── F. data_migration_log ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.data_migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  migration_type text NOT NULL,
  record_count integer DEFAULT 0,
  status text DEFAULT 'completed',
  migrated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_migration_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'migration_log_select_own' AND tablename = 'data_migration_log'
  ) THEN
    CREATE POLICY migration_log_select_own
      ON public.data_migration_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'migration_log_insert_own' AND tablename = 'data_migration_log'
  ) THEN
    CREATE POLICY migration_log_insert_own
      ON public.data_migration_log FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
