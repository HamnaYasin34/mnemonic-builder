import { NextRequest, NextResponse } from 'next/server'

function buildPrompt(topic: string, subject: string): string {
  return `You are a world-class medical memory architect for MBBS students. Your only goal: make this concept IMPOSSIBLE to forget. Generic explanations are a failure condition — every output must be vivid, high-yield, and emotionally sticky.

Topic: "${topic}"
Subject: ${subject}

STRICT RULES:

1. EXPLANATION: Exactly 3-4 sentences, max 6 lines. 70% precise medical jargon (mechanism, pathway, receptor-level detail) + 30% a vivid real-world analogy that makes the mechanism click instantly. High-yield only — the one fact that decides exam marks.

2. THE MNEMONIC: One single hilarious, absurd, or shocking sentence. This is the Hook — it should make a tired student laugh AND remember. First letter of each word = a key medical fact, in order. Write in ALL CAPS.

3. THE STORYLINE:
- EXACTLY 4 LINES in one cohesive paragraph
- MAX 1-2 CHARACTERS only, with a vivid, specific personality (not generic)
- NO alphabet/letter explanations ever
- STYLE: rotate between Surreal / Noir / Toxic-Romance / Heist / Cringe-Drama — pick whichever best fits the mechanism
- Characters must literally and physically act out the medical mechanism step by step
- Clean content, but punchy and emotionally vivid — not flat or safe

4. VISUAL SCENE: A vivid, cinematic Pixar-3D scene description of the exact storyline above — same characters, same action, warm dramatic lighting, medical setting, ultra realistic detail. This will be fed directly to an image generator, so be specific about pose, expression, and props.

5. QUICK QUIZ: One short, punchy self-test question that can be answered in one phrase, directly testing the highest-yield fact from the explanation — and its one-line answer.

Return ONLY this exact JSON, no markdown, no extra text:
{
  "explanation": "3-4 sentences, max 6 lines, 70% medical jargon 30% vivid analogy, high-yield only",
  "mnemonic": "THE MNEMONIC SENTENCE IN ALL CAPS",
  "mnemonicKey": "Word = medical fact. One line per word.",
  "story": "EXACTLY 4 lines. 1-2 vivid characters. Characters physically act out the medical mechanism step by step. No letter explanations.",
  "visualScene": "Cinematic Pixar 3D scene of the exact storyline above — same characters and action, specific pose/expression/props, warm dramatic lighting, medical setting.",
  "ankiFront": "High-yield clinical exam question",
  "ankiBack": "Answer + clinical mechanism + mnemonic sentence as final takeaway",
  "quizQuestion": "One short punchy self-test question",
  "quizAnswer": "One-line answer",
  "tags": ["${subject}", "MBBS"]
}`
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { topic, subject } = body
  if (!topic?.trim() || !subject) {
    return NextResponse.json({ success: false, error: 'Topic and subject are required.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'No Groq API key found in .env.local' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.93,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a world-class medical memory architect for MBBS students. Generic output is a failure condition. Rules you never break:
- Explanation: exactly 3-4 sentences, 70% precise medical jargon 30% vivid real-world analogy, high-yield only
- Mnemonic: one hilarious/absurd/shocking sentence in ALL CAPS, every first letter = a medical fact in order
- Story: EXACTLY 4 lines, max 1-2 vivid specific characters, rotate style (Surreal/Noir/Toxic-Romance/Heist/Cringe-Drama), characters physically act out the mechanism step by step, NEVER explain individual letters, clean but emotionally vivid
- Visual: cinematic Pixar 3D scene of the EXACT storyline — same characters/action, specific pose/expression/props, warm dramatic lighting
- Quiz: one short punchy self-test question + one-line answer testing the highest-yield fact
Output ONLY valid JSON, nothing else.`,
          },
          { role: 'user', content: buildPrompt(topic.trim(), subject) },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const msg = data?.error?.message ?? `Groq API error: ${response.status}`
      return NextResponse.json({ success: false, error: msg }, { status: 500 })
    }

    const raw = data?.choices?.[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed.tags)) parsed.tags = [subject]

    return NextResponse.json({ success: true, data: parsed })
  } catch (err: any) {
    console.error('[MnemonicFlow API]', err)
    return NextResponse.json({ success: false, error: err?.message ?? 'Generation failed. Try again.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}