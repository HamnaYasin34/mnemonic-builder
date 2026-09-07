import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    // For OAuth users (Google), ensure a profile row exists with consent defaults
    if (user) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!existing) {
        const now = new Date().toISOString()
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email ?? '',
          full_name: user.user_metadata?.full_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          terms_accepted: true,
          terms_accepted_at: now,
          research_consent: false,
          research_consent_at: null,
        })
      }
    }
  }
  return NextResponse.redirect(new URL('/', req.url))
}
