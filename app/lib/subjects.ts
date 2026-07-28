// ─────────────────────────────────────────────────────────────────────────────
// app/lib/subjects.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Subject, SubjectId } from '../types'

export const SUBJECTS: Subject[] = [
  {
    id:          'anatomy',
    label:       'Anatomy',
    icon:        '🦴',
    color:       'anatomy',
    accent:      '#ff4d6d',
    description: 'Gross, neuro & clinical anatomy',
    year:        1,
    topics: [
      'Brachial plexus',
      'Circle of Willis',
      'Femoral triangle',
      'Carpal tunnel',
      'Inguinal canal',
    ],
  },
  {
    id:          'physiology',
    label:       'Physiology',
    icon:        '❤️',
    color:       'physio',
    accent:      '#ffd60a',
    description: 'Cardiovascular, renal & neuro',
    year:        1,
    topics: [
      'Action potential',
      'Frank-Starling law',
      'Renin-angiotensin',
      'Starling forces',
      'Cardiac cycle',
    ],
  },
  {
    id:          'biochemistry',
    label:       'Biochemistry',
    icon:        '⚗️',
    color:       'biochem',
    accent:      '#c77dff',
    description: 'Metabolism, enzymes & genetics',
    year:        1,
    topics: [
      'Krebs cycle',
      'Glycolysis steps',
      'DNA replication',
      'Urea cycle',
      'Fatty acid synthesis',
    ],
  },
  {
    id:          'pharmacology',
    label:       'Pharmacology',
    icon:        '💊',
    color:       'pharma',
    accent:      '#4df7c8',
    description: 'Drug classes, MOA & toxicology',
    year:        2,
    topics: [
      'Beta blockers',
      'ACE inhibitors',
      'Warfarin mechanism',
      'Penicillin MOA',
      'Opioid receptors',
    ],
  },
  {
    id:          'pathology',
    label:       'Pathology',
    icon:        '🔬',
    color:       'patho',
    accent:      '#ff6b35',
    description: 'General & systemic pathology',
    year:        2,
    topics: [
      'MI zones',
      'Virchow\'s triad',
      'Cell injury types',
      'Amyloidosis',
      'Neoplasia grades',
    ],
  },
  {
    id:          'microbiology',
    label:       'Microbiology',
    icon:        '🦠',
    color:       'micro',
    accent:      '#00b4fc',
    description: 'Bacteria, viruses & immunity',
    year:        2,
    topics: [
      'Gram positive cocci',
      'TB pathogenesis',
      'HIV life cycle',
      'Complement system',
      'Hepatitis viruses',
    ],
  },
  {
    id:          'medicine',
    label:       'Medicine',
    icon:        '🩺',
    color:       'green',
    accent:      '#0df27d',
    description: 'Internal medicine & clinical',
    year:        3,
    topics: [
      'Heart failure criteria',
      'Diabetes management',
      'ECG interpretation',
      'Thyroid disorders',
      'Acid-base balance',
    ],
  },
  {
    id:          'surgery',
    label:       'Surgery',
    icon:        '🔪',
    color:       'pharma',
    accent:      '#4df7c8',
    description: 'General, ortho & clinical surgery',
    year:        3,
    topics: [
      'Hernia types',
      'Wound healing',
      'Bowel obstruction',
      'Appendicitis signs',
      'Thyroid surgery',
    ],
  },
]

export const SUBJECT_MAP: Record<SubjectId, Subject> = Object.fromEntries(
  SUBJECTS.map(s => [s.id, s])
) as Record<SubjectId, Subject>

export function getSubject(id: SubjectId): Subject {
  return SUBJECT_MAP[id] ?? SUBJECTS[0]
}