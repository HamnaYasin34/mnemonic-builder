// ─────────────────────────────────────────────────────────────────────────────
// app/api/quiz/route.ts
// Generates proper medical MCQs via Groq — tests clinical knowledge,
// NOT knowledge of the mnemonic itself.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { fetchGroqWithRetry, parseGroqJson } from '../../lib/groq-utils'

function buildQuizPrompt(topic: string, subject: string, count: number): string {
  return `You are a medical board exam question writer creating ${count} high-quality MCQs for healthcare students (MBBS/BDS). Questions must test ACTUAL MEDICAL KNOWLEDGE — clinical reasoning, diagnosis, management, mechanism, pharmacology, pathology — NEVER knowledge of a mnemonic or memory technique. Content should be aligned with established medical knowledge from standard references (Harrison's, Robbins, Guyton, KD Tripathi).

Topic: "${topic}"
Subject: ${subject}

Create exactly ${count} MCQs covering different aspects of this topic. Each question should resemble USMLE Step 1 / Step 2-style clinical reasoning where appropriate, with clinical vignettes that test diagnostic and management skills.

QUESTION CATEGORIES to cover (distribute across the ${count} questions):
- Clinical presentation / diagnosis
- Pathophysiology / mechanism
- Management / pharmacology
- Complications / prognosis
- Clinical reasoning / next best step
- Differential diagnosis
- Important associations

STRICT RULES FOR EACH MCQ:
1. STEM: A clear, specific question. Use clinical vignettes where appropriate (age, gender, presenting complaint, key findings).
2. OPTIONS: Exactly 4 options (A-D). All must be PLAUSIBLE — no throwaway options. The correct answer must NOT be obviously longer or different from distractors.
3. CORRECT INDEX: The 0-based index of the correct option. VARY the position — do NOT always put the answer at index 0.
4. EXPLANATION: Why the correct answer is correct. 2-3 sentences with mechanism/reasoning.
5. WRONG EXPLANATIONS: For EACH of the 3 wrong options (in order, skipping the correct one), explain WHY that option is wrong. 1-2 sentences each.
6. HIGH-YIELD TAKEAWAY: One sentence capturing the most important exam-relevant fact tested by this question.
7. DIFFICULTY: Assign 'Easy', 'Medium', or 'Hard' based on the reasoning depth required.
8. CATEGORY: One word describing what's tested: 'diagnosis', 'mechanism', 'management', 'complication', 'association', 'pharmacology', or 'reasoning'.

MEDICAL ACCURACY: Never invent a drug, test, or clinical finding. If uncertain, omit rather than guess.

Return ONLY this exact JSON, no markdown, no extra text:
{
  "questions": [
    {
      "stem": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2,
      "explanation": "Why correct...",
      "wrongExplanations": ["Why option 0 is wrong", "Why option 1 is wrong", "Why option 3 is wrong"],
      "highYieldTakeaway": "Key fact...",
      "difficulty": "Medium",
      "category": "diagnosis"
    }
  ]
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
  const count = Math.min(Math.max(Number(body.count) || 5, 3), 15)

  if (!topic?.trim() || !subject) {
    return NextResponse.json({ success: false, error: 'Topic and subject are required.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 })
  }

  const maxTokens = Math.max(3500, count * 450)

  // Attempt generation up to 2 times — auto-retry on JSON parse failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchGroqWithRetry('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          temperature: 0.75,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a medical board exam question writer. Create questions that test actual medical knowledge — clinical reasoning, diagnosis, management, mechanism, aligned with established medical knowledge from standard textbooks. NEVER test knowledge of mnemonics or memory techniques. All options must be plausible. Vary correct answer positions. Output only valid JSON.',
            },
            { role: 'user', content: buildQuizPrompt(topic.trim(), subject, count) },
          ],
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
          if (attempt === 0) { console.warn('[MnemonicFlow Quiz API] First attempt failed, retrying...'); continue }
          return NextResponse.json({ success: false, error: 'We could not generate your quiz right now. Please try again.' }, { status: 500 })
        }
      } else {
        raw = data?.choices?.[0]?.message?.content ?? ''
        finishReason = data?.choices?.[0]?.finish_reason
      }

      const parsed = parseGroqJson(raw, finishReason)

      if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
        if (attempt === 0) { console.warn('[MnemonicFlow Quiz API] No questions returned, retrying...'); continue }
        return NextResponse.json(
          { success: false, error: 'We could not generate this quiz. Please try a different topic.' },
          { status: 500 }
        )
      }

      const validQuestions = parsed.questions
        .filter((q: any) => {
          return typeof q.stem === 'string' && q.stem.length > 10
            && Array.isArray(q.options) && q.options.length === 4
            && typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
        })
        .map((q: any) => ({
          stem: q.stem.trim(),
          options: q.options.map((o: any) => String(o).trim()),
          correctIndex: q.correctIndex,
          explanation: typeof q.explanation === 'string' ? q.explanation : 'See explanation in study guide.',
          wrongExplanations: Array.isArray(q.wrongExplanations)
            ? q.wrongExplanations.map((e: any) => String(e))
            : [],
          highYieldTakeaway: typeof q.highYieldTakeaway === 'string' ? q.highYieldTakeaway : '',
          difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
          category: typeof q.category === 'string' ? q.category : 'general',
        }))

      if (validQuestions.length === 0) {
        if (attempt === 0) { console.warn('[MnemonicFlow Quiz API] No valid questions, retrying...'); continue }
        return NextResponse.json(
          { success: false, error: 'We could not generate valid questions for this topic. Please try a different one.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data: { questions: validQuestions } })
    } catch (err: any) {
      const cause = err?.cause
      const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
      console.error(`[MnemonicFlow Quiz API] Attempt ${attempt + 1}`, err, cause ? { cause } : '')

      if (attempt === 0) continue

      const isNetworkError = err?.message === 'fetch failed'
      const friendlyMsg = isNetworkError
        ? `Could not reach the server${causeMsg ? `: ${causeMsg}` : ''}. Check your connection.`
        : 'We could not generate this quiz right now. Please try again.'

      return NextResponse.json({ success: false, error: friendlyMsg }, { status: 500 })
    }
  }

  // Fallback if loop somehow exits without returning
  return NextResponse.json({ success: false, error: 'We could not generate this quiz right now. Please try again.' }, { status: 500 })
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
