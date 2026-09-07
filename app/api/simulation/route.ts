import { NextRequest, NextResponse } from 'next/server'
import { fetchGroqWithRetry, parseGroqJson } from '../../lib/groq-utils'

const PATIENT_NAMES = [
  'Mr. Ahmed Khan', 'Mrs. Fatima Siddiqui', 'Mr. Hassan Ali',
  'Mrs. Ayesha Malik', 'Mr. Omar Sheikh', 'Mrs. Zara Hussain',
  'Mr. Bilal Raza', 'Mrs. Sana Iqbal',
]

const PATIENT_PERSONALITIES = [
  'anxious but cooperative',
  'calm and matter-of-fact',
  'slightly worried and talkative',
  'quiet and reserved',
  'frustrated about being unwell',
]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })

  const topic = body.topic as string | undefined
  const subject = body.subject as string | undefined
  const history = (body.history ?? []) as Array<{ role: string; content: string }>
  const studentMessage = body.studentMessage as string | undefined
  const difficulty = (body.difficulty ?? 'Medium') as string
  const patientName = (body.patientName ?? PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)]) as string
  const patientPersonality = (body.patientPersonality ?? PATIENT_PERSONALITIES[Math.floor(Math.random() * PATIENT_PERSONALITIES.length)]) as string
  const isFirstMessage = !studentMessage && history.length === 0
  const requestDebrief = body.requestDebrief === true

  if (!topic?.trim() || !subject) {
    return NextResponse.json({ success: false, error: 'Topic and subject are required.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'API key not configured.' }, { status: 500 })
  }

  try {
    const difficultyInstructions: Record<string, string> = {
      'Easy': 'Create a classic textbook presentation with obvious clinical clues. The diagnosis should be relatively straightforward once key history is obtained.',
      'Medium': 'Include some nonspecific findings that require moderate clinical reasoning. The student must differentiate between plausible diagnoses.',
      'Hard': 'Create an atypical presentation with subtle clues, comorbidities, or red herrings. The student must demonstrate strong clinical reasoning.',
      'clinical-reasoning': 'Focus on next-best-step decision-making, investigation selection and interpretation, differential prioritization, and management planning. Present a scenario that tests clinical judgment.',
    }

    const diffInstruction = difficultyInstructions[difficulty] ?? difficultyInstructions['Medium']

    const systemPrompt = `You are a medical/dental patient named "${patientName}" in a clinical simulation. The student is a medical/dental student acting as the clinician. The clinical scenario is about "${topic}" in the subject of ${subject}.

PATIENT PERSONALITY: You are ${patientPersonality}. This personality should add realism but must NEVER block or distort important medical information.

DIFFICULTY: ${difficulty}
${diffInstruction}

CRITICAL RULES:
1. You are a PATIENT, not a doctor. You do NOT diagnose yourself. You do NOT use medical jargon unless the clinician specifically asks you to explain in medical terms.
2. Speak naturally like a real patient — use everyday language, express concerns, and sometimes be vague about symptoms.
3. Reveal your history PROGRESSIVELY. Do not dump all information at once. The clinician must ask the right questions.
4. Respond to examination requests with realistic findings (e.g., "When you press on my stomach, it hurts right here on the right side").
5. Respond to investigation requests by describing what the results would show (e.g., "The blood test showed my sugar was very high").
6. Show realistic patient emotions — worry, confusion, relief when appropriate.
7. Keep responses concise — max 100 words per turn.
8. Ground the clinical scenario in established medical/dental knowledge (Harrison's, Robbins, Guyton, etc.). Do NOT fabricate impossible findings.
9. The case should be internally consistent — all symptoms, signs, and investigations should point toward the same diagnosis.
10. Do not make the case identical every time. Vary age, sex, severity, and specific findings while keeping the core pathology plausible.

${isFirstMessage
      ? `Start the encounter by introducing yourself briefly and presenting your chief complaint. Be natural — like walking into a clinic.
      
Internally construct a complete hidden case (demographics, HPI, past history, medications, allergies, family history, social history, risk factors, examination findings, investigation results, differential diagnoses, most likely diagnosis, management). Reveal information ONLY when appropriate questions are asked.`
      : requestDebrief
        ? `The clinician is wrapping up the encounter. Provide a comprehensive caseDebrief with ALL the information about the hidden case, what the student did well, what they missed, and a performance score.`
        : 'Respond to what the clinician just said or asked. Stay in character as the patient.'
    }

Respond in valid JSON format only:
{
  "patientResponse": "Your response as the patient (in character)",
  "feedback": null | "If the encounter is wrapping up AND no debrief is requested yet, provide brief teaching feedback. Otherwise null.",
  "encounterComplete": false | true${requestDebrief ? `,
  "caseDebrief": {
    "caseSummary": "Complete case summary including demographics, HPI, past history, etc.",
    "mostLikelyDiagnosis": "The diagnosis",
    "keyClues": ["clinical clue 1", "clue 2"],
    "differentials": ["differential 1", "differential 2", "differential 3"],
    "missedHistory": ["important history question the student did not ask"],
    "missedExamFindings": ["examination the student should have requested"],
    "missedInvestigations": ["investigation the student should have ordered"],
    "correctInterpretation": "How findings should be interpreted",
    "initialManagement": "Appropriate initial management plan",
    "redFlags": ["red flag 1"],
    "performanceScore": <0-100>,
    "recommendedRevision": ["topic to revise 1"]
  }` : ''}
}`

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    for (const msg of history) {
      messages.push({
        role: msg.role === 'clinician' ? 'user' : 'assistant',
        content: msg.content,
      })
    }

    if (studentMessage) {
      messages.push({ role: 'user', content: studentMessage })
    }

    const response = await fetchGroqWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.9,
        max_tokens: requestDebrief ? 1500 : 600,
        response_format: { type: 'json_object' },
        messages,
      }),
    })

    const data = await response.json()

    let raw: string
    let finishReason: string | undefined

    if (!response.ok) {
      const failedGeneration = data?.error?.failed_generation
      if (typeof failedGeneration === 'string' && failedGeneration.trim()) {
        raw = failedGeneration
      } else {
        const msg = 'The simulation service is unavailable right now. Please try again.'
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
    } else {
      raw = data?.choices?.[0]?.message?.content ?? ''
      finishReason = data?.choices?.[0]?.finish_reason
    }

    const parsed = parseGroqJson(raw, finishReason)

    return NextResponse.json({
      success: true,
      data: {
        patientResponse: parsed.patientResponse || '',
        feedback: parsed.feedback || null,
        encounterComplete: parsed.encounterComplete === true,
        patientName,
        caseDebrief: parsed.caseDebrief || null,
      },
    })
  } catch (err: any) {
    const cause = err?.cause
    const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
    console.error('[MnemonicFlow Simulation API]', err, cause ? { cause } : '')
    const isNetworkError = err?.message === 'fetch failed'
    const friendlyMsg = isNetworkError
      ? `Could not reach AI service (network error${causeMsg ? `: ${causeMsg}` : ''}). Check your internet connection.`
      : err?.message ?? 'Simulation failed. Try again.'
    return NextResponse.json({ success: false, error: friendlyMsg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
