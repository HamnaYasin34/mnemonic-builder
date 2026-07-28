import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  total_cards: number
  total_reviews: number
  streak_days: number
  created_at: string
}
