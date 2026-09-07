export type SubjectId =
  // MBBS
  | 'anatomy' | 'physiology' | 'biochemistry' | 'pharmacology'
  | 'pathology' | 'microbiology' | 'immunology' | 'forensic' | 'community-medicine'
  | 'medicine' | 'surgery' | 'obgyn' | 'pediatrics'
  | 'psychiatry' | 'dermatology' | 'orthopedics' | 'ent'
  | 'ophthalmology' | 'radiology' | 'anesthesia'
  // BDS
  | 'oral-biology' | 'dental-anatomy' | 'oral-histology'
  | 'oral-pathology' | 'dental-materials' | 'operative-dentistry'
  | 'endodontics' | 'prosthodontics' | 'periodontology'
  | 'orthodontics' | 'oral-surgery' | 'community-dentistry'
  | 'pediatric-dentistry' | 'oral-medicine'
  | 'bds-anatomy' | 'bds-physiology' | 'bds-biochemistry'
  | 'bds-pathology' | 'bds-pharmacology' | 'bds-microbiology' | 'bds-radiology'

export type Discipline = 'mbbs' | 'bds'

export interface Subject {
  id: SubjectId
  label: string
  icon: string
  color: string
  accent: string
  description: string
  topics: string[]
  year: 1 | 2 | 3 | 4 | 5
  discipline: Discipline
}

export type MnemonicType = 'acronym' | 'storyline' | 'spatial' | 'hybrid' | 'hook' | 'auto'
export type VisualStyle = 'sketchy' | 'osmosis'

// Narrative genre/voice the STORY is written in. Orthogonal to MnemonicType
// (which controls structure — acronym/storyline/spatial/hybrid) and to
// VisualStyle (which controls image rendering). Defaults to 'clinical' when
// omitted so existing callers keep their current behavior.
export type StoryStyle =
  | 'clinical' | 'dramatic' | 'comedy' | 'fantasy' | 'horror'
  | 'scifi' | 'historical' | 'detective' | 'movie' | 'anime' | 'meme'

export interface GenerateRequest {
  topic: string
  subject: SubjectId
  mnemonicType?: MnemonicType
  visualStyle?: VisualStyle
  storyStyle?: StoryStyle
}

// ── Memory Representation Types ─────────────────────────────────────────────
// One visual symbol inside a mnemonic scene = one independently addressable
// memory unit (cue → fact). This is the "one source of truth" every derived
// layer (memory breakdown, image prompt, audio tour, future Symbol Explorer /
// hotspot / hide-reveal modes) reads from — so mnemonic, story, scene, audio
// and flashcard can never drift apart.

export interface MemorySymbol {
  /** Distinctive visual element, e.g. "S-shaped river channel" */
  cue: string
  /** The exact medical fact this cue encodes, e.g. "Sigmoid sinus" */
  fact: string
  /** Association type: literal | semantic | phonetic | morphological | functional | spatial */
  type?: string
  /** Position in the scene, e.g. "descending toward the neck exit" */
  location?: string
  /** What the element is doing, for process facts, e.g. "emptying into a wide jug" */
  action?: string
  /** Short retrieval cue (2-6 words) for audio narration and quick recall, e.g. "S-shaped descent to jugular" */
  retrievalTrigger?: string
  /** Why this fact is hard to remember, e.g. "sequence", "shape", "branching", "contrast" */
  memoryProblem?: string
  /** Quality label: Excellent | Strong | Acceptable | Weak (server-computed) */
  qualityLabel?: string
}

export interface StoryBeat {
  /** 1-based position in the storyline (server-normalized to array order) */
  order: number
  /** The story's protagonist/guide performing the beat, e.g. "Captain Vega" — absent for characterless stories */
  character?: string
  /** The story's verb made visible, e.g. "steps onto" */
  action: string
  /** The exact story object/symbol identity involved, e.g. "glowing blue spine rail" */
  object: string
  /** Where in the scene this happens, e.g. "central station spine" */
  location?: string
  /** The medical fact this beat encodes, e.g. "superior sagittal sinus" */
  medicalMeaning?: string
}

export interface MnemonicOutput {
  explanation: string
  mnemonic: string
  mnemonicKey: string
  story: string
  visualScene: string
  ankiFront: string
  ankiBack: string
  tags: string[]
  quizQuestion?: string
  quizAnswer?: string

  // ── Structured Memory Representation ──────────────────────────────────
  // All optional: cards saved before this layer existed still load, and
  // every consumer must degrade gracefully when a field is absent.

  /** Memory architecture actually used (e.g. "Pure Story", "Spatial Layout") */
  architecture?: string
  /** Must-remember targets in priority order */
  memoryTargets?: string[]
  /** Symbol map — the addressable cue → fact units of the scene */
  symbols?: MemorySymbol[]
  /** One line naming the scene world and why it organizes these facts */
  sceneSetting?: string
  /** The mental walk through the scene, in retrieval order */
  sceneRoute?: string
  /** Ordered visual beats parsed from the storyline — the shot sequence the image renders (server-validated) */
  storyBeats?: StoryBeat[]
  /** Plain-voice "what you see → what it means → what to recall" */
  visualMemoryAnchor?: string
  /** Exam-relevant associations beyond the memory targets */
  highYieldAssociations?: string[]
  /** Specific encoding mechanisms this particular mnemonic uses */
  cognitivePrinciples?: string[]
  /** Derived audio narration following the visual route (server-built) */
  memoryTour?: string
  /** Compiled image prompt (server-built; visualScene stays the clean caption) */
  imagePrompt?: string
  /** Explicit flashcard question (falls back to ankiFront for backward compat) */
  question?: string
  /** Explicit flashcard answer (falls back to ankiBack for backward compat) */
  answer?: string
  /** FIX 7: versioning fields for failure-driven regeneration */
  mnemonicId?: string
  parentMnemonicId?: string
  generationVersion?: number
  regenerationReason?: string
}

export interface GenerateResponse {
  success: boolean
  data?: MnemonicOutput
  error?: string
}

export interface Flashcard {
  id: string
  topic: string
  subject: SubjectId
  mnemonic: MnemonicOutput
  imageUrl?: string
  interval: number
  easeFactor: number
  repetitions: number
  nextReview: string
  lastReview?: string
  createdAt: string
  updatedAt: string
  isFavorite: boolean
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5

export interface VaultState {
  cards: Flashcard[]
  version: number
  lastSynced?: string
}

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error'

export type VaultFilter = 'all' | 'due' | 'favorites' | SubjectId

// ── Phase 2 Types ──────────────────────────────────────────────────────────

/** Dynamic section for non-clinical subject architectures (anatomy, physiology, etc.) */
export interface CustomSection {
  title: string
  content: string[]
}

/** High-Yield Medical Study Guide */
export interface HighYieldGuide {
  id: string
  topic: string
  subject: SubjectId
  discipline: Discipline
  definition: string
  coreConcept: string
  pathophysiology: string
  clinicalFeatures: string[]
  investigations: string[]
  management: string[]
  complications: string[]
  associations: string[]
  differentialDiagnosis: string[]
  examPearls: string[]
  commonTraps: string[]
  usmleConcepts: string[]
  customSections?: CustomSection[]
  isCurated: boolean
  createdAt: string
}

/** Medical MCQ with proper distractors and wrong-answer explanations */
export interface MedicalMCQ {
  id: string
  topic: string
  subject: SubjectId
  stem: string
  options: string[]
  correctIndex: number
  explanation: string
  wrongExplanations: string[]
  highYieldTakeaway: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  category: string
}

/** Quiz set grouping MCQs by topic */
export interface QuizSet {
  id: string
  topic: string
  subject: SubjectId
  discipline: Discipline
  questions: MedicalMCQ[]
  isCurated: boolean
  createdAt: string
}

/** Phase 2 Anki card with question/answer format */
export interface AnkiCardV2 {
  id: string
  topic: string
  subject: SubjectId
  front: string
  back: string
  examPearl?: string
  mnemonicText?: string
  category: string
  createdAt: string
}

/** Bookmark types for guides, quizzes, and individual MCQs */
export type BookmarkType = 'guide' | 'quiz' | 'mcq'

export interface Bookmark {
  id: string
  type: BookmarkType
  itemId: string
  topic: string
  subject: SubjectId
  createdAt: string
}

// ── Phase 3 Types — AI Examiner & Clinical Simulation ───────────────────────

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'clinical-reasoning'

/** Single message in an AI Examiner or Clinical Simulation session */
export interface ChatMessage {
  id: string
  role: 'examiner' | 'student' | 'patient' | 'clinician' | 'system'
  content: string
  timestamp: string
  /** Examiner-only: evaluation of the student's answer */
  evaluation?: 'correct' | 'partial' | 'incorrect'
  /** Examiner-only: difficulty level after adaptation */
  difficulty?: Difficulty
  /** Whether TTS has been played for this message */
  isSpoken?: boolean
}

/** AI Examiner viva session state */
export interface ExaminerSession {
  id: string
  topic: string
  subject: SubjectId
  messages: ChatMessage[]
  questionCount: number
  correctCount: number
  difficulty: Difficulty
  isActive: boolean
  startedAt: string
}

/** AI Clinical Simulation session state */
export interface SimulationSession {
  id: string
  topic: string
  subject: SubjectId
  patientName: string
  messages: ChatMessage[]
  isActive: boolean
  feedbackGiven: boolean
  startedAt: string
}

// ── Phase 4 Types — Voice & Enhanced Reports ───────────────────────────────

/** Viva performance report returned at end of examiner session */
export interface VivaReport {
  overallScore: number
  questionsAttempted: number
  correctCount: number
  strongAreas: string[]
  weakAreas: string[]
  misconceptions: string[]
  suggestedRevision: string[]
  recommendedGuides: string[]
  recommendedQuizzes: string[]
}

/** Case debrief returned at end of clinical simulation */
export interface CaseDebrief {
  caseSummary: string
  mostLikelyDiagnosis: string
  keyClues: string[]
  differentials: string[]
  missedHistory: string[]
  missedExamFindings: string[]
  missedInvestigations: string[]
  correctInterpretation: string
  initialManagement: string
  redFlags: string[]
  performanceScore: number
  recommendedRevision: string[]
}

// ── Phase 5 Types — Learning Analytics (Extended) ──────────────────────────

export type LearningEvent =
  | 'mnemonic_generated' | 'guide_opened' | 'quiz_started' | 'quiz_completed'
  | 'mcq_answered' | 'flashcard_created' | 'flashcard_reviewed'
  | 'srs_session_completed' | 'simulation_completed' | 'viva_completed'
  | 'retrieval_test_started' | 'retrieval_test_completed'
  | 'retrieval_correct' | 'retrieval_incorrect'
  | 'high_confidence_error' | 'false_recall_detected'
  | 'alternative_mnemonic_generated'

export interface AnalyticsEvent {
  type: LearningEvent
  topic?: string
  subject?: SubjectId
  metadata?: Record<string, string | number | boolean>
  timestamp: string
}

// ── Phase 4 Types — Human Retrieval Validation & Evidence Layer ─────────────

/**
 * The type of retrieval test administered. Each type tests a different
 * dimension of mnemonic effectiveness.
 */
export type RetrievalTestType =
  | 'immediate'        // tested right after generation
  | 'delayed'          // tested after 1/3/7 day interval
  | 'cue_only'         // show only the visual cue, ask for the fact
  | 'discrimination'   // multiple-choice: pick the correct fact from related options
  | 'rephrased'        // the question is reworded to test understanding, not rote recall
  | 'clinical_transfer'// a clinical-context question that requires the underlying fact

/**
 * One retrieval-validation attempt for a single symbol.
 * Only real student interactions populate this — never fabricated.
 */
export interface RetrievalValidation {
  /** Stable ID derived from the mnemonic topic + symbol cue (like MCQ bookmarks). */
  mnemonicId: string
  /** Which symbol within the mnemonic was tested (cue string as identifier). */
  symbolId: string
  /** The medical fact the student should retrieve. */
  targetFact: string
  /** The expected correct answer (may differ from targetFact for rephrased/clinical tests). */
  targetAnswer: string
  /** The retrieval prompt shown to the student (cue text, question, or options). */
  retrievalPrompt: string
  /** Short description of what was shown (e.g. "cue only", "4 options"). */
  cueShown: string
  /** The student's free-text or selected response. */
  response: string
  /** Whether the response was judged correct. */
  isCorrect: boolean
  /** Milliseconds from prompt display to answer submission. */
  responseTimeMs?: number
  /** Student's self-rated confidence 1-5 after answering. */
  confidence?: number
  /** Whether the student gave a plausible-but-incorrect answer (misconception risk). */
  falseRecall?: boolean
  /** Monotonically increasing attempt number for this symbol. */
  attemptNumber: number
  /** ISO timestamp of when the test was taken. */
  testedAt: string
  /** For delayed tests: how long after generation (e.g. "1d", "3d", "7d"). */
  delayInterval?: string
  /** Which type of retrieval test was administered. */
  testType: RetrievalTestType
  /** For discrimination tests: the distractor options shown. */
  distractors?: string[]
}

/**
 * Aggregated evidence metrics for a single symbol, computed from all
 * RetrievalValidation attempts. Never fabricated — "No data yet" when empty.
 */
export interface EvidenceMetrics {
  symbolId: string
  totalAttempts: number
  /** correct retrievals / total attempts */
  recallAccuracy: number
  /** delayed correct / delayed attempts (0 if no delayed tests) */
  delayedRetention: number
  /** false recalls / total attempts */
  falseRecallRate: number
  /** incorrect responses with confidence >= 4 / total responses */
  highConfidenceErrorRate: number
  /** Median retrieval latency in ms (more robust than mean for outliers). */
  medianLatencyMs: number
  /** Accuracy on discrimination-type tests only. */
  discriminationAccuracy: number
  /** Accuracy on rephrased-type tests only. */
  rephrasedAccuracy: number
  /** Accuracy on clinical-transfer tests only. */
  clinicalTransferAccuracy: number
}

/**
 * Human-readable evidence label derived from EvidenceMetrics.
 * Students see these, not raw numbers.
 */
export type EvidenceLabel =
  | 'Strong Retrieval'
  | 'Developing'
  | 'Needs Reinforcement'
  | 'Misleading Cue'
  | 'No Data'

/**
 * Compares Phase 3 AI prediction with observed human retrieval performance.
 * Mismatches are important signals for the mnemonic quality feedback loop.
 */
export interface QualityPredictionComparison {
  symbolId: string
  /** Phase 3 qualityLabel (Excellent/Strong/Acceptable/Weak). */
  predictedQuality: string
  /** Evidence label from human retrieval (Strong Retrieval/Developing/etc.). */
  observedEvidence: EvidenceLabel
  /** Whether prediction and observation align. */
  isMatch: boolean
  /** Human-readable note about the mismatch (if any). */
  note?: string
}

// ── Phase 5 Types — Adaptive Memory Optimization ─────────────────────────────

/**
 * Centralized evidence thresholds. All adaptive decisions check these before
 * acting on learner data. Change these constants to tune sensitivity.
 */
export const EVIDENCE_THRESHOLDS = {
  /** Below this: no adaptive decisions — insufficient data. */
  MIN_ATTEMPTS: 3,
  /** At this level: weak signal — can bias but not force. */
  WEAK_SIGNAL: 3,
  /** At this level: usable signal — can influence strategy selection. */
  USABLE_SIGNAL: 5,
  /** At this level: stronger signal — can confidently bias. */
  STRONG_SIGNAL: 8,
} as const

/**
 * Maximum number of adaptive regeneration attempts per mnemonic.
 * Prevents infinite regeneration loops.
 */
export const MAX_ADAPTIVE_REGENERATIONS = 3

/**
 * Fact-type classification: deterministic categories derived from topic
 * metadata and memoryProblem values. Informs which strategy is compatible.
 */
export type FactType =
  | 'sequence' | 'spatial' | 'contrast' | 'mechanism' | 'association'
  | 'number' | 'pathway' | 'causality' | 'morphology' | 'classification'
  | 'unknown'

/** Evidence strength level for a strategy. */
export type StrategyEvidenceLevel =
  | 'insufficient' | 'weak' | 'usable' | 'strong'

/** Confidence calibration signal. */
export type ConfidenceCalibration =
  | 'well_calibrated' | 'overconfident' | 'underconfident' | 'insufficient_data'

/** Performance record for a single strategy (architecture/encoding). */
export interface StrategyPerformance {
  /** The strategy identifier — normalized from architecture or symbol type. */
  strategy: string
  /** Subject scope (null = global across all subjects). */
  subject?: SubjectId
  /** Fact-type scope (null = global across all fact types). */
  factType?: FactType
  /** Total retrieval attempts with this strategy. */
  attempts: number
  /** Correct retrieval count. */
  correct: number
  /** Raw accuracy (correct / attempts). */
  accuracy: number
  /** Average self-rated confidence (1-5). */
  averageConfidence: number
  /** Average response latency in ms. */
  averageLatencyMs: number
  /** False recall rate. */
  falseRecallRate: number
  /** High-confidence error rate. */
  highConfidenceErrorRate: number
  /** Delayed attempts count. */
  delayedAttempts: number
  /** Delayed correct count. */
  delayedCorrect: number
  /** Delayed accuracy (0 if no delayed tests). */
  delayedAccuracy: number
  /** Evidence strength level derived from attempt count. */
  evidenceLevel: StrategyEvidenceLevel
  /** Last updated ISO timestamp. */
  updatedAt: string
}

/** Performance record for a single subject. */
export interface SubjectPerformance {
  subject: SubjectId
  attempts: number
  correct: number
  accuracy: number
  averageConfidence: number
  weakTopics: string[]
  strongTopics: string[]
  updatedAt: string
}

/** Performance record for a single fact type. */
export interface FactTypePerformance {
  factType: FactType
  attempts: number
  correct: number
  accuracy: number
  updatedAt: string
}

/**
 * Aggregate learner memory profile — the top-level summary used by the
 * adaptive strategy selector and displayed in the learner insights UI.
 */
export interface LearnerProfile {
  /** Total retrieval attempts across all symbols. */
  totalAttempts: number
  /** Total correct retrievals. */
  totalCorrect: number
  /** Overall recall accuracy. */
  overallAccuracy: number
  /** Delayed retrieval accuracy (0 if no delayed tests). */
  delayedAccuracy: number
  /** Average self-rated confidence (1-5). */
  averageConfidence: number
  /** Confidence calibration signal. */
  confidenceCalibration: ConfidenceCalibration
  /** Average response latency in ms. */
  averageLatencyMs: number
  /** Overall false recall rate. */
  falseRecallRate: number
  /** Overall high-confidence error rate. */
  highConfidenceErrorRate: number
  /** Repeated-error rate (symbols with 2+ incorrect attempts / total symbols). */
  repeatedErrorRate: number
  /** Strategies ranked by performance (best first). */
  strategyRanking: StrategyPerformance[]
  /** Strongest strategy (null if insufficient evidence). */
  strongestStrategy: StrategyPerformance | null
  /** Weakest strategy (null if insufficient evidence). */
  weakestStrategy: StrategyPerformance | null
  /** Subject-level performance breakdown. */
  subjectPerformance: SubjectPerformance[]
  /** Weak subjects (accuracy below threshold). */
  weakSubjects: SubjectPerformance[]
  /** Strong subjects (accuracy above threshold). */
  strongSubjects: SubjectPerformance[]
  /** Fact-type performance breakdown. */
  factTypePerformance: FactTypePerformance[]
  /** Profile version for migration/compatibility. */
  profileVersion: number
  /** Last updated ISO timestamp. */
  updatedAt: string
}

/**
 * Compact aggregated signal sent to the generation API.
 * Never contains raw responses or full retrieval history.
 */
export interface AdaptiveSignal {
  /** Top 2-3 strategies with usable+ evidence. */
  strongestStrategies?: Array<{ strategy: string; accuracy: number; evidenceLevel: StrategyEvidenceLevel }>
  /** Bottom 1-2 strategies with usable+ evidence. */
  weakestStrategies?: Array<{ strategy: string; accuracy: number; evidenceLevel: StrategyEvidenceLevel }>
  /** Per-subject accuracy signals (only subjects with usable evidence). */
  subjectSignals?: Array<{ subject: string; accuracy: number; attempts: number }>
  /** Per-fact-type accuracy signals. */
  factTypeSignals?: Array<{ factType: string; accuracy: number; attempts: number }>
  /** Confidence calibration label. */
  confidenceCalibration?: ConfidenceCalibration
  /** Total evidence base size. */
  totalAttempts?: number
}

/**
 * Diagnosis for a retrieval failure — used by the failure-driven regeneration
 * system to decide which alternative strategy to try.
 */
export type FailureReason =
  | 'weak_cue' | 'confusable_cue' | 'poor_discrimination'
  | 'overloaded_scene' | 'incorrect_association' | 'insufficient_evidence'

export interface FailureDiagnosis {
  symbolId: string
  mnemonicId: string
  reason: FailureReason
  currentStrategy: string
  suggestedAlternatives: string[]
  attemptCount: number
  accuracy: number
  note: string
}

/**
 * Retrieval scheduling record for delayed retrieval tests.
 */
export interface RetrievalSchedule {
  mnemonicId: string
  symbolId: string
  /** Next scheduled retrieval test date (ISO). */
  nextRetrievalTestAt: string
  /** Last retrieval test date (ISO). */
  lastRetrievalTestAt: string
  /** Current delay interval target. */
  retrievalDelay: string
  /** How many scheduled tests have been completed. */
  completedScheduledTests: number
}

/**
 * Migration state tracking — prevents duplicate imports of localStorage data.
 */
export interface MigrationState {
  vaultMigrated: boolean
  vaultMigratedAt?: string
  retrievalMigrated: boolean
  retrievalMigratedAt?: string
  bookmarksMigrated: boolean
  bookmarksMigratedAt?: string
}