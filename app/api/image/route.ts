import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let body: any

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body.',
      },
      { status: 400 }
    )
  }

  const { visualScene, topic } = body

  if (!visualScene?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Visual scene is required.',
      },
      { status: 400 }
    )
  }

  // NOTE: `visualScene` (built server-side in /api/generate) already contains
  // a complete, self-consistent art directive: the exact style block (e.g.
  // "sketchy hand-drawn ink line art" or "Osmosis whiteboard"), the literal
  // scene to depict, AND a negative prompt (e.g. "NOT 3D render, NOT Pixar
  // style..."). It is authoritative — we pass it straight through instead of
  // layering a second, separate style instruction on top of it.
  const imagePrompt = `Render EXACTLY the following scene and art style. Do not introduce a different art style, do not abstract or symbolize the scene, and do not replace it with an unrelated object, texture, or surface (e.g. do not render this as a whiteboard, glass panel, screen, note, or document with writing on it, unless a surface like that is explicitly and literally part of the scene description itself). Context/topic: ${topic ?? 'Medical concept'}. Scene: ${visualScene}`

  try {
    // Using Pollinations' free, no-auth legacy endpoint (image.pollinations.ai)
    // rather than the newer gen.pollinations.ai/v1/images/generations, which
    // runs on a paid "Pollen" credit system — a zero balance there returns a
    // 402 Payment Required on every request. This endpoint has no such gate.
    const seed = Math.floor(Math.random() * 999999)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`

    const response = await fetch(imageUrl)

    if (!response.ok) {
      console.error('[MnemonicFlow Image API] Pollinations rejected the request:', response.status, await response.text().catch(() => ''))
      return NextResponse.json(
        { success: false, error: `Pollinations API error: ${response.status}` },
        { status: 500 }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const contentType = response.headers.get('content-type') ?? 'image/jpeg'

    return NextResponse.json({
      success: true,
      image: {
        mimeType: contentType,
        data: base64,
      },
    })
  } catch (err: any) {
    const cause = err?.cause
    const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
    console.error(
      '[MnemonicFlow Image API]',
      err,
      cause ? { cause } : ''
    )

    const isNetworkError = err?.message === 'fetch failed'
    const friendlyMsg = isNetworkError
      ? `Could not reach Pollinations' servers (network error${causeMsg ? `: ${causeMsg}` : ''}). Check your internet connection, VPN/firewall, or antivirus, and make sure you don't have multiple dev servers running at once.`
      : err?.message ?? 'Image generation failed. Please try again.'

    return NextResponse.json(
      {
        success: false,
        error: friendlyMsg,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed.',
    },
    { status: 405 }
  )
}