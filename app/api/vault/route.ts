import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'

/**
 * GET /api/vault — list saved cards for the authenticated user
 * Query params: ?subject=<subjectId> (optional filter)
 */
export async function GET(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject')

  let query = supabase
    .from('vault_cards')
    .select('id, mnemonic_id, subject, card_data, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (subject) {
    query = query.eq('subject', subject)
  }

  const { data, error } = await query
  if (error) {
    console.error('[MnemonicFlow Vault] Failed to list cards:', error.message)
    return NextResponse.json({ success: false, error: 'Failed to load saved cards' }, { status: 500 })
  }

  const cards = (data ?? []).map(row => ({
    id: row.id,
    mnemonicId: row.mnemonic_id,
    subject: row.subject,
    cardData: row.card_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return NextResponse.json({ success: true, cards })
}

/**
 * POST /api/vault — save a mnemonic to the vault
 * Body: { mnemonicId, subject, cardData }
 * Prevents duplicates by (user_id, mnemonic_id).
 */
export async function POST(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { mnemonicId, subject, cardData } = body
  if (!mnemonicId || !cardData) {
    return NextResponse.json({ success: false, error: 'mnemonicId and cardData are required' }, { status: 400 })
  }

  // Check for duplicate — prevent saving the same mnemonic twice
  const { data: existing } = await supabase
    .from('vault_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('mnemonic_id', mnemonicId)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true, alreadySaved: true, id: existing[0].id })
  }

  const { data, error } = await supabase
    .from('vault_cards')
    .insert({
      user_id: user.id,
      mnemonic_id: mnemonicId,
      subject: subject ?? null,
      card_data: cardData,
    })
    .select('id, mnemonic_id, subject, card_data, created_at')
    .single()

  if (error) {
    console.error('[MnemonicFlow Vault] Failed to save card:', error.message)
    return NextResponse.json({ success: false, error: 'Failed to save card' }, { status: 500 })
  }

  return NextResponse.json({ success: true, alreadySaved: false, card: data })
}

/**
 * DELETE /api/vault — unsave/delete a saved mnemonic
 * Body: { mnemonicId } or { id } (vault_cards row id)
 */
export async function DELETE(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { mnemonicId, id } = body

  let error
  if (id) {
    ;({ error } = await supabase
      .from('vault_cards')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id))
  } else if (mnemonicId) {
    ;({ error } = await supabase
      .from('vault_cards')
      .delete()
      .eq('user_id', user.id)
      .eq('mnemonic_id', mnemonicId))
  } else {
    return NextResponse.json({ success: false, error: 'Provide mnemonicId or id' }, { status: 400 })
  }

  if (error) {
    console.error('[MnemonicFlow Vault] Failed to delete card:', error.message)
    return NextResponse.json({ success: false, error: 'Failed to delete card' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
