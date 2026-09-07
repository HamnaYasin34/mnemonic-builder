/**
 * Phase 5 E2E Verification Script
 *
 * Directly queries Supabase tables to verify Phase 5 data integrity.
 * Run with: node tests/phase5-e2e-verify.mjs
 *
 * Optionally accepts test credentials via environment variables:
 *   TEST_EMAIL=test@example.com TEST_PASSWORD=secret node tests/phase5-e2e-verify.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kwqukkzcoevwafvxbwek.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_JjqCRyggtyzgd5E_J8QFDw_kaZwyBg4'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD

// ── Helpers ──────────────────────────────────────────────────────────────

const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
const WARN = '\x1b[33m⚠\x1b[0m'
const INFO = '\x1b[36mℹ\x1b[0m'

let passed = 0
let failed = 0
let warnings = 0

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${PASS} ${label}${detail ? ` — ${detail}` : ''}`)
    passed++
  } else {
    console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

function warn(label, detail = '') {
  console.log(`  ${WARN} ${label}${detail ? ` — ${detail}` : ''}`)
  warnings++
}

function info(label, detail = '') {
  console.log(`  ${INFO} ${label}${detail ? ` — ${detail}` : ''}`)
}

// ── Phase 1: Connection Test ─────────────────────────────────────────────

console.log('\n\x1b[1m═══ Phase 5 E2E Verification ═══\x1b[0m\n')

console.log('1. Supabase Connection')
try {
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
  if (error) {
    check('Supabase reachable', false, error.message)
  } else {
    check('Supabase reachable', true)
  }
} catch (e) {
  check('Supabase reachable', false, e.message)
}

// ── Phase 2: Authentication ──────────────────────────────────────────────

console.log('\n2. Authentication')
let userId = null
let userName = null

if (TEST_EMAIL && TEST_PASSWORD) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (authError) {
    check('Sign in', false, authError.message)
    console.log(`\n${FAIL} Cannot proceed without authentication. Exiting.`)
    process.exit(1)
  } else {
    userId = authData.user?.id
    userName = authData.user?.email
    check('Sign in', true, `as ${userName}`)
  }
} else {
  // Try to get current session
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session?.user) {
    userId = sessionData.session.user.id
    userName = sessionData.session.user.email
    check('Existing session', true, `as ${userName}`)
  } else {
    warn('No credentials provided', 'Set TEST_EMAIL and TEST_PASSWORD env vars to test authenticated queries')
    console.log(`\n${WARN} Running in anonymous mode — can only verify table existence, not data.`)
  }
}

// ── Phase 3: Table Existence ─────────────────────────────────────────────

console.log('\n3. Phase 5 Tables')

const PHASE5_TABLES = [
  'retrieval_attempts',
  'learner_memory_profiles',
  'learner_strategy_performance',
  'vault_cards',
  'analytics_events',
  'data_migration_log',
]

const tableResults = {}

for (const table of PHASE5_TABLES) {
  try {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        check(`Table: ${table}`, false, 'Table does not exist — run the migration first')
        tableResults[table] = { exists: false, count: 0 }
      } else if (error.code === 'PGRST301' || error.message?.includes('RLS') || error.message?.includes('permission')) {
        // RLS blocked — table exists but no access (expected for anon)
        check(`Table: ${table}`, true, 'exists (RLS enforced)')
        tableResults[table] = { exists: true, count: -1 }
      } else {
        check(`Table: ${table}`, false, error.message)
        tableResults[table] = { exists: false, count: 0 }
      }
    } else {
      check(`Table: ${table}`, true, `${count ?? 0} row${count !== 1 ? 's' : ''}`)
      tableResults[table] = { exists: true, count: count ?? 0 }
    }
  } catch (e) {
    check(`Table: ${table}`, false, e.message)
    tableResults[table] = { exists: false, count: 0 }
  }
}

// ── Phase 4: Data Verification (requires auth) ──────────────────────────

if (userId) {
  console.log('\n4. Retrieval Attempts')
  const { data: attempts, error: attemptError } = await supabase
    .from('retrieval_attempts')
    .select('*')
    .order('tested_at', { ascending: false })
    .limit(50)

  if (attemptError) {
    check('Query retrieval_attempts', false, attemptError.message)
  } else {
    check('Query retrieval_attempts', true, `${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}`)
    
    if (attempts.length > 0) {
      const a = attempts[0]
      check('Has mnemonic_id', !!a.mnemonic_id)
      check('Has symbol_id', !!a.symbol_id)
      check('Has subject', !!a.subject, a.subject || 'null')
      check('Has architecture', !!a.architecture, a.architecture || 'null')
      check('Has fact_type', !!a.fact_type, a.fact_type || 'null')
      check('Has memory_problem', !!a.memory_problem, a.memory_problem || 'null')
      check('Has is_correct field', typeof a.is_correct === 'boolean')
      check('Has confidence', typeof a.confidence === 'number')
      check('Has test_type', !!a.test_type)
      check('Has tested_at', !!a.tested_at)
      
      // Check metadata coverage
      const withSubject = attempts.filter(a => a.subject).length
      const withArch = attempts.filter(a => a.architecture).length
      const withFactType = attempts.filter(a => a.fact_type).length
      info(`Metadata coverage: subject=${withSubject}/${attempts.length}, architecture=${withArch}/${attempts.length}, fact_type=${withFactType}/${attempts.length}`)
      
      if (withSubject === 0 && attempts.length >= 3) {
        warn('No attempts have subject metadata', 'FIX 2 may not be wired correctly')
      }
      if (withFactType === 0 && attempts.length >= 3) {
        warn('No attempts have fact_type metadata', 'FIX 3 may not be wired correctly')
      }
    } else {
      info('No retrieval attempts yet — generate a mnemonic and perform retrieval tests')
    }
  }

  console.log('\n5. Learner Memory Profiles')
  const { data: profiles, error: profileError } = await supabase
    .from('learner_memory_profiles')
    .select('*')

  if (profileError) {
    check('Query learner_memory_profiles', false, profileError.message)
  } else {
    check('Query learner_memory_profiles', true, `${profiles.length} profile${profiles.length !== 1 ? 's' : ''}`)
    
    if (profiles.length > 0) {
      const p = profiles[0]
      check('Has total_attempts', typeof p.total_attempts === 'number', `${p.total_attempts}`)
      check('Has strongest_strategies', Array.isArray(p.strongest_strategies))
      check('Has weakest_strategies', Array.isArray(p.weakest_strategies))
      check('Has confidence_calibration', !!p.confidence_calibration, p.confidence_calibration || 'null')
      
      if (p.strongest_strategies?.length > 0) {
        info(`Top strategy: ${p.strongest_strategies[0]?.strategy} (${p.strongest_strategies[0]?.evidenceLevel})`)
      }
    } else {
      info('No learner profiles yet — perform retrieval tests to generate evidence')
    }
  }

  console.log('\n6. Strategy Performance')
  const { data: strategies, error: stratError } = await supabase
    .from('learner_strategy_performance')
    .select('*')

  if (stratError) {
    check('Query learner_strategy_performance', false, stratError.message)
  } else {
    check('Query learner_strategy_performance', true, `${strategies.length} record${strategies.length !== 1 ? 's' : ''}`)
    
    if (strategies.length > 0) {
      for (const s of strategies) {
        info(`  ${s.strategy}: accuracy=${s.accuracy}, evidence=${s.evidence_level}`)
      }
    } else {
      info('No strategy performance yet — perform retrieval tests to generate evidence')
    }
  }

  console.log('\n7. Vault Cards')
  const { data: vaultCards, error: vaultError } = await supabase
    .from('vault_cards')
    .select('*')

  if (vaultError) {
    check('Query vault_cards', false, vaultError.message)
  } else {
    check('Query vault_cards', true, `${vaultCards.length} card${vaultCards.length !== 1 ? 's' : ''}`)
  }

  console.log('\n8. Analytics Events')
  const { data: events, error: eventError } = await supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (eventError) {
    check('Query analytics_events', false, eventError.message)
  } else {
    check('Query analytics_events', true, `${events.length} event${events.length !== 1 ? 's' : ''}`)
    
    if (events.length > 0) {
      const types = [...new Set(events.map(e => e.event_type))]
      info(`Event types: ${types.join(', ')}`)
    }
  }

  console.log('\n9. Migration Log')
  const { data: migrations, error: migError } = await supabase
    .from('data_migration_log')
    .select('*')

  if (migError) {
    check('Query data_migration_log', false, migError.message)
  } else {
    check('Query data_migration_log', true, `${migrations.length} record${migrations.length !== 1 ? 's' : ''}`)
    
    if (migrations.length > 0) {
      for (const m of migrations) {
        info(`  ${m.migration_type}: ${m.status} (${m.record_count} records)`)
      }
    }
  }

  // ── Phase 5: Account Isolation Test ──────────────────────────────────

  console.log('\n10. Account Isolation (RLS)')
  
  // Sign out and verify data is inaccessible
  await supabase.auth.signOut()
  
  const { data: anonAttempts, error: anonError } = await supabase
    .from('retrieval_attempts')
    .select('*')
    .limit(1)

  if (anonError) {
    // Expected — RLS should block anonymous access
    check('RLS blocks anonymous retrieval_attempts', true, 'RLS enforced')
  } else if (anonAttempts.length === 0) {
    check('RLS blocks anonymous retrieval_attempts', true, 'no data returned')
  } else {
    check('RLS blocks anonymous retrieval_attempts', false, `${anonAttempts.length} rows accessible without auth!`)
  }

  const { data: anonProfiles, error: anonProfileError } = await supabase
    .from('learner_memory_profiles')
    .select('*')
    .limit(1)

  if (anonProfileError || anonProfiles.length === 0) {
    check('RLS blocks anonymous learner_memory_profiles', true, 'RLS enforced')
  } else {
    check('RLS blocks anonymous learner_memory_profiles', false, `${anonProfiles.length} rows accessible without auth!`)
  }

  // Sign back in
  if (TEST_EMAIL && TEST_PASSWORD) {
    await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD })
  }
}

// ── Phase 6: Adaptive Pipeline Verification ─────────────────────────────

if (userId) {
  console.log('\n11. Adaptive Pipeline Check')
  
  // Re-fetch attempts after sign-in
  const { data: allAttempts } = await supabase
    .from('retrieval_attempts')
    .select('mnemonic_id, symbol_id, subject, architecture, fact_type, is_correct, confidence, test_type')
    .order('tested_at', { ascending: false })

  if (allAttempts && allAttempts.length >= 3) {
    // Check if evidence is sufficient for adaptive decisions
    const correctCount = allAttempts.filter(a => a.is_correct).length
    const accuracy = correctCount / allAttempts.length
    info(`Total attempts: ${allAttempts.length}, accuracy: ${(accuracy * 100).toFixed(0)}%`)
    
    // Check metadata completeness
    const subjects = [...new Set(allAttempts.map(a => a.subject).filter(Boolean))]
    const architectures = [...new Set(allAttempts.map(a => a.architecture).filter(Boolean))]
    const factTypes = [...new Set(allAttempts.map(a => a.fact_type).filter(Boolean))]
    
    info(`Unique subjects: ${subjects.join(', ') || 'none'}`)
    info(`Unique architectures: ${architectures.join(', ') || 'none'}`)
    info(`Unique fact types: ${factTypes.join(', ') || 'none'}`)
    
    check('Sufficient evidence for adaptation (≥3 attempts)', allAttempts.length >= 3)
    check('Subject metadata present', subjects.length > 0)
    check('Architecture metadata present', architectures.length > 0)
    
    if (factTypes.length === 0) {
      warn('No fact_type metadata', 'classifyFactType() may not be attached to attempts')
    }
  } else {
    info(`Only ${allAttempts?.length ?? 0} attempts — need ≥3 for adaptive decisions`)
  }
}

// ── Summary ──────────────────────────────────────────────────────────────

console.log('\n\x1b[1m═══ Summary ═══\x1b[0m')
console.log(`  ${PASS} ${passed} passed`)
if (failed > 0) console.log(`  ${FAIL} ${failed} failed`)
if (warnings > 0) console.log(`  ${WARN} ${warnings} warnings`)
console.log()

if (failed === 0) {
  console.log('\x1b[32mPhase 5 infrastructure verified.\x1b[0m')
  if (!userId) {
    console.log('Run with TEST_EMAIL and TEST_PASSWORD to verify authenticated data flow.')
  }
} else {
  console.log('\x1b[31mPhase 5 has issues that need attention.\x1b[0m')
}

console.log('')
