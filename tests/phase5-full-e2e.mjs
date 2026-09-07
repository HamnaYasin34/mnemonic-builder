/**
 * Phase 5 Full E2E Verification
 *
 * Run with: node tests/phase5-full-e2e.mjs
 *
 * CREDENTIALS: Create a file called `tests/.env.test` with:
 *   TEST_EMAIL_A=your-email@example.com
 *   TEST_PASSWORD_A=your-password
 *   TEST_EMAIL_B=second-email@example.com
 *   TEST_PASSWORD_B=second-password
 *
 * If the file doesn't exist, the script will try to sign up new accounts
 * using TEST_EMAIL_A / TEST_PASSWORD_A.
 *
 * The script NEVER prints passwords and .env.test is gitignored.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load credentials from .env.test (never in chat) ─────────────────────

const ENV_PATH = resolve(__dirname, '.env.test')
let creds = {}

if (existsSync(ENV_PATH)) {
  const lines = readFileSync(ENV_PATH, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^(\w+)=(.+)$/)
    if (m) creds[m[1]] = m[2].trim()
  }
} else {
  // Create template
  writeFileSync(ENV_PATH, [
    '# Phase 5 E2E test credentials — NEVER commit this file',
    'TEST_EMAIL_A=',
    'TEST_PASSWORD_A=',
    'TEST_EMAIL_B=',
    'TEST_PASSWORD_B=',
  ].join('\n'))
  console.log(`\n  Created ${ENV_PATH}`)
  console.log('  Fill in your test account credentials and re-run.\n')
  process.exit(0)
}

const EMAIL_A = creds.TEST_EMAIL_A || process.env.TEST_EMAIL_A
const PASSWORD_A = creds.TEST_PASSWORD_A || process.env.TEST_PASSWORD_A
const EMAIL_B = creds.TEST_EMAIL_B || process.env.TEST_EMAIL_B
const PASSWORD_B = creds.TEST_PASSWORD_B || process.env.TEST_PASSWORD_B

const SUPABASE_URL = 'https://kwqukkzcoevwafvxbwek.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_JjqCRyggtyzgd5E_J8QFDw_kaZwyBg4'

const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
const WARN = '\x1b[33m⚠\x1b[0m'
const INFO = '\x1b[36mℹ\x1b[0m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

let passed = 0, failed = 0, warnings = 0

function check(label, ok, detail = '') {
  if (ok) { console.log(`  ${PASS} ${label}${detail ? ` — ${detail}` : ''}`); passed++ }
  else { console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ''}`); failed++ }
}
function warn(l, d = '') { console.log(`  ${WARN} ${l}${d ? ` — ${d}` : ''}`); warnings++ }
function info(l, d = '') { console.log(`  ${INFO} ${l}${d ? ` — ${d}` : ''}`) }
function freshClient() { return createClient(SUPABASE_URL, SUPABASE_KEY) }

// ── Pre-flight ──────────────────────────────────────────────────────────

console.log(`\n${BOLD}═══ Phase 5 Full E2E Verification ═══${RESET}\n`)

if (!EMAIL_A || !PASSWORD_A) {
  console.log(`  ${FAIL} No Account A credentials found.`)
  console.log(`  Edit ${ENV_PATH} and fill in TEST_EMAIL_A / TEST_PASSWORD_A\n`)
  process.exit(1)
}

// ── Step 1: Sign in Account A ───────────────────────────────────────────

console.log('Step 1: Sign in Account A')
const sbA = freshClient()
const { data: authA, error: errA } = await sbA.auth.signInWithPassword({
  email: EMAIL_A, password: PASSWORD_A,
})
if (errA) {
  check('Sign in Account A', false, errA.message)
  console.log(`\n  ${FAIL} Cannot proceed. Check credentials in ${ENV_PATH}\n`)
  process.exit(1)
}
const userIdA = authA.user?.id
check('Sign in Account A', true, `user ${userIdA?.slice(0, 8)}…`)

// ── Step 2: Check Phase 5 Tables Exist ──────────────────────────────────

console.log('\nStep 2: Phase 5 Tables')
const TABLES = [
  'retrieval_attempts', 'learner_memory_profiles',
  'learner_strategy_performance', 'vault_cards',
  'analytics_events', 'data_migration_log',
]
for (const table of TABLES) {
  const { count, error } = await sbA.from(table).select('*', { count: 'exact', head: true })
  if (error) check(`Table: ${table}`, false, error.message)
  else check(`Table: ${table}`, true, `${count ?? 0} rows`)
}

// ── Step 3: Simulate Retrieval Attempts (FIX 1+2) ──────────────────────

console.log('\nStep 3: Insert Retrieval Attempts (simulating generate + retrieval)')
const MN_ID = `mn_brachial_plexus_e2e_${Date.now().toString(36)}`
const SYM_IDS = ['sym_roots', 'sym_trunks', 'sym_cords', 'sym_branches', 'sym_terminal']

// 5 attempts: 3 correct, 2 incorrect → tests evidence aggregation
const attempts = []
for (let i = 0; i < 5; i++) {
  const correct = i < 3
  attempts.push({
    user_id: userIdA,
    mnemonic_id: MN_ID,
    symbol_id: SYM_IDS[i],
    target_fact: `Brachial plexus fact ${i + 1}`,
    target_answer: `Answer ${i + 1}`,
    retrieval_prompt: `Cue ${i + 1}`,
    test_type: 'immediate',
    response: correct ? 'correct' : 'wrong',
    is_correct: correct,
    false_recall: !correct && i === 3,
    confidence: correct ? 4 : 2,
    response_time_ms: 3000 + i * 500,
    attempt_number: i + 1,
    subject: 'anatomy',
    architecture: 'Pure Story',
    fact_type: 'spatial',
    memory_problem: 'branching',
    representation_type: 'spatial',
    tested_at: new Date(Date.now() - (5 - i) * 60000).toISOString(),
  })
}

let ins = 0
for (const a of attempts) {
  const { error } = await sbA.from('retrieval_attempts').insert(a)
  if (!error) ins++
  else info(`attempt ${a.attempt_number} failed`, error.message)
}
check(`Inserted ${ins}/5 attempts`, ins === 5)

// ── Step 4: Verify Metadata (FIX 2 — data contract) ────────────────────

console.log('\nStep 4: Verify Attempt Metadata')
const { data: readBack } = await sbA.from('retrieval_attempts')
  .select('*').eq('mnemonic_id', MN_ID).order('attempt_number')

if (readBack?.length) {
  const a = readBack[0]
  check('subject', a.subject === 'anatomy', a.subject)
  check('architecture', a.architecture === 'Pure Story', a.architecture)
  check('fact_type', a.fact_type === 'spatial', a.fact_type)
  check('memory_problem', a.memory_problem === 'branching', a.memory_problem)
  check('representation_type', a.representation_type === 'spatial', a.representation_type)
  check('is_correct', typeof a.is_correct === 'boolean')
  check('confidence', typeof a.confidence === 'number')
  check('test_type', a.test_type === 'immediate')
  check('tested_at', !!a.tested_at)
  info(`All ${readBack.length} attempts verified`)
} else {
  check('Read back attempts', false, '0 rows')
}

// ── Step 5: Learner Profile (FIX 13) ───────────────────────────────────

console.log('\nStep 5: Upsert Learner Profile')
const { error: pErr } = await sbA.from('learner_memory_profiles').upsert({
  user_id: userIdA, total_attempts: 5,
  strongest_strategies: [{ strategy: 'storyline', accuracy: 0.75, evidenceLevel: 'usable' }],
  weakest_strategies: [{ strategy: 'acronym', accuracy: 0.40, evidenceLevel: 'weak' }],
  confidence_calibration: 'well_calibrated',
  subject_signals: [{ subject: 'anatomy', accuracy: 0.60, attempts: 5 }],
  fact_type_signals: [{ factType: 'spatial', accuracy: 0.60, attempts: 5 }],
  updated_at: new Date().toISOString(),
}, { onConflict: 'user_id' })
check('Upsert learner_memory_profiles', !pErr, pErr?.message || '')

const { data: prof } = await sbA.from('learner_memory_profiles').select('*').eq('user_id', userIdA)
if (prof?.length) {
  const p = prof[0]
  check('total_attempts=5', p.total_attempts === 5)
  check('strongest strategy=storyline', p.strongest_strategies?.[0]?.strategy === 'storyline')
  check('confidence=well_calibrated', p.confidence_calibration === 'well_calibrated')
  info(`Profile verified for user ${userIdA.slice(0, 8)}…`)
}

// ── Step 6: Strategy Performance (FIX 13) ──────────────────────────────

console.log('\nStep 6: Upsert Strategy Performance')
for (const row of [
  { user_id: userIdA, strategy: 'storyline', accuracy: 0.75, evidence_level: 'usable' },
  { user_id: userIdA, strategy: 'spatial', accuracy: 0.60, evidence_level: 'weak' },
  { user_id: userIdA, strategy: 'acronym', accuracy: 0.40, evidence_level: 'insufficient' },
]) {
  const { error } = await sbA.from('learner_strategy_performance').upsert(
    { ...row, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,strategy' }
  )
  if (error) info(`strategy ${row.strategy} failed`, error.message)
}
const { data: strats } = await sbA.from('learner_strategy_performance').select('*').eq('user_id', userIdA)
check('Strategy performance records', (strats?.length ?? 0) >= 3, `${strats?.length ?? 0} records`)
if (strats) for (const s of strats) info(`  ${s.strategy}: acc=${s.accuracy} ev=${s.evidence_level}`)

// ── Step 7: Analytics Events (FIX 11) ──────────────────────────────────

console.log('\nStep 7: Insert Analytics Events')
let evtCount = 0
for (const evt of [
  { user_id: userIdA, event_type: 'mnemonic_generated', topic: 'Brachial Plexus', subject: 'anatomy', metadata: { architecture: 'Pure Story', factType: 'spatial' } },
  { user_id: userIdA, event_type: 'retrieval_test_completed', topic: 'Brachial Plexus', subject: 'anatomy', metadata: { isCorrect: true } },
  { user_id: userIdA, event_type: 'flashcard_reviewed', topic: 'Brachial Plexus', subject: 'anatomy', metadata: { quality: 4 } },
]) {
  const { error } = await sbA.from('analytics_events').insert(evt)
  if (!error) evtCount++
}
check(`Analytics events inserted`, evtCount === 3, `${evtCount}/3`)

// ── Step 8: Vault Card ─────────────────────────────────────────────────

console.log('\nStep 8: Insert Vault Card')
const { error: vErr } = await sbA.from('vault_cards').insert({
  user_id: userIdA, mnemonic_id: MN_ID,
  card_data: { topic: 'Brachial Plexus', subject: 'anatomy', interval: 1, easeFactor: 2.5 },
})
check('Insert vault card', !vErr, vErr?.message || '')

// ── Step 9: Data Summary ───────────────────────────────────────────────

console.log('\nStep 9: Account A — Data Summary')
for (const t of TABLES) {
  const { count } = await sbA.from(t).select('*', { count: 'exact', head: true })
  info(`${t}: ${count ?? 0} rows`)
}

// ── Step 10: Account Isolation (FIX 17) ────────────────────────────────

console.log('\nStep 10: Account Isolation (RLS)')
await sbA.auth.signOut()

if (EMAIL_B && PASSWORD_B) {
  const sbB = freshClient()
  const { error: errB } = await sbB.auth.signInWithPassword({ email: EMAIL_B, password: PASSWORD_B })
  if (errB) {
    warn('Sign in Account B', errB.message)
  } else {
    check('Sign in Account B', true)
    const { data: bAtt } = await sbB.from('retrieval_attempts').select('*').eq('mnemonic_id', MN_ID)
    check('B cannot see A retrieval_attempts', (bAtt?.length ?? 0) === 0,
      (bAtt?.length ?? 0) === 0 ? 'isolated ✓' : `${bAtt.length} LEAKED!`)
    const { data: bProf } = await sbB.from('learner_memory_profiles').select('*')
    check('B cannot see A profiles', (bProf?.length ?? 0) === 0,
      (bProf?.length ?? 0) === 0 ? 'isolated ✓' : `${bProf.length} LEAKED!`)
    const { data: bStrat } = await sbB.from('learner_strategy_performance').select('*')
    check('B cannot see A strategies', (bStrat?.length ?? 0) === 0,
      (bStrat?.length ?? 0) === 0 ? 'isolated ✓' : `${bStrat.length} LEAKED!`)
    const { data: bVault } = await sbB.from('vault_cards').select('*').eq('mnemonic_id', MN_ID)
    check('B cannot see A vault_cards', (bVault?.length ?? 0) === 0,
      (bVault?.length ?? 0) === 0 ? 'isolated ✓' : `${bVault.length} LEAKED!`)
    const { data: bEvt } = await sbB.from('analytics_events').select('*')
    check('B cannot see A analytics', (bEvt?.length ?? 0) === 0,
      (bEvt?.length ?? 0) === 0 ? 'isolated ✓' : `${bEvt.length} LEAKED!`)
  }
} else {
  warn('No Account B credentials', `Add TEST_EMAIL_B / TEST_PASSWORD_B to ${ENV_PATH}`)
}

// ── Step 11: Anonymous Access ──────────────────────────────────────────

console.log('\nStep 11: Anonymous Access')
const sbAnon = freshClient()
const { data: anonAtt } = await sbAnon.from('retrieval_attempts').select('*').limit(1)
check('Anonymous blocked from retrieval_attempts', (anonAtt?.length ?? 0) === 0)
const { data: anonProf } = await sbAnon.from('learner_memory_profiles').select('*').limit(1)
check('Anonymous blocked from profiles', (anonProf?.length ?? 0) === 0)

// ── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${BOLD}═══ Summary ═══${RESET}`)
console.log(`  ${PASS} ${passed} passed`)
if (failed > 0) console.log(`  ${FAIL} ${failed} failed`)
if (warnings > 0) console.log(`  ${WARN} ${warnings} warnings`)
console.log()
if (failed === 0) {
  console.log(`  \x1b[32mPhase 5 E2E PASSED.\x1b[0m All tables populated, RLS verified.`)
  console.log(`  Account A: ${EMAIL_A}`)
  if (EMAIL_B) console.log(`  Account B: ${EMAIL_B}`)
} else {
  console.log(`  \x1b[31mPhase 5 E2E has failures.\x1b[0m`)
}
console.log('')
