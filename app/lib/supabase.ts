import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ProfileStatus = 'draft' | 'verified' | 'locked'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  program: 'mbbs' | 'bds' | null
  academic_year: string | null
  college: string | null
  total_cards: number
  total_reviews: number
  streak_days: number
  terms_accepted: boolean
  terms_accepted_at: string | null
  research_consent: boolean
  research_consent_at: string | null
  profile_status: ProfileStatus
  edits_remaining: number
  verified_at: string | null
  created_at: string
  updated_at: string
}
