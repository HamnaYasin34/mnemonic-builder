import { NextRequest, NextResponse } from 'next/server'
import {
  buildFinalPrompt,
  createPrimaryProvider,
  createFallbackProvider,
  PollinationsProvider,
  type ImageGenerationProvider,
  DEFAULT_ASPECT_RATIO,
} from '../../lib/image-provider'

export async function POST(req: NextRequest) {
  let body: any

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const { visualScene, topic, visualStyle } = body

  if (!visualScene?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Visual scene is required.' },
      { status: 400 },
    )
  }

  // Build the final prompt: compiled narrative prompt + model-specific
  // execution requirements + style-specific instructions (Clinical Ink or
  // NeuroCanvas). The narrative prompt already carries the §14 structure
  // (NARRATIVE CONTEXT → SETTING → CHARACTER → BEATS → OBJECTS → ACTIONS →
  // SPATIAL → MEDICAL → STYLE); this appends the rendering requirements.
  const finalPrompt = buildFinalPrompt(visualScene, visualStyle ?? 'sketchy')

  // ── Retry chain ────────────────────────────────────────────────────────────
  // 1. Primary: Cloudflare Workers AI → Pollinations (first configured)
  // 2. On transient failure: retry once with same provider
  // 3. Pollinations flux-dev (better instruction following)
  // 4. Pollinations flux-realism (always available, free, no auth)
  const primary = createPrimaryProvider()
  const fallback = createFallbackProvider()

  // Log provider chain for debugging (visible in dev server console)
  console.log(`[MnemonicFlow Image] Provider chain: primary=${primary.providerName}, fallback=${fallback.providerName}`)

  const providers: ImageGenerationProvider[] = [primary]
  // When primary is non-Pollinations (Cloudflare), add both Pollinations tiers:
  //   flux-dev (better instruction following) → flux-realism (maximum compatibility)
  if (!primary.providerName.startsWith('pollinations:')) {
    const pollDev = new PollinationsProvider('flux-dev')
    providers.push(pollDev)
  }
  // Always add flux-realism as last resort (if not already in the chain)
  if (!providers.some(p => p.providerName === fallback.providerName)) {
    providers.push(fallback)
  }

  let lastError: any

  for (const provider of providers) {
    // Two attempts per provider (handles transient network/model errors)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await provider.generateImage({
          prompt: finalPrompt,
          aspectRatio: DEFAULT_ASPECT_RATIO,
        })

        // Dev-mode model label (not exposed to normal users — see UI section)
        const modelLabel = process.env.NODE_ENV === 'development'
          ? provider.providerName
          : undefined

        return NextResponse.json({
          success: true,
          image: {
            mimeType: result.mimeType,
            data: result.imageData,
          },
          modelLabel,
        })
      } catch (err: any) {
        lastError = err
        const cause = err?.cause
        const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
        console.error(
          `[MnemonicFlow Image] ${provider.providerName} attempt ${attempt + 1} failed`,
          err?.message ?? err,
          cause ? { cause: causeMsg ?? cause } : '',
        )
        // Wait briefly before retry (avoid hammering a failing endpoint)
        if (attempt === 0) await new Promise(r => setTimeout(r, 500))
      }
    }
  }

  // All providers exhausted — return a friendly error
  const cause = lastError?.cause
  const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
  const isNetworkError = lastError?.message === 'fetch failed'
  const friendlyMsg = isNetworkError
    ? `Could not reach the image service (network error${causeMsg ? `: ${causeMsg}` : ''}). Check your internet connection and try again.`
    : 'Image generation failed. Please try again.'

  return NextResponse.json(
    { success: false, error: friendlyMsg },
    { status: 500 },
  )
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed.' },
    { status: 405 },
  )
}
