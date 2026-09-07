// ─────────────────────────────────────────────────────────────────────────────
// app/api/guide/route.ts
// Generates a high-yield medical study guide for any topic via Groq.
// No image generation — text only, credit-efficient.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { fetchGroqWithRetry, parseGroqJson } from '../../lib/groq-utils'

const TEXTBOOK_REFS: Record<string, string> = {
  medicine: "Davidson's, Harrison's, Kumar & Clark, Oxford Handbook of Clinical Medicine",
  surgery: "Bailey & Love, Schwartz's, Sabiston",
  pathology: "Robbins & Cotran, Robbins Basic Pathology",
  pharmacology: "Katzung, Goodman & Gilman, Rang & Dale",
  physiology: "Guyton & Hall, Ganong, Costanzo",
  anatomy: "Gray's Anatomy for Students, Moore's Clinically Oriented Anatomy, Snell's Clinical Anatomy",
  biochemistry: "Harper's, Lippincott Biochemistry, Devlin",
  microbiology: "Jawetz, Murray Medical Microbiology, Levinson",
  immunology: "Abbas Cellular & Molecular Immunology, Janeway's Immunobiology",
  pediatrics: "Nelson Textbook of Pediatrics",
  obstetrics: "Williams Obstetrics, Williams Gynecology",
  gynaecology: "Williams Gynecology, Williams Obstetrics",
  community: "Park's Textbook of Preventive and Social Medicine, WHO guidance",
  forensic: "Reddy's Medical Jurisprudence, Parikh's Forensic Medicine",
  embryology: "Langman's Medical Embryology, Moore's The Developing Human",
  histology: "Junqueira's Basic Histology, Ross & Pawlina",
  genetics: "Thompson & Thompson Genetics in Medicine",
  psychiatry: "Kaplan & Sadock, DSM-5",
  dermatology: "Fitzpatrick's Dermatology, Rook's Textbook",
  orthopedics: "Apley's System of Orthopaedics, Campbell's Operative Orthopaedics",
  ent: "Dhingra ENT, Logan Turner's Diseases of the Nose, Throat and Ear",
  ophthalmology: "Kanski's Clinical Ophthalmology, Parsons' Diseases of the Eye",
  radiology: "Grainger & Allison's Diagnostic Radiology, Sutton's Textbook",
  anesthesia: "Morgan & Mikhail's Clinical Anesthesiology, Miller's Anesthesia",
  oralpathology: "Shafer's, Neville's Oral and Maxillofacial Pathology",
  oralbiology: "Ten Cate's Oral Histology",
  dentalanatomy: "Wheeler's Dental Anatomy, Physiology and Occlusion",
  oralhistology: "Ten Cate's Oral Histology, Orban's Oral Histology",
  periodontology: "Carranza's Clinical Periodontology, Newman & Carranza",
  endodontics: "Grossman's Endodontic Practice, Ingle's Endodontics, Cohen's Pathways of the Pulp",
  prosthodontics: "Shillingburg, McCracken's Removable Partial Prosthodontics, Zarb/Boucher",
  orthodontics: "Proffit's Contemporary Orthodontics",
  operativedentistry: "Sturdevant's Art and Science of Operative Dentistry",
  dentalmaterials: "Phillips' Science of Dental Materials, Craig's Restorative Dental Materials",
  oralsurgery: "Peterson's Contemporary Oral and Maxillofacial Surgery",
  communitydentistry: "Soben Peter's Essentials of Public Health Dentistry",
  pediatricdentistry: "Pinkham's Pediatric Dentistry, McDonald & Avery",
  oralmedicine: "Burket's Oral Medicine",
  dentistry: "recognized BDS-specific standard textbooks",
}

function getRef(subject: string): string {
  const key = subject.toLowerCase().replace(/[^a-z]/g, '')
  for (const [k, v] of Object.entries(TEXTBOOK_REFS)) {
    if (key.includes(k)) return v
  }
  return "standard medical textbooks appropriate to the subject"
}

// ── Topic-type classification for subject-specific note architecture ───────

const TOPIC_TYPE_MAP: Record<string, string> = {
  anatomy: 'anatomy', physiology: 'physiology', biochemistry: 'biochemistry',
  embryology: 'embryology', histology: 'histology',
  pharmacology: 'pharmacology', pathology: 'pathology', microbiology: 'microbiology',
  immunology: 'immunology', medicine: 'clinical', surgery: 'clinical',
  obgyn: 'clinical', pediatrics: 'clinical', psychiatry: 'clinical',
  dermatology: 'clinical', orthopedics: 'clinical', ent: 'clinical',
  ophthalmology: 'clinical', forensic: 'forensic',
  'community-medicine': 'community', radiology: 'radiology', anesthesia: 'pharmacology',
  'oral-pathology': 'oralpath', 'oral-biology': 'oralbio',
  'dental-anatomy': 'dentalanat', 'oral-histology': 'oralhist',
  periodontology: 'perio', endodontics: 'endo', prosthodontics: 'prosth',
  orthodontics: 'ortho', 'operative-dentistry': 'operative',
  'dental-materials': 'dentalmat', 'oral-surgery': 'oralsurg',
  'community-dentistry': 'community', 'pediatric-dentistry': 'pedodent',
  'oral-medicine': 'clinical',
}

const BDS_IDS = new Set([
  'oral-biology', 'dental-anatomy', 'oral-histology', 'oral-pathology',
  'dental-materials', 'operative-dentistry', 'endodontics', 'prosthodontics',
  'periodontology', 'orthodontics', 'oral-surgery', 'community-dentistry',
  'pediatric-dentistry', 'oral-medicine',
])

function getTopicType(subject: string): string {
  const id = subject.toLowerCase().trim()
  if (TOPIC_TYPE_MAP[id]) return TOPIC_TYPE_MAP[id]
  const key = id.replace(/[^a-z]/g, '')
  for (const [k, v] of Object.entries(TOPIC_TYPE_MAP)) {
    const ck = k.replace(/[^a-z]/g, '')
    if (key.includes(ck)) return v
  }
  if (BDS_IDS.has(id)) return 'dental'
  return 'clinical'
}

function buildGuidePrompt(topic: string, subject: string): string {
  const refs = getRef(subject)
  return `You are the medical-content engine for MnemonicFlow, an educational platform for MBBS and BDS students. You are generating a High-Yield Medical Note.

Topic: "${topic}"
Subject: ${subject}
Reference standard: ${refs}
Topic architecture: ${getTopicType(subject)}

CRITICAL: Match the note architecture to the discipline and topic type. Do NOT force a clinical disease template onto anatomy, embryology, physiology, biochemistry, pharmacology, dental materials, or other non-clinical subjects. Each discipline has its own appropriate structure. Never add irrelevant sections merely to fill a template. Same quality standard, discipline-specific structure — the architecture adapts to the discipline, never the reverse.

## GOLDEN RULE
Never sacrifice medical accuracy for completeness. When choosing between more information vs more reliable information, ALWAYS choose more reliable information. When uncertain, DO NOT GUESS — use qualified wording or omit the claim.

Final priority order when these conflict: Accuracy > Current clinical practice > Exam relevance > Clinical reasoning > Conciseness > Completeness.

The final note should read like: "A senior medical educator condensed the relevant material from standard textbooks into an exam-focused revision sheet." NOT: "An AI summarized everything it could find about this disease."

## CRITICAL VALIDATION
Before outputting, do NOT simply reproduce textbook statements. Cross-check content against standard textbook knowledge AND current evidence-based clinical practice. Standard textbooks are the primary educational reference for foundational knowledge, but current clinical guidelines take precedence for diagnosis and management when textbook teaching is outdated or simplified.

Specifically check for: outdated mnemonics, outdated treatment algorithms, oversimplified diagnostic criteria, rigid numerical thresholds, incorrect "gold standard" claims, universal treatment recommendations, absolute statements, outdated terminology, disease-specific facts incorrectly generalized to a syndrome, weak or irrelevant associations, misleading differential-diagnosis clues. Never output a statement simply because it is a classic textbook phrase.

Optimize for maximum exam value per line, NOT maximum information.

## SOURCE STANDARD
Base content on recognized standard medical textbooks (for this subject: ${refs}). Use them as the KNOWLEDGE AND ACCURACY STANDARD — do not copy textbook paragraphs or reproduce textbook prose. The output must be: textbook-accurate + clinically relevant + concise + exam-focused.

## CONTENT STANDARD
Every statement must satisfy at least one of: frequently tested in exams, important for clinical reasoning, classic diagnostic discriminator, key investigation finding, core management principle, classic complication, recognized association, common exam trap, or high-yield pathophysiology concept. Remove low-yield textbook trivia.

## MEDICAL ACCURACY — HIGHEST PRIORITY
Every medical statement must be factually accurate. Never invent: statistics, percentages, prevalence, risk ratios, sensitivity/specificity, drug doses, treatment durations, diagnostic cutoffs, disease frequencies, epidemiological figures, associations, guideline recommendations, named criteria, or scoring systems. If uncertain about a specific fact, do not guess — either omit it or use appropriately qualified wording. Never manufacture citations or references.

## DO NOT OVERGENERALIZE
Always distinguish between: Disease → subtype → specific manifestation/treatment. If a fact applies only to one subtype, do not present it as a fact about the entire disease.

BAD: "Steroids are first-line treatment for nephrotic syndrome."
GOOD: "Glucocorticoids are first-line therapy for steroid-sensitive minimal change disease; treatment of nephrotic syndrome depends on the underlying cause."

## AVOID ABSOLUTE LANGUAGE
Do NOT use: always, never, all, none, universally, invariably, pathognomonic — unless genuinely justified. Prefer: typically, commonly, usually, may, can, associated with, suggests, characteristic of.

Example — BAD: "Vomiting always follows pain in appendicitis."
Example — GOOD: "Vomiting typically follows the onset of abdominal pain in appendicitis."

## NUMBERS REQUIRE EXTRA SCRUTINY
Be especially careful with: percentages, laboratory values, diagnostic thresholds, scoring systems, risk ratios, time intervals, doses, treatment durations. Do not include a precise number merely because it appears in a generated answer. If a number varies by guideline, population, age group, or clinical context, state the context or omit the number. Never fabricate precision.

Example — BAD: "Perforation occurs exactly after 36 hours."
Example — GOOD: "The risk of perforation increases with prolonged untreated inflammation."

## CONTEXT-DEPENDENT MANAGEMENT
Do not present one drug, dose, operation, or treatment as universally applicable. Where treatment depends on severity, subtype, complications, age, pregnancy, comorbidities, treatment response, or local guidelines, make that clear. Distinguish: uncomplicated vs complicated, adult vs pediatric, stable vs unstable, first presentation vs recurrence. For antibiotics, prefer "broad-spectrum coverage according to local antimicrobial guidelines" over presenting one regimen as universally correct.

## CURRENT PRACTICE
Follow modern evidence-based clinical practice. Do not present outdated textbook management as universally applicable. Avoid outdated teaching unless specifically labelled as historical/classical.

## LEGACY TEXTBOOK & OUTDATED TEACHING FILTER
Standard textbooks contain both enduring foundational knowledge and older teaching frameworks. Distinguish between: (1) foundational textbook knowledge that remains clinically valid, (2) historical/classic examination associations, (3) older management frameworks superseded by modern guidelines. Do NOT automatically reproduce older mnemonics, algorithms, or management frameworks merely because they appear in textbooks (e.g. outdated treatment mnemonics such as "MONA" for acute MI). When a classic exam mnemonic or older recommendation is still commonly taught but no longer current practice, explicitly distinguish: "Classic exam teaching: ..." vs "Current practice: ..." If a traditional mnemonic remains useful for exams but is incomplete clinically, label it as a "classic exam mnemonic" rather than presenting it as current management.

## MANAGEMENT HIERARCHY
For acute clinical conditions — especially myocardial infarction, stroke, sepsis, pulmonary embolism, acute coronary syndrome, and similar emergencies — current guideline-based clinical practice MUST take priority over historical textbook algorithms. Do not present old mnemonics such as "MONA" as complete modern treatment algorithms. Hierarchy: Current guideline-based management > standard textbook management > historical exam mnemonic. If a classic textbook mnemonic conflicts with current clinical practice, use the current approach. If the mnemonic remains useful for exams, clearly label it as a "classic exam association", not as the treatment protocol.

Never present Disease → one treatment when treatment depends on subtype, severity, timing, contraindications, complications, or patient characteristics. State the general management principle and identify important context.

## DIAGNOSTIC CRITERIA
When diagnostic criteria depend on age, sex, lead/location, assay, clinical context, guideline, pretest probability, or disease subtype, do not simplify them into a universal rule. If exact criteria are necessary, use the appropriate contemporary criteria.

## TOPIC RELEVANCE FILTER
Every Exam Pearl, USMLE High-Yield fact, Exam Trap, and Association must be DIRECTLY relevant to the topic being presented. Do not insert a fact merely because it is medically related. Example: Prinzmetal angina is related to coronary vasospasm, but if the topic is Myocardial Infarction, only include it if it directly helps understand MI or an important differential. Prefer topic-specific high-yield information over loosely related facts.

## MODERN DIAGNOSTIC TERMINOLOGY
When modern clinical definitions differ from older textbook definitions, prioritize contemporary terminology while preserving classic exam concepts where useful. Do not simplify a modern diagnostic definition into an outdated one merely because it is easier to memorize.

CRITICAL: When a diagnostic criterion or classification has been updated by modern guidelines, do NOT hedge with "may be" or "can be" — instead explicitly note the guideline change. For example in acute MI: do not diagnose STEMI solely from generic ST elevation, do not describe new LBBB alone as a STEMI equivalent (current guidelines require additional assessment such as Sgarbossa criteria or haemodynamic instability), interpret troponin in the context of clinical evidence of ischaemia, distinguish myocardial injury from myocardial infarction, use contemporary ECG criteria with exact thresholds.

## "GOLD STANDARD" RULE
Use the term "gold standard" ONLY when it is genuinely established for that specific clinical question. Otherwise use: preferred initial test, most accurate test, confirmatory test, reference standard, or definitive test — as appropriate.

## SCORING SYSTEMS
If mentioning a scoring system (Alvarado, CURB-65, Wells, CHA₂DS₂-VASc, GCS, MELD, Child-Pugh, etc.), ensure: the name is correct, the components are correct, the purpose is correctly described, and the interpretation is not oversimplified. Do not reproduce incomplete or outdated scoring criteria.

## DIFFERENTIAL DIAGNOSIS QUALITY
Provide 3-6 high-value differentials. Each MUST have a USEFUL DISCRIMINATING feature, not merely an associated finding. Format: "Disease — distinguishing clue". Do NOT simply list diseases. This should help the student reason through a clinical vignette.

BAD: "Pulmonary embolism — D-dimer elevated." (This is merely an associated finding, not discriminating.)
GOOD: "Pulmonary embolism — pleuritic chest pain/dyspnea with compatible risk factors; evaluate according to clinical pretest probability."

Example: Appendicitis → migratory periumbilical pain to RIF. Renal colic → colicky flank pain radiating to groin ± haematuria. Ectopic pregnancy → positive pregnancy test + pelvic/adnexal findings.

## SPECIAL POPULATIONS
Include special considerations (children, pregnancy, elderly, immunocompromised, renal/hepatic impairment) ONLY when clinically relevant to this topic. Do not force them into every note.

## CONTENT DENSITY
Prioritize: Must Know → Should Know → Nice to Know. Only include Must Know + high-value Should Know content. A shorter note containing highly reliable facts is better than a long note containing facts of mixed quality. Be concise.

## AVOID REPETITION
Do not repeat the same fact across multiple sections (Core Concept, Pathophysiology, Exam Pearls, USMLE High-Yield, Exam Traps, Associations). Each section should add something different.

## SUBJECT-SPECIFIC ARCHITECTURE
The 12-field schema below is the DEFAULT for clinical disciplines (medicine, surgery, OBGYN, pediatrics, psychiatry, dermatology, ENT, ophthalmology, oral-medicine). For NON-CLINICAL subjects, generate discipline-appropriate sections instead:

ANATOMY — structure-first, NEVER disease-first. Architecture: Overview/Definition, Location & Extent, Parts/Subdivisions, Boundaries, Relations, Contents, Attachments/Origins/Insertions, Blood Supply, Nerve Supply, Lymphatic Drainage, Anatomical Spaces/Pathways, Applied Anatomy/Clinical Correlations. Include only sections genuinely relevant — never force all. NEVER generate Pathophysiology, Clinical Features, Investigations, Management, Complications, or a generic Differential Diagnosis for a normal structure; clinical comparisons (e.g. direct vs indirect inguinal hernia) belong under Applied Anatomy as anatomical comparisons, not disease differentials. Example: Brachial Plexus → Roots → Trunks → Divisions → Cords → Branches, relations, terminal branches, motor/sensory supply, clinically tested lesions.
ANATOMY PRECISION: (1) Distinguish structures WITHIN a named structure (e.g. spermatic cord) vs structures PASSING THROUGH a canal vs structures forming WALLS — never conflate (e.g. ilioinguinal nerve passes through the canal but is not part of the spermatic cord). (2) Lymphatic drainage follows embryological origin (testes → para-aortic nodes; scrotal skin → superficial inguinal nodes) — never one pathway for a whole region. (3) Include blood supply only when educationally relevant — never invent vascular sections. (4) Applied anatomy must explain clinical findings: indirect hernia → lateral to inferior epigastric vessels → through deep ring; direct hernia → medial → through Hesselbach triangle.
ANATOMY RELATIONSHIP VALIDATION (perform silently for every anatomy topic before outputting): (a) Boundary/wall structures must not appear under Contents. (b) Every nerve, vessel, muscle, fascia, and ligament must be assigned to its correct anatomical relationship — do not list a nearby structure's supply as the topic structure's own. (c) For clinical/anatomical comparisons (e.g. hernia types), verify each directional claim: medial/lateral, anterior/posterior, superior/inferior. (d) Never transfer the contents of one named structure into another related structure.
EMBRYOLOGY: timeline-first, developmental sequence. Origin of structures, germ-layer origin, key developmental events, folding/migration/rotation, derivatives, developmental relationships, molecular/mechanical signals when relevant, congenital anomalies, mechanism of anomaly, clinical correlation. Timeline + derivatives + congenital anomalies + mechanisms are more important than generic definitions. Congenital anomalies and their clinical consequences belong inside customSections (Congenital Anomalies, Mechanism, Clinical Correlations) — never in standard clinical fields.
PHYSIOLOGY: core physiological principle, mechanism, regulation, feedback loops, normal values where genuinely important, equations, graphs/relationships, applied physiology, clinical correlations. Explain WHY, not merely what. For every major mechanism: Stimulus → receptor/sensor → pathway → mediator → target → physiological response → feedback. Avoid merely listing disconnected facts.
BIOCHEMISTRY: pathway, cellular location, rate-limiting enzyme, important enzymes, regulation, substrates/products, cofactors, vitamins, energy yield, clinical significance, deficiencies, inborn errors.
PATHOLOGY: etiology, risk factors, pathogenesis, gross morphology, microscopy, molecular basis, clinical features, laboratory findings, complications, prognostic factors, differentials.
PHARMACOLOGY: drug/class, mechanism of action, pharmacological effects, indications, contraindications, adverse effects, important interactions, pharmacokinetics only where clinically/exam relevant, drug of choice/first-line only when context is specific enough, antidotes, important comparisons. Never say "drug of choice" unless the context is specific enough for the statement to be true. Never present a drug recommendation as universal when it depends on indication or guidelines.
MICROBIOLOGY: classification, morphology, virulence factors, reservoir, transmission, pathogenesis, clinical disease, lab diagnosis, culture/identification, treatment, prevention, vaccination.
HISTOLOGY — tissue/cell/architecture-first: tissue identification, microscopic architecture, cell types, layers, functions, distinguishing microscopic features, staining/histochemical features where relevant, clinical correlations. Clinical points and tissue comparisons belong under Clinical Correlations or dedicated customSections, never in standard clinical fields.
IMMUNOLOGY: immune mechanism, cells, cytokines, antibodies, pathways, hypersensitivity, autoimmunity, immunodeficiency, clinical correlations, diagnostic markers.
DENTAL: adapt to the specific discipline — oral pathology (etiology → pathogenesis → clinical appearance → radiographic findings → histology → differential → treatment/prognosis), periodontology (etiology → risk factors → clinical findings → classification → treatment → maintenance), endodontics (diagnosis → pulp status → clinical tests → treatment → complications), prosthodontics (indications → principles → materials → steps → complications), orthodontics (etiology → classification → diagnosis → cephalometrics → treatment → appliances), dental materials (composition → properties → manipulation → indications → limitations → applications).

For non-clinical topics: return the discipline-appropriate content in the "customSections" array — choose the 5-8 MOST relevant sections, each with a "title" and concise "content" bullets (≤20 words each). Exam Pearls (3-5), High-Yield Exam Concepts (3-5), Common Traps (2-4), and Associations (where relevant) MUST still be generated — a complete note with fewer sections beats a truncated note with more. For non-USMLE topics, label the concepts section "High-Yield Exam Concepts" and focus on mechanisms, associations, comparisons, and exam-relevant reasoning rather than clinical vignettes.
For clinical topics: use the standard 12-field JSON. Return empty arrays for any standard section that is genuinely irrelevant. For non-clinical topics: return EMPTY arrays for pathophysiology, clinicalFeatures, investigations, management, complications, and differentialDiagnosis — ALL content goes into customSections plus examPearls, commonTraps, usmleConcepts, and associations.

## SECTION REQUIREMENTS

1. DEFINITION: One concise, textbook-accurate definition.
2. CORE CONCEPT: The single most important concept the student should understand (2-3 sentences).
3. PATHOPHYSIOLOGY: Logical sequence — Cause → mechanism → consequence → clinical manifestation. 3-5 sentences. Concise, not textbook-level detail.
4. CLINICAL FEATURES: 4-6 specific findings — classic symptoms, characteristic signs, important examination findings, important symptom sequence, important presentation variants. NOT generic placeholders.
5. INVESTIGATIONS: 4-6 specific tests with: appropriate initial investigation, characteristic findings, confirmatory/definitive tests where relevant, important interpretation points, important diagnostic threshold only when well established, important limitation where relevant. Name the ACTUAL test and what it shows.
6. MANAGEMENT: Give the general management principle first. Then specific treatment steps. Prioritize: (1) initial stabilization if relevant, (2) definitive treatment, (3) important alternatives, (4) complicated disease, (5) special populations. Distinguish important subtypes or special circumstances. Include drug names and surgical options where applicable.
7. COMPLICATIONS: 3-5 clinically important and commonly tested complications with brief mechanism/timing.
8. ASSOCIATIONS: 3-5 well-established, clinically meaningful associations (disease↔risk factor, disease↔associated malignancy, disease↔organism, disease↔genetic condition, disease↔complication, disease↔drug, disease↔anatomical finding). No weak, controversial, or low-yield associations. No exact percentages unless confidently established.
9. DIFFERENTIAL DIAGNOSIS: 3-6 key differentials, each with ONE distinguishing feature. Format: "Disease — distinguishing clue". Help the student reason through a clinical vignette.
10. EXAM PEARLS: 3-5 genuinely high-yield facts that can directly help solve an examination question or clinical vignette — classic presentations, characteristic signs, important anatomical relationships, characteristic laboratory patterns, first-line investigations, important management principles, classic associations, frequently tested distinctions. Do NOT fill with generic or interesting-but-low-yield facts.
11. COMMON EXAM TRAPS: 2-4 genuine, medically defensible traps. Each must identify: what students commonly confuse → what is actually correct. Do not invent traps to fill the section. Example: "⚠ Vomiting typically follows abdominal pain in appendicitis; vomiting that precedes pain favors gastroenteritis." Avoid absolute statements in traps — e.g. instead of "Nephrotic syndrome has no haematuria" write "Haematuria may occur in nephrotic disorders but is generally less prominent than in nephritic syndromes."
12. USMLE CONCEPTS: 3-5 concepts that emphasize clinical reasoning to solve vignettes — presentation→diagnosis, mechanism→finding, finding→diagnosis, diagnosis→next best step, disease→complication, disease→classic association, similar conditions→distinguishing feature. Do NOT simply repeat the Notes section or label generic textbook facts as "USMLE High-Yield".

## INTERNAL QUALITY CHECK (perform silently before outputting)

Audit every topic for ALL of the following before returning JSON:

1. TEXTBOOK — Consistent with recognized standard textbooks? No fabricated information? No unsupported claims?
2. CURRENT PRACTICE — Management/diagnosis contemporary? Outdated algorithms removed or qualified?
3. DIAGNOSTIC — Criteria, thresholds, and tests accurately described? "Gold standard" used appropriately?
4. CLINICAL — Presentation and management clinically realistic? Subtypes distinguished?
5. EXAM — Truly high-yield? Relevant to MBBS/BDS examinations? Useful for clinical vignettes?
6. NUMBERS — Doses, cut-offs, timelines, percentages, and normal values correct and appropriately qualified? No fabricated precision?
7. RELEVANCE — Every statement belongs to THIS topic? No unrelated associations? No topic drift?
8. OVERGENERALIZATION — No unsupported absolute claims? Statements scoped to population/subtype/context?
9. REPETITION — No fact repeated across sections without adding genuinely new educational value?
10. DISEASE-TEMPLATE CONTAMINATION — For Anatomy, Embryology, Histology, Physiology, and Biochemistry: "Did I accidentally write this like a disease?" If yes → remove irrelevant clinical-template sections, restructure around the discipline, preserve only clinically relevant applied correlations.
10b. ANATOMY SELF-AUDIT — For Anatomy specifically: "Does every section teach anatomy, anatomical relationships, or a meaningful applied-anatomy consequence?" If NO → remove or rewrite it.
10c. ANATOMY RELATIONSHIP CROSS-CHECK — For Anatomy: verify each listed structure's relationship category (wall vs content vs passing-through vs supply). Confirm no directional claim (medial/lateral, anterior/posterior) is inverted. Confirm blood/nerve supply belongs to the topic structure, not a nearby one.
11. MOST COMMON / GOLD STANDARD / DRUG OF CHOICE — No casual or context-free use of "most common", "most sensitive", "gold standard", "best test", "first-line", "drug of choice"?
12. OUTDATED MANAGEMENT — No obsolete treatment algorithms, outdated mnemonics, or superseded criteria presented as current?
13. SUBTYPE HANDLING — Disease subtype facts not generalized to the entire condition? Adult ≠ pediatric? Pregnancy ≠ non-pregnant?
14. ASSOCIATIONS — No weak, controversial, or loosely related associations added merely to fill the section?

If any check raises concern: correct, qualify, or remove the statement before outputting. Never knowingly display a questionable statement simply because it sounds high-yield.

## QUALITY GATE
Before outputting each statement, apply this decision logic:
- accurate + relevant + high-yield → KEEP
- accurate but low-yield → REMOVE
- accurate but context-dependent → QUALIFY
- outdated → UPDATE
- misleading → REWRITE
- uncertain → OMIT
- false → NEVER DISPLAY

## TERMINOLOGY & LANGUAGE
Use standard medical terminology with correct spelling. Do not use slang or vague terminology.
Use professional but student-friendly language. Prefer: "usually", "typically", "commonly", "often", "may", "is associated with" when appropriate. But do NOT use hedging merely to disguise uncertainty or preserve an outdated claim. Precision is more important than sounding cautious.

## HIGH-YIELD ≠ HIGH-VOLUME
Maximum educational value per line. Prefer: concise explanations, discriminating features, mechanisms, classic associations, clinically useful correlations, exam traps. Do NOT generate long generic paragraphs.

## MOST IMPORTANT RULE
Never sacrifice accuracy for completeness. Never sacrifice clinical correctness for exam memorability. Never sacrifice clarity for complexity. Never sacrifice current practice for traditional teaching. Never sacrifice topic relevance for template consistency. ALWAYS choose better content over more content.

Return ONLY valid JSON, no markdown, no extra text:
{
  "definition": "...",
  "coreConcept": "...",
  "pathophysiology": "...",
  "clinicalFeatures": ["...", "..."],
  "investigations": ["...", "..."],
  "management": ["...", "..."],
  "complications": ["...", "..."],
  "associations": ["...", "..."],
  "differentialDiagnosis": ["...", "..."],
  "examPearls": ["...", "..."],
  "commonTraps": ["...", "..."],
  "usmleConcepts": ["...", "..."],
  "customSections": [{"title": "Section Title", "content": ["...", "..."]}]
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
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 })
  }

  try {
    const response = await fetchGroqWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.7,
        max_tokens: 2650,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a clinically knowledgeable medical educator preparing high-yield revision notes for MBBS/BDS students. The golden rule: never sacrifice medical accuracy for completeness — more reliable information always wins over more information. When uncertain, DO NOT GUESS — use qualified wording or omit the claim. Never use absolute language unless genuinely justified. Never invent statistics, drug doses, diagnostic thresholds, or scoring system components. Do not overgeneralize — always distinguish disease subtypes and context-dependent management. Use "gold standard" only when genuinely established. Reflect current evidence-based clinical practice. Match the note architecture to the discipline — do NOT force a clinical disease template onto anatomy, physiology, biochemistry, or other non-clinical subjects. Use customSections for discipline-appropriate content on non-clinical topics. Output must read like a senior medical educator condensed standard textbook material into an exam-focused revision sheet. Output only valid JSON.',
          },
          { role: 'user', content: buildGuidePrompt(topic.trim(), subject) },
        ],
      }),
    })

    const data = await response.json()

    let raw: string
    let finishReason: string | undefined

    if (!response.ok) {
      console.error('[Guide API] Groq error:', response.status, JSON.stringify(data?.error))
      const failedGeneration = data?.error?.failed_generation
      if (typeof failedGeneration === 'string' && failedGeneration.trim()) {
        raw = failedGeneration
      } else {
        const msg = 'We could not generate your guide right now. Please try again.'
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
      }
    } else {
      raw = data?.choices?.[0]?.message?.content ?? ''
      finishReason = data?.choices?.[0]?.finish_reason
    }

    const parsed = parseGroqJson(raw, finishReason)

    // Validate customSections first (needed for non-clinical topic validation)
    if (Array.isArray(parsed.customSections)) {
      parsed.customSections = parsed.customSections
        .filter((s: any) => s && typeof s.title === 'string' && Array.isArray(s.content))
        .map((s: any) => ({
          title: s.title,
          content: s.content.filter((c: any) => typeof c === 'string' && c.trim().length > 0),
        }))
        .filter((s: any) => s.content.length > 0)
    } else {
      parsed.customSections = []
    }

    // Validate required fields — relaxed for non-clinical topics with customSections
    const hasCustomContent = parsed.customSections.length > 0
    const requiredFields: Array<[string, number]> = [
      ['definition', 10],
      ['coreConcept', 10],
    ]
    for (const [field, minLen] of requiredFields) {
      const value = parsed?.[field]
      if (typeof value !== 'string' || value.trim().length < minLen) {
        // Non-clinical topics may legitimately have empty standard fields
        if (!hasCustomContent) {
          return NextResponse.json(
            { success: false, error: `Guide generation incomplete (missing "${field}"). Try again.` },
            { status: 500 }
          )
        }
        // Provide a placeholder for non-clinical topics so the UI doesn't break
        if (field === 'definition') parsed.definition = parsed.customSections[0]?.content[0] ?? topic
        if (field === 'coreConcept') parsed.coreConcept = parsed.customSections[0]?.title ?? topic
      }
    }

    // Ensure array fields exist
    const arrayFields = ['clinicalFeatures', 'investigations', 'management', 'complications', 'associations', 'differentialDiagnosis', 'examPearls', 'commonTraps', 'usmleConcepts']
    for (const field of arrayFields) {
      if (!Array.isArray(parsed[field])) parsed[field] = []
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (err: any) {
    const cause = err?.cause
    const causeMsg = cause?.message ?? (typeof cause === 'string' ? cause : undefined)
    console.error('[MnemonicFlow Guide API]', err, cause ? { cause } : '')

    const isNetworkError = err?.message === 'fetch failed'
    const friendlyMsg = isNetworkError
      ? `Could not reach Groq's servers (network error${causeMsg ? `: ${causeMsg}` : ''}). Check your connection.`
      : err?.message ?? 'Guide generation failed. Try again.'

    return NextResponse.json({ success: false, error: friendlyMsg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
