export type SubjectId =
  | 'anatomy' | 'physiology' | 'biochemistry' | 'pharmacology'
  | 'pathology' | 'microbiology' | 'forensic' | 'community-medicine'
  | 'medicine' | 'surgery' | 'obgyn' | 'pediatrics'
  | 'psychiatry' | 'dermatology' | 'orthopedics' | 'ent'
  | 'ophthalmology' | 'radiology' | 'anesthesia'

export interface Subject {
  id: SubjectId
  label: string
  icon: string
  color: string
  accent: string
  description: string
  topics: string[]
  year: 1 | 2 | 3 | 4 | 5
}

export type MnemonicType = 'acronym' | 'storyline' | 'spatial' | 'hybrid'
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