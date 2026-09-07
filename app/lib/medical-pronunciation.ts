// ─────────────────────────────────────────────────────────────────────────────
// app/lib/medical-pronunciation.ts
// Medical abbreviation → spoken-form map for browser TTS preprocessing.
// Replaces abbreviations and jargon with natural spoken equivalents
// so the speech engine pronounces them correctly.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map of abbreviations/jargon → natural spoken form.
 * Case-insensitive matching is done at replacement time.
 * Order matters: longer/more specific entries first to avoid partial matches.
 */
const ABBREVIATION_MAP: [RegExp, string][] = [
  // Vital signs & measurements
  [/\bJVP\b/g, 'jugular venous pressure'],
  [/\bBP\b/g, 'blood pressure'],
  [/\bHR\b/g, 'heart rate'],
  [/\bRR\b/g, 'respiratory rate'],
  [/\bSpO2\b/g, 'oxygen saturation'],
  [/\bGCS\b/g, 'Glasgow Coma Scale'],
  [/\bBMI\b/g, 'body mass index'],
  [/\bPR\b/g, 'pulse rate'],

  // Labs & investigations
  [/\bHbA1c\b/g, 'hemoglobin A one C'],
  [/\bCBC\b/g, 'complete blood count'],
  [/\bLFT\b/g, 'liver function test'],
  [/\bRFT\b/g, 'renal function test'],
  [/\bABG\b/g, 'arterial blood gas'],
  [/\bECG\b/g, 'E C G'],
  [/\bEKG\b/g, 'E K G'],
  [/\bCXR\b/g, 'chest X-ray'],
  [/\bCT\b/g, 'C T scan'],
  [/\bMRI\b/g, 'M R I'],
  [/\bUSG\b/g, 'ultrasound'],
  [/\bESR\b/g, 'E S R'],
  [/\bCRP\b/g, 'C reactive protein'],
  [/\bTSH\b/g, 'T S H'],
  [/\bPT\b\/?(?:INR)?\b/gi, 'prothrombin time'],
  [/\bAPTT\b/g, 'A P T T'],

  // Clinical terms
  [/\bSOB\b/g, 'shortness of breath'],
  [/\bCOPD\b/g, 'C O P D'],
  [/\bCHF\b/g, 'congestive heart failure'],
  [/\bMI\b/g, 'myocardial infarction'],
  [/\bCVA\b/g, 'cerebrovascular accident'],
  [/\bTIA\b/g, 'transient ischemic attack'],
  [/\bDVT\b/g, 'deep vein thrombosis'],
  [/\bPE\b/g, 'pulmonary embolism'],
  [/\bPVD\b/g, 'peripheral vascular disease'],
  [/\bGERD\b/g, 'gastroesophageal reflux'],
  [/\bIBD\b/g, 'inflammatory bowel disease'],
  [/\bIBS\b/g, 'irritable bowel syndrome'],
  [/\bUTI\b/g, 'urinary tract infection'],
  [/\bCKD\b/g, 'chronic kidney disease'],
  [/\bAKI\b/g, 'acute kidney injury'],
  [/\bARDS\b/g, 'A R D S'],
  [/\bSIRS\b/g, 'systemic inflammatory response'],
  [/\bDIC\b/g, 'disseminated intravascular coagulation'],

  // Drug classes & abbreviations
  [/\bNSAIDs?\b/gi, 'non-steroidal anti-inflammatory drugs'],
  [/\bACEi\b/gi, 'A C E inhibitors'],
  [/\bARBs?\b/gi, 'A R B'],
  [/\bSSRI\b/g, 'S S R I'],
  [/\bIV\b/g, 'intravenous'],
  [/\bIM\b/g, 'intramuscular'],
  [/\bSC\b/g, 'subcutaneous'],
  [/\bPO\b/g, 'by mouth'],
  [/\bPRN\b/g, 'as needed'],
  [/\bBID\b/g, 'twice daily'],
  [/\bTID\b/g, 'three times daily'],
  [/\bQID\b/g, 'four times daily'],
  [/\bOD\b/g, 'once daily'],

  // Microorganisms
  [/\bE\. coli\b/g, 'Escherichia coli'],
  [/\bS\. aureus\b/g, 'Staphylococcus aureus'],
  [/\bS\. pneumoniae\b/g, 'Streptococcus pneumoniae'],
  [/\bK\. pneumoniae\b/g, 'Klebsiella pneumoniae'],
  [/\bH\. pylori\b/g, 'Helicobacter pylori'],
  [/\bC\. diff\b/gi, 'Clostridium difficile'],
  [/\bMRSA\b/g, 'M R S A'],
  [/\bVRE\b/g, 'V R E'],

  // Misc clinical
  [/\bHx\b/g, 'history'],
  [/\bDx\b/g, 'diagnosis'],
  [/\bTx\b/g, 'treatment'],
  [/\bRx\b/g, 'prescription'],
  [/\bSx\b/g, 'symptoms'],
  [/\bO\/E\b/g, 'on examination'],
  [/\bWNL\b/g, 'within normal limits'],
  [/\bNAD\b/g, 'no acute distress'],
  [/\bROM\b/g, 'range of motion'],
]

/**
 * Preprocess text for better TTS delivery:
 * 1. Replace medical abbreviations with spoken forms
 * 2. Add natural pause markers (commas) before key clauses
 * 3. Insert ellipses before important findings for emphasis
 */
export function preprocessForSpeech(text: string): string {
  let result = text

  // Step 1: Replace abbreviations
  for (const [pattern, replacement] of ABBREVIATION_MAP) {
    result = result.replace(pattern, replacement)
  }

  // Step 2: Add pauses before key teaching phrases
  const pauseBefore = [
    /\b(Notice that|Important point|Key finding|Remember that|This is critical|The key here is|Don't forget)\b/gi,
  ]
  for (const pattern of pauseBefore) {
    result = result.replace(pattern, '... $1')
  }

  // Step 3: Replace semicolons and colons with commas for natural pauses
  result = result.replace(/; /g, ', ')
  // Don't replace colons in time expressions (e.g., "12:00")
  result = result.replace(/: (?!\d)/g, ', ')

  // Step 4: Replace "—" and "–" with commas for natural pauses
  result = result.replace(/[—–]/g, ', ')

  return result
}
