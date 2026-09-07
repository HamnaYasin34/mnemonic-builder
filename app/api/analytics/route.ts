// ─────────────────────────────────────────────────────────────────────────────
// app/api/analytics/route.ts
// Phase 5: Server-side analytics event ingestion.
//
// Authenticated batch endpoint for syncing local analytics events to Supabase.
// The user_id is derived from the Supabase session — never trusted from the
// client. Events are validated but NOT inspected for medical content.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  // Authenticate the user
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const events = Array.isArray(body.events) ? body.events : []
  if (events.length === 0) {
    return NextResponse.json({ success: true, inserted: 0 })
  }

  // Cap at 100 events per request to prevent abuse
  if (events.length > 100) {
    return NextResponse.json({ success: false, error: 'Maximum 100 events per request.' }, { status: 400 })
  }

  let inserted = 0
  for (const event of events) {
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') continue

    try {
      const { error } = await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: event.type,
        topic: typeof event.topic === 'string' ? event.topic.substring(0, 200) : null,
        subject: typeof event.subject === 'string' ? event.subject.substring(0, 50) : null,
        metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : null,
        timestamp: event.timestamp || new Date().toISOString(),
      })
      if (!error) inserted++
    } catch {
      // continue with next event
    }
  }

  return NextResponse.json({ success: true, inserted })
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
