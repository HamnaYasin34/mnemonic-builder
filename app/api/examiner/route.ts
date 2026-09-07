import { NextRequest, NextResponse } from 'next/server'
import { fetchGroqWithRetry, parseGroqJson } from '../../lib/groq-utils'

// ── Subject-specific examination focus areas ──────────────────────────────────
const SUBJECT_FOCUS: Record<string, string> = {
  anatomy: 'Focus on: anatomical structures, relations, blood supply, nerve supply, embryology, clinical anatomy correlations, surface anatomy.',
  physiology: 'Focus on: mechanisms, regulation, homeostasis, pathophysiology, physiological adaptations, clinical correlations.',
  biochemistry: 'Focus on: metabolic pathways, enzyme regulation, molecular biology, clinical biochemistry, inborn errors.',
  pharmacology: 'Focus on: drug mechanisms, pharmacokinetics, pharmacodynamics, adverse effects, contraindications, drug interactions, clinical applications.',
  pathology: 'Focus on: disease mechanisms, morphological changes, clinical pathology, histopathology, laboratory diagnosis.',
  microbiology: 'Focus on: organism identification, pathogenesis, virulence factors, laboratory diagnosis, antimicrobial therapy, infection control.',
  medicine: 'Focus on: clinical presentation, pathophysiology, diagnosis, differential diagnosis, investigations, management, complications, prognosis.',
  surgery: 'Focus on: surgical anatomy, indications, operative technique, complications, post-operative care, emergencies.',
  obgyn: 'Focus on: obstetric management, gynecological conditions, reproductive physiology, antenatal care, complications.',
  pediatrics: 'Focus on: growth and development, pediatric conditions, immunization, neonatology, congenital disorders.',
  psychiatry: 'Focus on: psychiatric assessment, diagnostic criteria, management, psychopharmacology, psychotherapy.',
  'community-medicine': 'Focus on: epidemiology, biostatistics, public health, preventive medicine, health systems.',
  forensic: 'Focus on: medico-legal aspects, toxicology, thanatology, forensic pathology.',
  dermatology: 'Focus on: skin conditions, morphology, diagnosis, treatment, dermatopathology.',
  orthopedics: 'Focus on: musculoskeletal anatomy, fractures, joint disorders, surgical management, rehabilitation.',
  ent: 'Focus on: ear, nose, throat anatomy, common conditions, surgical procedures, emergencies.',
  ophthalmology: 'Focus on: ocular anatomy, common eye diseases, clinical examination, surgical procedures.',
  radiology: 'Focus on: imaging modalities, radiological anatomy, interpretation, contrast studies.',
  anesthesia: 'Focus on: anesthetic pharmacology, airway management, monitoring, complications.',
  // BDS subjects
  'oral-biology': 'Focus on: oral tissue structure, development, salivary glands, oral mucosa.',
  'dental-anatomy': 'Focus on: tooth morphology, occlusion, dental arches, tooth identification.',
  'oral-histology': 'Focus on: dental tissue histology, enamel, dentin, pulp, periodontium.',
  'oral-pathology': 'Focus on: oral diseases, odontogenic tumors, mucosal lesions, oral cancer.',
  'dental-materials': 'Focus on: material properties, manipulation, clinical applications, biocompatibility.',
  'operative-dentistry': 'Focus on: cavity preparation, restorative materials, caries management.',
  endodontics: 'Focus on: pulp biology, root canal therapy, endodontic emergencies.',
  prosthodontics: 'Focus on: complete and partial dentures, fixed prosthodontics, implantology.',
  periodontology: 'Focus on: periodontal diseases, classification, treatment, surgical procedures.',
  orthodontics: 'Focus on: malocclusion classification, growth, treatment planning, appliances.',
  'oral-surgery': 'Focus on: extractions, impactions, maxillofacial trauma, surgical techniques.',
  'community-dentistry': 'Focus on: dental public health, epidemiology, preventive dentistry.',
  'pediatric-dentistry': 'Focus on: pediatric dental conditions, behavior management, preventive care.',
  'oral-medicine': 'Focus on: oral manifestations of systemic diseases, oral diagnosis, TMJ disorders.',
  'bds-anatomy': 'Focus on: head and neck anatomy, cranial nerves, vascular supply, clinical correlations.',
  'bds-physiology': 'Focus on: mastication, salivation, swallowing, speech physiology.',
  'bds-biochemistry': 'Focus on: mineral metabolism, collagen, dental biochemistry.',
  'bds-pathology': 'Focus on: general and systemic pathology relevant to dental practice.',
  'bds-pharmacology': 'Focus on: dental pharmacology, local anesthetics, analgesics, antibiotics.',
  'bds-microbiology': 'Focus on: oral microbiology, dental infections, sterilization.',
  'bds-radiology': 'Focus on: dental radiography, interpretation, radiation safety.',
}

function getSubjectFocus(subject: string): string {
  return SUBJECT_FOCUS[subject] ?? 'Focus on: core concepts, clinical applications, diagnosis, management, and relevant basic sciences.'
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })

  const topic = body.topic as string | undefined
  const subject = body.subject as string | undefined
  const history = (body.history ?? []) as Array<{ role: string; content: string }>
  const studentAnswer = body.studentAnswer as string | undefined
  const difficulty = (body.difficulty ?? 'Medium') as string
  const isFirstMessage = !studentAnswer && history.length === 0
  const isFinalQuestion = (body.questionNumber ?? 0) >= 9 // 0-indexed, so 9 = 10th question

  if (!topic?.trim() || !subject) {
    return NextResponse.json({ success: false, error: 'Topic and subject are required.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'API key not configured.' }, { status: 500 })
  }

  try {
    const difficultyInstructions: Record<string, string> = {
      'Easy': 'Ask fundamental questions testing basic understanding and recall.',
      'Medium': 'Ask standard MBBS/BDS viva questions testing application and understanding.',
      'Hard': 'Ask detailed questions about mechanisms, clinical correlations, and complex reasoning. Probe deeper with follow-ups.',
      'clinical-reasoning': 'Ask USMLE-style application questions: next-best-step, interpretation of findings, prioritization of management, differential diagnosis reasoning, and clinical decision-making. Present brief clinical vignettes when appropriate.',
    }

    const subjectFocus = getSubjectFocus(subject)
    const diffInstruction = difficultyInstructions[difficulty] ?? difficultyInstructions['Medium']

    const systemPrompt = `You are a senior medical/dental examiner conducting a viva voce examination. You are NOT a chatbot — you are a strict but fair examiner who adapts to the student's level.

EXAMINATION PARAMETERS:
- Topic: "${topic}"
- Subject: ${subject}
- Difficulty: ${difficulty}
${subjectFocus}

DIFFICULTY GUIDANCE:
${diffInstruction}

RULES:
1. Ask ONE question at a time about "${topic}" in the subject of ${subject}.
2. Questions should test real medical/dental knowledge: mechanism, diagnosis, clinical presentation, pathology, pharmacology, management, anatomy, physiology, differential diagnosis, clinical reasoning.
3. After the student answers, evaluate their response as "correct", "partial", or "incorrect".
4. TEACHING PERSONA: You are a good medical teacher, not just an examiner.
   - When the answer is CORRECT: Acknowledge briefly, then probe deeper or escalate. E.g., "Correct. Let's take this one step further..." or "Good. Now tell me..."
   - When the answer is PARTIAL: Specifically state what they got right and what they missed. E.g., "That's partially correct. You mentioned X, but you missed Y. Can you think of another finding?"
   - When the answer is INCORRECT: Gently correct the misconception, explain why, then ask a simpler related question to rebuild understanding.
5. Adapt difficulty: if the student answers correctly twice in a row, increase difficulty more aggressively. If they struggle, decrease difficulty.
6. Ask a follow-up question that probes deeper or moves to a related sub-topic based on their previous response.
7. Do NOT simply generate a fixed list of questions. Each question should depend on what has been discussed.
8. Be conversational but professional, like a real viva examiner who is also a good teacher.
9. Keep responses concise — max 150 words per turn.
10. Ground all content in established medical/dental knowledge (Harrison's, Robbins, Guyton, Katzung, Gray's, etc.). Do NOT fabricate citations or claim page numbers.
11. If the student gives an incomplete answer, probe rather than immediately giving the full answer.
12. Encourage clinical reasoning: ask "why" and "how" more than "what".
13. Summarize key teaching points when appropriate.
${isFinalQuestion ? '14. This is the FINAL question. After evaluating the answer, provide a comprehensive sessionReport (see JSON schema below).' : ''}

${isFirstMessage
      ? 'Start the viva by introducing yourself briefly and asking your first question.'
      : 'The student has just answered your previous question. Evaluate their answer and ask your next question.'
    }

Respond in valid JSON format only:
{
  "response": "Your spoken response to the student",
  "evaluation": "correct" | "partial" | "incorrect" | null,
  "nextDifficulty": "Easy" | "Medium" | "Hard" | "clinical-reasoning",
  "questionNumber": <number>${isFinalQuestion ? `,
  "sessionReport": {
    "overallScore": <0-100>,
    "questionsAttempted": <number>,
    "correctCount": <number>,
    "strongAreas": ["topic area 1", "topic area 2"],
    "weakAreas": ["topic area 1", "topic area 2"],
    "misconceptions": ["misconception 1"],
    "suggestedRevision": ["topic to revise 1"],
    "recommendedGuides": ["guide topic 1"],
    "recommendedQuizzes": ["quiz topic 1"]
  }` : ''}
}`

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role === 'student' ? 'user' : 'assistant',
        content: msg.content,
      })
    }

    // Add current student answer
    if (studentAnswer) {
      messages.push({ role: 'user', content: studentAnswer })
    }

    const response = await fetchGroqWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.8,
        max_tokens: isFinalQuestion ? 1200 : 800,
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
        const msg = 'The examiner is unavailable right now. Please try again.'
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
        response: parsed.response || '',
        evaluation: parsed.evaluation || null,
        nextDifficulty: parsed.nextDifficulty || difficulty,
        questionNumber: parsed.questionNumber || 1,
        sessionReport: parsed.sessionReport || null,
      },
    })
  } catch (err: any) {
    const cause = err?.cause
    const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
    console.error('[MnemonicFlow Examiner API]', err, cause ? { cause } : '')
    const isNetworkError = err?.message === 'fetch failed'
    const friendlyMsg = isNetworkError
      ? `Could not reach AI service (network error${causeMsg ? `: ${causeMsg}` : ''}). Check your internet connection.`
      : err?.message ?? 'Examiner session failed. Try again.'
    return NextResponse.json({ success: false, error: friendlyMsg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
