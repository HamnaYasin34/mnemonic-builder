// ─────────────────────────────────────────────────────────────────────────────
// app/lib/curated-data.ts
// Static curated medical content — no API calls to browse.
// ~10 topics across MBBS/BDS disciplines with guides, quizzes, and Anki cards.
// Architecture allows expansion to 30-40+ topics by appending to these arrays.
// ─────────────────────────────────────────────────────────────────────────────

import { HighYieldGuide, QuizSet, AnkiCardV2, SubjectId, Discipline } from '../types'

function gid(topic: string): string {
  return `curated_${topic.toLowerCase().replace(/\s+/g, '_')}`
}

// ─── HIGH-YIELD GUIDES ─────────────────────────────────────────────────────

export const CURATED_GUIDES: HighYieldGuide[] = [
  // 1. Nephrotic Syndrome
  {
    id: gid('Nephrotic Syndrome'), topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId, discipline: 'mbbs' as Discipline,
    definition: 'A clinical syndrome characterised by heavy proteinuria (>3.5 g/day), hypoalbuminaemia (<3 g/dL), generalised oedema, and hyperlipidaemia resulting from glomerular basement membrane damage.',
    coreConcept: 'Podocyte injury or immune-mediated glomerular damage increases glomerular permeability to proteins, causing massive urinary protein loss. The liver compensates by increasing lipoprotein synthesis, producing hyperlipidaemia.',
    pathophysiology: 'Podocyte foot-process effacement → loss of slit diaphragm integrity → increased glomerular permeability to albumin → proteinuria >3.5 g/day → hypoalbuminaemia → decreased plasma oncotic pressure → generalised oedema. Hepatic compensatory lipoprotein synthesis → hyperlipidaemia. Urinary loss of antithrombin III → hypercoagulability.',
    clinicalFeatures: ['Periorbital and peripheral pitting oedema (worse in morning)', 'Frothy urine from heavy proteinuria', 'Weight gain from fluid retention', 'Fatigue and malaise', 'Ascites and pleural effusions in severe cases', 'Increased susceptibility to infections (urinary loss of immunoglobulins)'],
    investigations: ['Urine dipstick: 3+ to 4+ protein', '24-hour urine protein: >3.5 g/day (gold standard quantification)', 'Serum albumin: <3 g/dL', 'Lipid panel: elevated total cholesterol, LDL, and triglycerides', 'Renal biopsy: definitive for histological subtyping (especially in adults)', 'Serum complement levels: help differentiate causes (low in MPGN, lupus)'],
    management: ['Corticosteroids (prednisolone 1 mg/kg/day) — first-line for minimal change disease', 'ACE inhibitors or ARBs — reduce proteinuria via efferent arteriolar vasodilation', 'Statins — manage hyperlipidaemia', 'Loop diuretics (furosemide) — manage oedema with sodium restriction', 'Prophylactic anticoagulation — if albumin <2 g/dL (high thrombosis risk)', 'Cyclophosphamide or calcineurin inhibitors — for steroid-resistant or frequently relapsing cases'],
    complications: ['Deep vein thrombosis and renal vein thrombosis (loss of antithrombin III)', 'Spontaneous bacterial peritonitis (loss of immunoglobulins)', 'Acute kidney injury from hypovolaemia', 'Accelerated atherosclerosis from chronic hyperlipidaemia'],
    associations: ['Minimal change disease — most common cause in children, associated with NSAIDs and Hodgkin lymphoma', 'Membranous nephropathy — most common in adults, associated with Hepatitis B, SLE, solid tumours', 'FSGS — associated with HIV, obesity, sickle cell disease', 'Diabetic nephropathy — Kimmelstiel-Wilson nodules'],
    differentialDiagnosis: ['Nephritic syndrome — haematuria with RBC casts, hypertension, oliguria', 'Heart failure — oedema with elevated JVP, cardiomegaly', 'Liver cirrhosis — oedema with low albumin but no proteinuria', 'Hypothyroidism — myxoedema with non-pitting oedema'],
    examPearls: ['Most common cause in children: minimal change disease (responds to steroids)', 'Electron microscopy in minimal change: podocyte foot-process effacement with normal light microscopy', 'Most common cause in adults: membranous nephropathy (spike and dome on EM)', 'Selective proteinuria (mainly albumin) suggests minimal change; non-selective suggests FSGS or membranous', 'Renal vein thrombosis is classically associated with membranous nephropathy'],
    commonTraps: ['Confusing nephrotic with nephritic syndrome — nephrotic has no haematuria or RBC casts', 'Assuming steroids work for all causes — FSGS and membranous often need additional immunosuppression', 'Forgetting thrombosis risk — anticoagulate if albumin <2 g/dL regardless of symptoms'],
    usmleConcepts: ['Podocyte effacement on EM with normal LM = minimal change disease', 'Spike and dome pattern on EM = membranous nephropathy', 'Tram-track appearance = membranoproliferative glomerulonephritis'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  // 2. Myocardial Infarction
  {
    id: gid('Myocardial Infarction'), topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId, discipline: 'mbbs' as Discipline,
    definition: 'Irreversible necrosis of myocardial tissue due to prolonged ischaemia, most commonly from acute thrombotic occlusion of a coronary artery at the site of a ruptured atherosclerotic plaque.',
    coreConcept: 'Plaque rupture → platelet aggregation → thrombus formation → acute coronary occlusion → myocardial ischaemia exceeding 20-30 minutes → irreversible myocyte necrosis. The extent of damage depends on the territory supplied, collateral circulation, and time to reperfusion.',
    pathophysiology: 'Atherosclerotic plaque rupture exposes subendothelial collagen → platelet adhesion via vWF and GP Ib → platelet activation and aggregation → thromboxane A2 and ADP release → fibrin clot formation via tissue factor pathway → complete coronary occlusion → ischaemic necrosis within 20-30 min, progressing from subendocardium to transmural over 4-6 hours.',
    clinicalFeatures: ['Crushing central chest pain radiating to left arm/jaw, lasting >20 minutes', 'Diaphoresis, nausea, and vomiting', 'Dyspnoea from acute left ventricular failure', 'Sense of impending doom', 'Hypotension or cardiogenic shock in large infarcts', 'Silent MI in diabetics and elderly (atypical presentation)'],
    investigations: ['ECG: ST elevation >1mm in 2 contiguous leads (STEMI), new LBBB, or ST depression/T-wave inversion (NSTEMI)', 'Troponin I/T: rises 3-6 hours, peaks 12-24 hours, remains elevated 7-14 days (gold standard biomarker)', 'CK-MB: rises 4-6 hours, peaks 12-24 hours, normalises 48-72 hours (useful for reinfarction detection)', 'Echocardiography: wall motion abnormalities, ejection fraction assessment', 'Coronary angiography: definitive for identifying occluded vessel'],
    management: ['MONA: Morphine, Oxygen (if SpO2 <94%), Nitrates (sublingual GTN), Aspirin 300mg chewed', 'Dual antiplatelet therapy: Aspirin + P2Y12 inhibitor (ticagrelor/clopidogrel)', 'Primary PCI within 120 minutes of first medical contact — gold standard for STEMI', 'Thrombolysis (tenecteplase) if PCI unavailable within 120 minutes', 'Anticoagulation: unfractionated heparin or enoxaparin', 'Beta-blocker, ACE inhibitor, and high-intensity statin — long-term secondary prevention'],
    complications: ['Cardiogenic shock — most common cause of death', 'Ventricular free wall rupture — days 3-5, causes cardiac tamponade', 'Papillary muscle rupture — acute mitral regurgitation, days 2-7', 'Ventricular septal rupture — new holosystolic murmur, days 3-5', 'Dressler syndrome — autoimmune pericarditis, 2-10 weeks post-MI', 'Ventricular aneurysm — persistent ST elevation weeks later'],
    associations: ['Diabetes mellitus — accelerates atherosclerosis, causes silent MI', 'Familial hypercholesterolaemia — premature coronary disease', 'Cocaine use — coronary vasospasm causing MI in young patients', 'Kawasaki disease — coronary aneurysms in children'],
    differentialDiagnosis: ['Stable angina — pain relieved by rest/GTN within 15 minutes', 'Aortic dissection — tearing pain radiating to back, unequal pulses', 'Pulmonary embolism — pleuritic pain, tachycardia, D-dimer elevated', 'Pericarditis — pleuritic pain relieved by sitting forward, diffuse ST elevation'],
    examPearls: ['Most commonly occluded vessel: LAD (anterior MI — leads V1-V4)', 'Troponin is the most sensitive and specific cardiac biomarker', 'CK-MB normalises by 48-72 hours — useful for detecting reinfarction', 'Inferior MI (II, III, aVF) — often due to RCA occlusion, may cause bradycardia', 'Prinzmetal angina: transient ST elevation from coronary vasospasm, responds to CCBs'],
    commonTraps: ['Missing silent MI in diabetics — always check troponin in diabetic patients with unexplained dyspnoea or hypotension', 'Giving nitrates in right ventricular MI — causes profound hypotension (preload dependent)', 'Confusing pericarditis with MI — pericarditis has diffuse concave ST elevation with PR depression'],
    usmleConcepts: ['Coagulative necrosis is the pattern of cell death in MI (first 24 hours)', 'Granulation tissue appears at 3-7 days — period of greatest rupture risk', 'Dressler syndrome is a type II hypersensitivity reaction occurring weeks post-MI'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  // 3. Iron Deficiency Anemia
  {
    id: gid('Iron Deficiency Anemia'), topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId, discipline: 'mbbs' as Discipline,
    definition: 'A microcytic hypochromic anaemia caused by inadequate iron stores for haemoglobin synthesis, representing the most common cause of anaemia worldwide.',
    coreConcept: 'Iron is essential for haemoglobin production. Depleted iron stores → reduced haemoglobin synthesis → small (microcytic), pale (hypochromic) red blood cells. The anaemia develops gradually as stores are exhausted in sequence: storage iron → transport iron → functional iron.',
    pathophysiology: 'Negative iron balance (inadequate intake, malabsorption, chronic blood loss, or increased demand) → depletion of ferritin stores → decreased serum iron → decreased transferrin saturation → impaired haemoglobin synthesis in erythroid precursors → microcytic hypochromic RBCs → tissue hypoxia. Compensatory increased transferrin production (raised TIBC).',
    clinicalFeatures: ['Progressive fatigue, weakness, and pallor', 'Koilonychia (spoon-shaped nails) — specific to iron deficiency', 'Pica (craving for non-food substances like ice, clay, or starch)', 'Angular stomatitis and glossitis (smooth, sore tongue)', 'Brittle hair and brittle nails', 'Dysphagia in Plummer-Vinson syndrome (oesophageal web + iron deficiency)'],
    investigations: ['CBC: low Hb, low MCV (<80 fL), low MCH, high RDW (anisocytosis)', 'Serum ferritin: <15 ng/mL (most specific single test — but can be falsely normal as acute-phase reactant)', 'Serum iron: decreased', 'TIBC: increased (reflects elevated transferrin)', 'Transferrin saturation: <15%', 'Peripheral smear: microcytic hypochromic RBCs with pencil cells'],
    management: ['Identify and treat the underlying cause (especially GI bleeding in adults)', 'Oral iron: ferrous sulphate 200mg TDS or ferrous fumarate — first-line', 'Take on empty stomach with vitamin C (enhances absorption)', 'IV iron (iron sucrose, ferric carboxymaltose) — for malabsorption or intolerance to oral iron', 'Blood transfusion — only if haemodynamically unstable or Hb <7 g/dL', 'Continue iron for 3-6 months after Hb normalises to replenish stores'],
    complications: ['Severe anaemia → high-output cardiac failure', 'Plummer-Vinson syndrome → increased risk of post-cricoid carcinoma', 'Impaired cognitive development in children', 'Restless leg syndrome'],
    associations: ['Coeliac disease — duodenal iron malabsorption', 'Hookworm infection — chronic intestinal blood loss', 'Menorrhagia — most common cause in premenopausal women', 'Colon cancer — must exclude in any adult male or postmenopausal woman with iron deficiency'],
    differentialDiagnosis: ['Thalassaemia trait — low MCV but normal ferritin, elevated HbA2', 'Anaemia of chronic disease — low serum iron but normal/high ferritin, low TIBC', 'Sideroblastic anaemia — ring sideroblasts on bone marrow, high serum iron', 'Lead poisoning — basophilic stippling, high blood lead levels'],
    examPearls: ['Ferritin is the most specific test for iron deficiency but is an acute-phase reactant', 'High RDW distinguishes iron deficiency from thalassaemia trait (normal RDW in thalassaemia)', 'Always investigate for GI malignancy in adult males and postmenopausal women with unexplained iron deficiency', 'Pencil cells on peripheral smear are characteristic of iron deficiency', 'Reticulocyte count rises 7-10 days after starting iron therapy (reticulocyte crisis)'],
    commonTraps: ['Assuming normal ferritin excludes iron deficiency — ferritin rises in inflammation, check transferrin saturation', 'Confusing with thalassaemia trait — both have low MCV but thalassaemia has normal ferritin and high RBC count', 'Stopping iron too early — must continue 3-6 months after Hb normalises to replenish stores'],
    usmleConcepts: ['Iron deficiency → low ferritin, high TIBC, low transferrin saturation', 'Anaemia of chronic disease → high ferritin, low TIBC (hepcidin-mediated iron sequestration)', 'Plummer-Vinson triad: iron deficiency + dysphagia + oesophageal web'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  // 4. Acute Appendicitis
  {
    id: gid('Acute Appendicitis'), topic: 'Acute Appendicitis', subject: 'surgery' as SubjectId, discipline: 'mbbs' as Discipline,
    definition: 'Acute inflammation of the vermiform appendix, most commonly caused by obstruction of the appendiceal lumen, representing the most common surgical emergency of the abdomen.',
    coreConcept: 'Luminal obstruction → mucus accumulation → bacterial overgrowth → increased intraluminal pressure → venous congestion → ischaemic necrosis → perforation. The timeline from obstruction to perforation is typically 24-72 hours.',
    pathophysiology: 'Obstruction of appendiceal lumen (faecolith in adults, lymphoid hyperplasia in children) → continued mucosal secretion → increased intraluminal pressure → venous and lymphatic obstruction → mucosal ulceration and bacterial invasion of wall → transmural inflammation → gangrene → perforation → localised or generalised peritonitis.',
    clinicalFeatures: ['Periumbilical colicky pain migrating to right iliac fossa (classic sequence over 12-24 hours)', 'Anorexia (nearly universal — absence of anorexia questions the diagnosis)', 'Low-grade fever (37.5-38°C; high fever suggests perforation)', 'Nausea and vomiting (follows pain onset, not precedes it)', 'McBurney point tenderness (junction of lateral 1/3 and medial 2/3 of ASIS-umbilicus line)', 'Rovsing sign: RLQ pain on palpation of LLQ'],
    investigations: ['CBC: leucocytosis (10,000-18,000/mm³) with neutrophilia', 'CRP: elevated (combined WBC + CRP improves diagnostic accuracy)', 'Urinalysis: mild pyuria/haematuria possible (pelvic appendix near ureter)', 'Ultrasound: non-compressible appendix >6mm diameter, target sign', 'CT abdomen: gold standard in equivocal cases, sensitivity >95%', 'Pregnancy test: mandatory in women of childbearing age'],
    management: ['Appendicectomy (laparoscopic preferred) — definitive treatment', 'Preoperative IV antibiotics (cefuroxime + metronidazole) — reduce wound infection', 'Analgesia: paracetamol, NSAIDs; opioids do not mask clinical signs', 'IV fluids for hydration', 'Non-operative management with antibiotics alone — reserved for appendiceal mass/phlegmon (Ochsner-Sherren regimen)', 'Interval appendicectomy — 6-8 weeks after conservative management of appendiceal mass'],
    complications: ['Perforation — most common complication, risk increases after 36 hours', 'Appendiceal abscess — localised collection requiring percutaneous drainage', 'Peritonitis — from free perforation', 'Wound infection — most common postoperative complication', 'Stump appendicitis — rare recurrence if appendiceal stump is left too long'],
    associations: ['Low-fibre diet — associated with increased incidence', 'Familial tendency — 3x risk if first-degree relative affected', 'Carcinoid tumour — found in 0.5% of appendicectomies', 'Crohn disease — can cause appendiceal inflammation'],
    differentialDiagnosis: ['Mesenteric adenitis — common in children, often follows URTI', 'Ectopic pregnancy — positive pregnancy test, adnexal tenderness', 'Ovarian torsion — sudden onset severe pain, enlarged ovary on US', 'Meckel diverticulitis — clinically identical, left-sided tenderness possible', 'Renal colic — colicky pain radiating to groin, haematuria'],
    examPearls: ['Pain precedes vomiting in appendicitis (reverse in gastroenteritis)', 'Psoas sign: pain on right hip extension (retrocaecal appendix)', 'Obturator sign: pain on internal rotation of flexed right hip (pelvic appendix)', 'Alvarado score (MANTRELS) helps risk-stratify patients', 'The most common position of the appendix is retrocaecal (65%)'],
    commonTraps: ['Giving analgesia before assessment — actually does NOT mask signs (evidence-based)', 'Confusing appendicitis with gastroenteritis — in gastroenteritis, vomiting precedes pain', 'Missing appendicitis in pregnancy — appendix migrates superiorly, tenderness may be in RUQ'],
    usmleConcepts: ['Faecolith obstruction is the most common cause in adults; lymphoid hyperplasia in children', 'Pain migration reflects visceral (periumbilical) to somatic (RLQ) pain transition as inflammation reaches parietal peritoneum', 'Interval appendicectomy is performed 6-8 weeks after successful conservative management of appendiceal mass'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  // 5. Brachial Plexus
  {
    id: gid('Brachial Plexus'), topic: 'Brachial Plexus', subject: 'anatomy' as SubjectId, discipline: 'mbbs' as Discipline,
    definition: 'A network of nerves formed by the anterior rami of C5-T1 spinal nerves, supplying motor and sensory innervation to the entire upper limb.',
    coreConcept: 'The plexus reorganises spinal nerve fibres into peripheral nerves through a predictable anatomical sequence: Roots → Trunks → Divisions → Cords → Branches (mnemonic: Real Teens Drink Cold Beer). Each level serves specific anatomical relationships that explain clinical injury patterns.',
    pathophysiology: 'Not a disease entity — understanding the plexus anatomy is essential for localising injuries. Traction injuries (birth trauma, motorcycle accidents) affect upper roots (C5-C6 → Erb palsy) or lower roots (C8-T1 → Klumpke palsy). Compression at specific points (thoracic outlet, retroclavicular space) produces distinct patterns.',
    clinicalFeatures: ['Erb palsy (C5-C6): waiter tip deformity — arm adducted, medially rotated, elbow extended', 'Klumpke palsy (C8-T1): claw hand — loss of intrinsic hand muscles, Horner syndrome if T1 sympathetic fibres involved', 'Posterior cord injury: loss of deltoid, wrist/finger extension (Saturday night palsy)', 'Lateral cord injury: weakened coracobrachialis, biceps, and pronator teres', 'Medial cord injury: claw hand from loss of ulnar nerve and median nerve intrinsic supply'],
    investigations: ['Clinical examination: muscle power testing (MRC grade), sensory mapping, reflex testing', 'Nerve conduction studies: localise lesion level, differentiate pre-ganglionic from post-ganglionic', 'EMG: assess reinnervation, determine prognosis', 'MRI cervical spine and plexus: identify root avulsion, neuroma, or compression', 'CT myelography: gold standard for root avulsion (pseudomeningocele)'],
    management: ['Conservative: physiotherapy, splinting, and observation for spontaneous recovery (3-6 months)', 'Surgical nerve repair: direct repair, nerve grafting, or nerve transfer if no recovery by 3-6 months', 'Nerve transfer options: spinal accessory → suprascapular, intercostal → musculocutaneous', 'Free functioning muscle transfer — for late presentations (>12 months)', 'Pain management: gabapentin/pregabalin for neuropathic pain'],
    complications: ['Permanent muscle wasting and contractures if not treated', 'Chronic neuropathic pain', 'Complex regional pain syndrome', 'Frozen shoulder from prolonged immobilisation'],
    associations: ['Cervical rib — may compress lower trunk (C8-T1) causing thoracic outlet syndrome', 'Pancoast tumour — apical lung tumour compressing T1, causing Horner syndrome and hand intrinsic wasting', 'Birth trauma — shoulder dystocia causing Erb palsy (most common brachial plexus birth injury)'],
    differentialDiagnosis: ['Cervical radiculopathy — dermatomal pattern, positive Spurling test', 'Peripheral nerve entrapment — isolated nerve distribution (e.g. carpal tunnel)', 'Rotator cuff tear — weakness but normal sensation', 'Stroke — upper motor neuron pattern with hyperreflexia'],
    examPearls: ['Roots → Trunks → Divisions → Cords → Branches is the anatomical sequence', 'Upper trunk (C5-C6) injury = Erb palsy = waiter tip position', 'Lower trunk (C8-T1) injury = Klumpke palsy = claw hand + possible Horner syndrome', 'Long thoracic nerve (C5-C7) injury → winging of scapula (serratus anterior paralysis)', 'Axillary nerve from posterior cord → deltoid + teres minor; injured in surgical neck fracture'],
    commonTraps: ['Confusing upper and lower trunk injuries — Erb = shoulder/elbow, Klumpke = hand', 'Forgetting that C4 can contribute (prefixed plexus) or T2 (postfixed plexus)', 'Assuming all claw hands are ulnar nerve — lower trunk injury causes total claw hand (all intrinsics)'],
    usmleConcepts: ['Winging of scapula: long thoracic nerve (C5,6,7) → serratus anterior, injured in axillary node dissection', 'Surgical neck of humerus fracture: axillary nerve (posterior cord) → loss of deltoid abduction 15-90°', 'Saturday night palsy: radial nerve (posterior cord) → wrist drop, compressed in spiral groove'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
]

// ─── QUIZ SETS ───────────────────────────────────────────────────────────────

export const CURATED_QUIZZES: QuizSet[] = [
  // 1. Nephrotic Syndrome Quiz
  {
    id: gid('Nephrotic Syndrome'), topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId, discipline: 'mbbs' as Discipline, isCurated: true, createdAt: '2026-01-01T00:00:00Z',
    questions: [
      {
        id: 'ns_q1', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId,
        stem: 'A 5-year-old boy presents with periorbital oedema and frothy urine. Urine dipstick shows 4+ protein. Renal biopsy shows normal light microscopy but podocyte foot-process effacement on electron microscopy. What is the most likely diagnosis?',
        options: ['Focal segmental glomerulosclerosis', 'Minimal change disease', 'Membranous nephropathy', 'IgA nephropathy'],
        correctIndex: 1,
        explanation: 'Minimal change disease is the most common cause of nephrotic syndrome in children. It shows normal glomeruli on light microscopy with podocyte foot-process effacement visible only on electron microscopy. It typically responds well to corticosteroids.',
        wrongExplanations: ['FSGS shows segmental sclerosis on light microscopy, not normal glomeruli.', 'Membranous nephropathy shows thickened capillary walls and spike-and-dome pattern on EM; more common in adults.', 'IgA nephropathy is a nephritic syndrome with mesangial IgA deposits and haematuria.'],
        highYieldTakeaway: 'Normal LM + podocyte effacement on EM in a child with nephrotic syndrome = minimal change disease.',
        difficulty: 'Easy', category: 'diagnosis',
      },
      {
        id: 'ns_q2', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId,
        stem: 'A 45-year-old man with nephrotic syndrome develops sudden left flank pain and haematuria. Which complication has most likely occurred?',
        options: ['Renal cell carcinoma', 'Renal vein thrombosis', 'Acute pyelonephritis', 'Renal artery stenosis'],
        correctIndex: 1,
        explanation: 'Nephrotic syndrome causes urinary loss of antithrombin III and other anticoagulant proteins, creating a hypercoagulable state. Renal vein thrombosis classically presents with flank pain and haematuria, and is most strongly associated with membranous nephropathy.',
        wrongExplanations: ['RCC presents with a triad of flank pain, haematuria, and a palpable mass, but is not specifically associated with nephrotic syndrome.', 'Pyelonephritis would present with fever, dysuria, and positive urine culture, not specifically associated with nephrotic syndrome.', 'Renal artery stenosis causes hypertension and renal impairment, not acute flank pain with haematuria in this context.'],
        highYieldTakeaway: 'Nephrotic syndrome → hypercoagulability (loss of antithrombin III) → renal vein thrombosis risk, especially in membranous nephropathy.',
        difficulty: 'Medium', category: 'complication',
      },
      {
        id: 'ns_q3', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId,
        stem: 'Which proteinuria pattern is most characteristic of minimal change disease?',
        options: ['Non-selective proteinuria', 'Bence Jones proteinuria', 'Selective proteinuria (predominantly albumin)', 'Tubular proteinuria with beta-2 microglobulin'],
        correctIndex: 2,
        explanation: 'Minimal change disease produces selective proteinuria — predominantly albumin is lost because the charge-selective barrier is disrupted while the size-selective barrier remains relatively intact. Larger proteins are retained.',
        wrongExplanations: ['Non-selective proteinuria (loss of all protein sizes) suggests more severe glomerular damage as seen in FSGS or membranous nephropathy.', 'Bence Jones proteinuria (free light chains) is seen in multiple myeloma, a cause of tubular, not glomerular, proteinuria.', 'Tubular proteinuria with beta-2 microglobulin occurs in tubular diseases, not glomerular diseases like minimal change.'],
        highYieldTakeaway: 'Selective proteinuria (albumin only) = minimal change disease; non-selective = FSGS or membranous.',
        difficulty: 'Medium', category: 'diagnosis',
      },
      {
        id: 'ns_q4', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId,
        stem: 'A 55-year-old woman with nephrotic syndrome has a renal biopsy showing spike and dome pattern on electron microscopy. Which underlying condition should be investigated?',
        options: ['Recent NSAID use', 'Hepatitis B infection', 'Hodgkin lymphoma', 'Sickle cell disease'],
        correctIndex: 1,
        explanation: 'Spike and dome pattern on EM is characteristic of membranous nephropathy, the most common cause of nephrotic syndrome in adults. Secondary causes include Hepatitis B, SLE, solid tumours, and certain drugs (gold, penicillamine).',
        wrongExplanations: ['NSAIDs are associated with minimal change disease, not membranous nephropathy.', 'Hodgkin lymphoma is classically associated with minimal change disease, not membranous nephropathy.', 'Sickle cell disease is associated with FSGS, not membranous nephropathy.'],
        highYieldTakeaway: 'Membranous nephropathy (spike and dome) → investigate for Hepatitis B, SLE, and solid tumours.',
        difficulty: 'Hard', category: 'association',
      },
      {
        id: 'ns_q5', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId,
        stem: 'At what serum albumin level should prophylactic anticoagulation be considered in nephrotic syndrome?',
        options: ['Below 4 g/dL', 'Below 3 g/dL', 'Below 2 g/dL', 'Below 1 g/dL'],
        correctIndex: 2,
        explanation: 'Prophylactic anticoagulation should be considered when serum albumin falls below 2 g/dL because the risk of thromboembolic events (particularly renal vein thrombosis and DVT) increases significantly at this level due to loss of antithrombin III.',
        wrongExplanations: ['4 g/dL is within the normal range for serum albumin (3.5-5 g/dL); anticoagulation is not indicated.', '3 g/dL is the threshold for diagnosing hypoalbuminaemia in nephrotic syndrome but is not the anticoagulation threshold.', '1 g/dL is dangerously low; waiting until this level would leave patients at unacceptable thrombosis risk.'],
        highYieldTakeaway: 'Albumin <2 g/dL in nephrotic syndrome → start prophylactic anticoagulation.',
        difficulty: 'Medium', category: 'management',
      },
    ],
  },
  // 2. Myocardial Infarction Quiz
  {
    id: gid('Myocardial Infarction'), topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId, discipline: 'mbbs' as Discipline, isCurated: true, createdAt: '2026-01-01T00:00:00Z',
    questions: [
      {
        id: 'mi_q1', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId,
        stem: 'A 60-year-old man presents with crushing chest pain for 2 hours. ECG shows ST elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?',
        options: ['Left anterior descending', 'Left circumflex', 'Right coronary artery', 'Left main stem'],
        correctIndex: 2,
        explanation: 'ST elevation in leads II, III, and aVF indicates an inferior MI, most commonly caused by occlusion of the right coronary artery (RCA). The RCA supplies the inferior wall of the left ventricle in 85% of patients (right-dominant circulation).',
        wrongExplanations: ['LAD occlusion causes anterior MI with ST elevation in V1-V4.', 'Left circumflex occlusion causes lateral MI with ST elevation in I, aVL, V5, V6.', 'Left main stem occlusion would cause extensive anterolateral MI with ST elevation in multiple territories and is often fatal.'],
        highYieldTakeaway: 'Inferior MI (II, III, aVF) = RCA occlusion. Anterior MI (V1-V4) = LAD occlusion.',
        difficulty: 'Easy', category: 'diagnosis',
      },
      {
        id: 'mi_q2', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId,
        stem: 'A patient 4 days post-MI develops sudden hypotension, raised JVP, and a new holosystolic murmur at the left sternal border. What is the most likely complication?',
        options: ['Papillary muscle rupture', 'Ventricular septal rupture', 'Pericarditis', 'Left ventricular aneurysm'],
        correctIndex: 1,
        explanation: 'Ventricular septal rupture typically occurs 3-5 days post-MI and presents with a new holosystolic murmur at the left sternal border, acute heart failure with hypotension and raised JVP. It is caused by necrosis of the interventricular septum.',
        wrongExplanations: ['Papillary muscle rupture causes acute mitral regurgitation with an apical holosystolic murmur radiating to the axilla, not the left sternal border.', 'Pericarditis (early post-MI) causes pleuritic pain relieved by sitting forward and a friction rub, not a holosystolic murmur with haemodynamic collapse.', 'LV aneurysm presents weeks later with persistent ST elevation and heart failure, not acute haemodynamic collapse with a new murmur.'],
        highYieldTakeaway: '3-5 days post-MI + new holosystolic murmur at LSB + haemodynamic collapse = ventricular septal rupture.',
        difficulty: 'Hard', category: 'complication',
      },
      {
        id: 'mi_q3', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId,
        stem: 'Which cardiac biomarker is most useful for detecting reinfarction within the first week after an initial MI?',
        options: ['Troponin I', 'CK-MB', 'Myoglobin', 'BNP'],
        correctIndex: 1,
        explanation: 'CK-MB rises at 4-6 hours, peaks at 12-24 hours, and normalises by 48-72 hours. Because it returns to baseline quickly, a second rise indicates reinfarction. Troponin remains elevated for 7-14 days, making it unreliable for detecting reinfarction in the first week.',
        wrongExplanations: ['Troponin I remains elevated for 7-14 days, so a re-elevation from reinfarction cannot be distinguished from the original event.', 'Myoglobin rises early but is non-specific (skeletal muscle also produces it) and is not used clinically for reinfarction.', 'BNP reflects ventricular wall stress and heart failure severity, not myocardial necrosis or reinfarction.'],
        highYieldTakeaway: 'CK-MB normalises by 48-72 hours — the best marker for detecting reinfarction in the first week.',
        difficulty: 'Medium', category: 'diagnosis',
      },
      {
        id: 'mi_q4', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId,
        stem: 'A 55-year-old woman presents 3 weeks after an MI with pleuritic chest pain, fever, and a pericardial friction rub. What is the diagnosis?',
        options: ['Reinfarction', 'Dressler syndrome', 'Acute pericarditis', 'Pulmonary embolism'],
        correctIndex: 1,
        explanation: 'Dressler syndrome is an autoimmune-mediated pericarditis occurring 2-10 weeks post-MI. It presents with pleuritic chest pain, fever, pericardial friction rub, and diffuse ST elevation. It is thought to result from an immune response to myocardial antigens released during necrosis.',
        wrongExplanations: ['Reinfarction would show new ST changes and elevated cardiac biomarkers, not pleuritic pain with friction rub.', 'Acute (idiopathic/viral) pericarditis has the same clinical features but the post-MI timing specifically defines Dressler syndrome.', 'Pulmonary embolism causes pleuritic pain and tachycardia but not a pericardial friction rub.'],
        highYieldTakeaway: 'Dressler syndrome = autoimmune pericarditis 2-10 weeks post-MI (type II hypersensitivity).',
        difficulty: 'Medium', category: 'complication',
      },
      {
        id: 'mi_q5', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId,
        stem: 'Within what time frame should primary PCI be performed from first medical contact in a STEMI patient?',
        options: ['Within 60 minutes', 'Within 120 minutes', 'Within 240 minutes', 'Within 360 minutes'],
        correctIndex: 1,
        explanation: 'Current guidelines recommend primary PCI within 120 minutes of first medical contact (or within 90 minutes of hospital arrival). If PCI cannot be achieved within 120 minutes, thrombolysis should be given instead.',
        wrongExplanations: ['60 minutes is the target door-to-balloon time but not the total first medical contact-to-device time.', '240 minutes exceeds the recommended window; delayed reperfusion increases mortality.', '360 minutes is far too long — every 30-minute delay increases 1-year mortality by 7.5%.'],
        highYieldTakeaway: 'Primary PCI target: within 120 minutes of first medical contact; thrombolysis if PCI unavailable in time.',
        difficulty: 'Easy', category: 'management',
      },
    ],
  },
  // 3. Iron Deficiency Anemia Quiz
  {
    id: gid('Iron Deficiency Anemia'), topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId, discipline: 'mbbs' as Discipline, isCurated: true, createdAt: '2026-01-01T00:00:00Z',
    questions: [
      {
        id: 'ida_q1', topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId,
        stem: 'A 30-year-old woman has Hb 9.5 g/dL, MCV 72 fL, and serum ferritin 8 ng/mL. Which finding on peripheral blood smear is most characteristic?',
        options: ['Target cells', 'Pencil cells', 'Bite cells', 'Spherocytes'],
        correctIndex: 1,
        explanation: 'Pencil cells (elliptical, elongated RBCs) are characteristic of iron deficiency anaemia. They result from the abnormal haemoglobin content affecting the RBC membrane, creating this distinctive elongated shape.',
        wrongExplanations: ['Target cells are seen in thalassaemia, liver disease, and post-splenectomy, not specifically in iron deficiency.', 'Bite cells are seen in G6PD deficiency due to Heinz body removal by the spleen.', 'Spherocytes are seen in hereditary spherocytosis and autoimmune haemolytic anaemia.'],
        highYieldTakeaway: 'Pencil cells on peripheral smear + microcytic hypochromic anaemia + low ferritin = iron deficiency.',
        difficulty: 'Easy', category: 'diagnosis',
      },
      {
        id: 'ida_q2', topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId,
        stem: 'A 55-year-old man is found to have iron deficiency anaemia. What is the most important next step?',
        options: ['Start oral iron supplementation', 'Perform colonoscopy and upper GI endoscopy', 'Order bone marrow biopsy', 'Check haemoglobin electrophoresis'],
        correctIndex: 1,
        explanation: 'In any adult male or postmenopausal woman with unexplained iron deficiency anaemia, GI malignancy must be excluded. Colonoscopy and upper GI endoscopy are mandatory to rule out colorectal cancer, gastric cancer, and coeliac disease before attributing iron deficiency to benign causes.',
        wrongExplanations: ['Starting iron without investigating the cause could delay diagnosis of a GI malignancy.', 'Bone marrow biopsy is the gold standard for iron stores but is invasive; the priority is finding the cause of blood loss.', 'Haemoglobin electrophoresis diagnoses thalassaemia, which has normal ferritin, not low ferritin.'],
        highYieldTakeaway: 'Adult male or postmenopausal woman with iron deficiency → investigate for GI malignancy before treating.',
        difficulty: 'Medium', category: 'management',
      },
      {
        id: 'ida_q3', topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId,
        stem: 'Which set of iron studies is most consistent with anaemia of chronic disease rather than iron deficiency anaemia?',
        options: ['Low ferritin, high TIBC, low transferrin saturation', 'Normal/high ferritin, low TIBC, low transferrin saturation', 'Low ferritin, low TIBC, low transferrin saturation', 'High ferritin, high TIBC, high transferrin saturation'],
        correctIndex: 1,
        explanation: 'Anaemia of chronic disease is mediated by hepcidin, which sequesters iron in macrophages. This produces normal or elevated ferritin (iron is stored but not released), low TIBC (less transferrin produced), and low transferrin saturation. This contrasts with iron deficiency where ferritin is low and TIBC is high.',
        wrongExplanations: ['Low ferritin + high TIBC is the classic pattern of iron deficiency anaemia, not anaemia of chronic disease.', 'Low ferritin + low TIBC is unusual; low TIBC with low ferritin could suggest mixed aetiology but is not the classic ACD pattern.', 'High ferritin + high TIBC + high saturation suggests iron overload (haemochromatosis), not anaemia of chronic disease.'],
        highYieldTakeaway: 'Iron deficiency: low ferritin + high TIBC. Anaemia of chronic disease: normal/high ferritin + low TIBC.',
        difficulty: 'Medium', category: 'diagnosis',
      },
      {
        id: 'ida_q4', topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId,
        stem: 'A patient with iron deficiency anaemia starts oral iron therapy. What haematological change is expected at day 7-10?',
        options: ['Normalisation of haemoglobin', 'Peak reticulocyte count', 'Normalisation of ferritin', 'Appearance of target cells'],
        correctIndex: 1,
        explanation: 'The reticulocyte count peaks at 7-10 days after starting iron therapy (reticulocyte crisis or reticulocyte response). This is the earliest indicator that the treatment is working. Haemoglobin normalisation takes 4-6 weeks, and ferritin replenishment takes 3-6 months.',
        wrongExplanations: ['Haemoglobin normalisation takes 4-6 weeks, not 7-10 days.', 'Ferritin normalisation takes 3-6 months as iron stores are the last to be replenished.', 'Target cells are not a response to iron therapy; they are seen in thalassaemia and liver disease.'],
        highYieldTakeaway: 'Iron therapy response: reticulocyte peak at 7-10 days → Hb rises 1-2 g/dL per week → stores replenish in 3-6 months.',
        difficulty: 'Medium', category: 'management',
      },
      {
        id: 'ida_q5', topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId,
        stem: 'A 35-year-old woman presents with iron deficiency anaemia, dysphagia, and a post-cricoid web on barium swallow. What syndrome is this, and what malignancy risk does it carry?',
        options: ['Paterson-Kelly syndrome; oesophageal squamous cell carcinoma', 'Zollinger-Ellison syndrome; gastric carcinoid', 'Peutz-Jeghers syndrome; colorectal carcinoma', 'Plummer-Vinson syndrome; post-cricoid carcinoma'],
        correctIndex: 3,
        explanation: 'Plummer-Vinson syndrome (also called Paterson-Kelly syndrome) consists of the triad: iron deficiency anaemia + dysphagia + oesophageal web. It carries an increased risk of post-cricoid squamous cell carcinoma of the pharynx/upper oesophagus.',
        wrongExplanations: ['While Paterson-Kelly is an alternative name for Plummer-Vinson, the option pairs it with the wrong malignancy location.', 'Zollinger-Ellison syndrome involves gastrin-secreting tumours causing peptic ulcers, not iron deficiency with dysphagia.', 'Peutz-Jeghers syndrome involves hamartomatous polyps and mucocutaneous pigmentation, not oesophageal webs.'],
        highYieldTakeaway: 'Plummer-Vinson triad: iron deficiency + dysphagia + oesophageal web → risk of post-cricoid carcinoma.',
        difficulty: 'Hard', category: 'association',
      },
    ],
  },
]

// ─── ANKI CARDS V2 ──────────────────────────────────────────────────────────

export const CURATED_ANKI_CARDS: AnkiCardV2[] = [
  // Nephrotic Syndrome cards
  { id: 'ns_anki_1', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId, front: 'What are the four cardinal features of nephrotic syndrome?', back: 'Heavy proteinuria (>3.5 g/day), hypoalbuminaemia (<3 g/dL), generalised oedema, and hyperlipidaemia.', examPearl: 'Proteinuria is the primary event; all other features are secondary consequences.', category: 'definition', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'ns_anki_2', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId, front: 'What is the most common cause of nephrotic syndrome in children, and what does electron microscopy show?', back: 'Minimal change disease. EM shows podocyte foot-process effacement with normal light microscopy.', examPearl: 'Selective proteinuria (albumin only) and excellent steroid response are characteristic.', category: 'diagnosis', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'ns_anki_3', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId, front: 'Why are nephrotic syndrome patients at increased risk of thrombosis?', back: 'Urinary loss of antithrombin III (and proteins C and S) creates a hypercoagulable state. Risk is highest when albumin falls below 2 g/dL.', examPearl: 'Renal vein thrombosis is classically associated with membranous nephropathy.', category: 'complication', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'ns_anki_4', topic: 'Nephrotic Syndrome', subject: 'medicine' as SubjectId, front: 'What is the first-line treatment for minimal change disease?', back: 'Corticosteroids (prednisolone 1 mg/kg/day for 4-6 weeks, then taper). Over 90% of children respond.', examPearl: 'Steroid resistance should prompt reconsideration of diagnosis (biopsy for FSGS).', category: 'management', createdAt: '2026-01-01T00:00:00Z' },
  // Myocardial Infarction cards
  { id: 'mi_anki_1', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId, front: 'What ECG leads show ST elevation in an anterior MI, and which artery is occluded?', back: 'Leads V1-V4 show ST elevation. The left anterior descending (LAD) artery is occluded.', examPearl: 'V1-V2 = septal, V3-V4 = anterior. LAD is the most commonly occluded coronary artery.', category: 'diagnosis', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'mi_anki_2', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId, front: 'Why is CK-MB more useful than troponin for detecting reinfarction?', back: 'CK-MB normalises within 48-72 hours, so a second rise indicates reinfarction. Troponin remains elevated for 7-14 days, masking any new elevation.', examPearl: 'Use troponin for initial diagnosis (most sensitive); use CK-MB for reinfarction detection.', category: 'diagnosis', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'mi_anki_3', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId, front: 'Name three mechanical complications of MI and their typical timing.', back: 'Ventricular free wall rupture (days 3-5, causes tamponade), papillary muscle rupture (days 2-7, acute MR), ventricular septal rupture (days 3-5, new holosystolic murmur).', examPearl: 'All three occur in the 3-7 day window when necrotic tissue is weakest before scar formation.', category: 'complication', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'mi_anki_4', topic: 'Myocardial Infarction', subject: 'medicine' as SubjectId, front: 'What is the drug regimen for long-term secondary prevention after MI?', back: 'Dual antiplatelet therapy (aspirin + P2Y12 inhibitor for 12 months), beta-blocker, ACE inhibitor, high-intensity statin (atorvastatin 80mg).', examPearl: 'ACE inhibitors are particularly important in anterior MI or reduced ejection fraction.', category: 'management', createdAt: '2026-01-01T00:00:00Z' },
  // Iron Deficiency Anemia cards
  { id: 'ida_anki_1', topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId, front: 'What is the most specific laboratory test for iron deficiency?', back: 'Serum ferritin <15 ng/mL is the most specific single test. However, ferritin is an acute-phase reactant and can be falsely normal in inflammation.', examPearl: 'Always check transferrin saturation alongside ferritin — <15% supports iron deficiency even if ferritin is borderline.', category: 'diagnosis', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'ida_anki_2', topic: 'Iron Deficiency Anemia', subject: 'pathology' as SubjectId, front: 'How do you distinguish iron deficiency anaemia from thalassaemia trait using basic blood parameters?', back: 'Iron deficiency: high RDW (anisocytosis), low RBC count. Thalassaemia trait: normal RDW, normal/high RBC count, very low MCV disproportionate to anaemia severity.', examPearl: 'Mentzer index (MCV/RBC count): >13 suggests iron deficiency, <13 suggests thalassaemia.', category: 'diagnosis', createdAt: '2026-01-01T00:00:00Z' },
  // Acute Appendicitis cards
  { id: 'aa_anki_1', topic: 'Acute Appendicitis', subject: 'surgery' as SubjectId, front: 'Describe the classic pain sequence in acute appendicitis.', back: 'Periumbilical colicky pain (visceral, from appendiceal distension) → migrating to right iliac fossa (somatic, as inflammation reaches parietal peritoneum). This migration takes 12-24 hours.', examPearl: 'Pain precedes vomiting in appendicitis; the reverse suggests gastroenteritis.', category: 'mechanism', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'aa_anki_2', topic: 'Acute Appendicitis', subject: 'surgery' as SubjectId, front: 'What are the psoas and obturator signs, and what do they indicate about appendix position?', back: 'Psoas sign: pain on right hip extension — indicates retrocaecal appendix. Obturator sign: pain on internal rotation of flexed right hip — indicates pelvic appendix.', examPearl: 'The most common position of the appendix is retrocaecal (65%).', category: 'diagnosis', createdAt: '2026-01-01T00:00:00Z' },
  // Brachial Plexus cards
  { id: 'bp_anki_1', topic: 'Brachial Plexus', subject: 'anatomy' as SubjectId, front: 'What is the anatomical sequence of the brachial plexus?', back: 'Roots (C5-T1) → Trunks (upper, middle, lower) → Divisions (anterior, posterior) → Cords (lateral, medial, posterior) → Branches (terminal nerves).', examPearl: 'Cords are named by their relationship to the axillary artery, not the subclavian.', category: 'definition', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'bp_anki_2', topic: 'Brachial Plexus', subject: 'anatomy' as SubjectId, front: 'Compare Erb palsy and Klumpke palsy in terms of roots affected and clinical presentation.', back: 'Erb (C5-C6): arm adducted, medially rotated, elbow extended (waiter tip). Klumpke (C8-T1): claw hand with loss of intrinsic hand muscles, possible Horner syndrome.', examPearl: 'Erb = shoulder/elbow weakness. Klumpke = hand weakness. Different birth mechanisms too.', category: 'mechanism', createdAt: '2026-01-01T00:00:00Z' },
]

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

export function getCuratedGuide(id: string): HighYieldGuide | undefined {
  return CURATED_GUIDES.find(g => g.id === id)
}

export function getCuratedQuiz(id: string): QuizSet | undefined {
  return CURATED_QUIZZES.find(q => q.id === id)
}

export function getCuratedAnkiCards(topic: string): AnkiCardV2[] {
  const key = topic.trim().toLowerCase()
  return CURATED_ANKI_CARDS.filter(c => c.topic.toLowerCase() === key)
}

export function searchCuratedGuides(query: string): HighYieldGuide[] {
  const q = query.trim().toLowerCase()
  if (!q) return CURATED_GUIDES
  return CURATED_GUIDES.filter(g =>
    g.topic.toLowerCase().includes(q) ||
    g.subject.toLowerCase().includes(q) ||
    g.definition.toLowerCase().includes(q)
  )
}

export function searchCuratedQuizzes(query: string): QuizSet[] {
  const q = query.trim().toLowerCase()
  if (!q) return CURATED_QUIZZES
  return CURATED_QUIZZES.filter(qz =>
    qz.topic.toLowerCase().includes(q) ||
    qz.subject.toLowerCase().includes(q)
  )
}

export function filterGuidesByDiscipline(discipline: Discipline): HighYieldGuide[] {
  return CURATED_GUIDES.filter(g => g.discipline === discipline)
}

export function filterGuidesBySubject(subject: SubjectId): HighYieldGuide[] {
  return CURATED_GUIDES.filter(g => g.subject === subject)
}

export function filterQuizzesByDiscipline(discipline: Discipline): QuizSet[] {
  return CURATED_QUIZZES.filter(q => q.discipline === discipline)
}

export function filterQuizzesBySubject(subject: SubjectId): QuizSet[] {
  return CURATED_QUIZZES.filter(q => q.subject === subject)
}

// ─── ADDITIONAL GUIDES (6-10) ──────────────────────────────────────────────
// Placeholder: the additional guides and quizzes will be added below.
// For now, the helper functions above work with the base 5 guides and 3 quizzes.
// The component layer will combine curated + cached + generated content.

export const CURATED_GUIDES_EXTRA: HighYieldGuide[] = [
  {
    id: gid('Renin-Angiotensin System'), topic: 'Renin-Angiotensin System', subject: 'physiology' as SubjectId, discipline: 'mbbs' as Discipline,
    definition: 'A hormonal cascade regulating blood pressure, fluid balance, and electrolyte homeostasis through renin, angiotensinogen, ACE, and aldosterone.',
    coreConcept: 'Decreased renal perfusion → renin release → angiotensinogen to Ang I → ACE converts to Ang II (potent vasoconstrictor) → aldosterone release → Na+/water retention → increased BP.',
    pathophysiology: 'Renin triggers: decreased BP (baroreceptor), decreased NaCl (macula densa), sympathetic beta-1 stimulation. Ang II constricts efferent > afferent arteriole (maintains GFR), stimulates aldosterone (Na+ reabsorption, K+ secretion), ADH release, and thirst.',
    clinicalFeatures: ['Hyperaldosteronism: hypertension + hypokalaemia + metabolic alkalosis', 'Renal artery stenosis: refractory hypertension + elevated renin', 'Addison disease: low aldosterone → hyponatraemia, hyperkalaemia', 'Heart failure: compensatory RAAS activation worsens fluid overload'],
    investigations: ['Plasma renin activity and aldosterone levels', 'Aldosterone-to-renin ratio (ARR >30 = primary hyperaldosteronism)', 'Renal artery Doppler/CT angiography', 'Serum electrolytes: Na+, K+, bicarbonate'],
    management: ['ACE inhibitors (ramipril) — block Ang I → Ang II conversion', 'ARBs (losartan) — block AT1 receptor', 'Aldosterone antagonists (spironolactone) — resistant HTN, heart failure', 'Surgical: adrenalectomy for Conn syndrome, angioplasty for RAS'],
    complications: ['ACEi cough (bradykinin accumulation)', 'Angioedema (ACE inhibitor)', 'Hyperkalaemia (ACEi/ARB/spironolactone)', 'AKI if bilateral RAS treated with ACEi'],
    associations: ['Diabetes — ACEi/ARB renoprotective', 'Pregnancy — ACEi/ARBs teratogenic', 'Heart failure — RAAS maladaptive long-term'],
    differentialDiagnosis: ['Primary hyperaldosteronism (Conn): high aldosterone, low renin', 'Secondary hyperaldosteronism: high aldosterone, high renin', 'Liddle syndrome: low aldosterone, low renin'],
    examPearls: ['ACE = kininase II → degrades bradykinin (mechanism of ACEi cough)', 'Ang II constricts efferent > afferent → maintains GFR in hypovolaemia', 'Aldosterone acts on collecting duct: Na+ reabsorption, K+/H+ secretion', 'First-dose hypotension with ACEi — start low in heart failure'],
    commonTraps: ['Confusing primary vs secondary hyperaldosteronism — check renin', 'ARBs do NOT cause cough but CAN cause hyperkalaemia', 'ACEi in bilateral RAS → acute renal failure'],
    usmleConcepts: ['ACE degrades bradykinin (kininase II) — angioedema mechanism', 'Renin from JG cells: decreased stretch + decreased NaCl + sympathetic', 'Ang II stimulates proximal tubule Na+-H+ exchange'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: gid('Krebs Cycle'), topic: 'Krebs Cycle', subject: 'biochemistry' as SubjectId, discipline: 'mbbs' as Discipline,
    definition: 'The central metabolic pathway (TCA cycle) oxidising acetyl-CoA to CO2, generating NADH, FADH2, and GTP in the mitochondrial matrix.',
    coreConcept: 'Acetyl-CoA (2C) + oxaloacetate (4C) → citrate (6C) → 8 steps releasing 2 CO2, 3 NADH, 1 FADH2, 1 GTP per turn. Two turns per glucose.',
    pathophysiology: 'NADH/FADH2 feed ETC for oxidative phosphorylation (~2.5 ATP/NADH, ~1.5/FADH2). Rate-limiting: isocitrate dehydrogenase (activated by ADP, inhibited by ATP/NADH). Also provides biosynthetic intermediates.',
    clinicalFeatures: ['Thiamine (B1) deficiency → impaired alpha-KGDH + PDH → lactic acidosis, Wernicke-Korsakoff', 'Arsenic poisoning → inhibits lipoic acid → blocks PDH and alpha-KGDH', 'Fluoroacetate poisoning → inhibits aconitase → citrate accumulation'],
    investigations: ['Lactate levels — elevated when TCA impaired', 'Urine organic acids — intermediate accumulations in inborn errors'],
    management: ['Thiamine supplementation for deficiency', 'Treatment of underlying metabolic disorders'],
    complications: ['ATP depletion → cellular energy failure', 'Lactic acidosis — pyruvate shunted to lactate', 'Neurological dysfunction — brain depends on aerobic metabolism'],
    associations: ['PDH deficiency — lactic acidosis, neurological impairment', 'Succinate dehydrogenase mutations — paragangliomas'],
    differentialDiagnosis: ['Glycolysis: anaerobic/cytoplasm vs TCA: aerobic/mitochondria', 'Beta-oxidation feeds acetyl-CoA to TCA from fatty acids'],
    examPearls: ['Rate-limiting: isocitrate dehydrogenase', 'Substrate-level phosphorylation: succinyl-CoA → succinate (GTP)', 'Succinate dehydrogenase = Complex II of ETC (inner mitochondrial membrane)', 'Thiamine: cofactor for PDH, alpha-KGDH, transketolase, branched-chain ketoacid DH'],
    commonTraps: ['Counting 1 turn — each glucose = 2 acetyl-CoA = 2 turns', 'GTP step is succinyl-CoA synthetase, NOT succinate dehydrogenase', 'Malate dehydrogenase also produces NADH'],
    usmleConcepts: ['Thiamine cofactor for: PDH, alpha-KGDH, transketolase, BCKDH', 'Arsenic inhibits lipoic acid → affects PDH + alpha-KGDH', 'Fluoroacetate inhibits aconitase → citrate accumulates'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: gid('Trigeminal Neuralgia'), topic: 'Trigeminal Neuralgia', subject: 'oral-medicine' as SubjectId, discipline: 'bds' as Discipline,
    definition: 'Chronic neuropathic pain condition with sudden, severe, brief electric shock-like pain in the distribution of trigeminal nerve (CN V) branches.',
    coreConcept: 'Vascular compression (usually superior cerebellar artery) at trigeminal root entry zone → demyelination → ephaptic transmission → paroxysmal ectopic discharges → brief intense pain triggered by light touch.',
    pathophysiology: 'SCA compression → focal demyelination → short-circuiting between nerve fibres → A-beta fibres (light touch) abnormally trigger pain. Pain-free intervals between attacks.',
    clinicalFeatures: ['Unilateral electric shock-like pain lasting seconds to 2 minutes', 'V2 (maxillary) or V3 (mandibular) most commonly affected', 'Trigger zones: light touch, chewing, talking, brushing teeth, wind', 'No sensory loss on examination (classical TN)', 'Tic douloureux — wincing during attacks'],
    investigations: ['MRI brain with trigeminal protocol — neurovascular compression, exclude MS/tumour', 'Clinical diagnosis (ICHD-3 criteria)', 'Dental exam — exclude dental causes', 'Neurological exam — rule out deficits'],
    management: ['Carbamazepine — first-line (70-80% effective)', 'Oxcarbazepine — fewer side effects', 'Microvascular decompression (Jannetta) — definitive surgery', 'Gamma knife radiosurgery — unfit for open surgery'],
    complications: ['Carbamazepine: drowsiness, hyponatraemia, bone marrow suppression, SJS (HLA-B*1502)', 'Facial numbness post-surgery', 'Depression and social withdrawal'],
    associations: ['Multiple sclerosis — 20x higher risk', 'CPA tumours — secondary TN'],
    differentialDiagnosis: ['Dental pain — constant aching, responsive to dental treatment', 'Glossopharyngeal neuralgia — throat/ear pain on swallowing', 'Post-herpetic neuralgia — constant burning', 'Atypical facial pain — constant, no trigger zones'],
    examPearls: ['Carbamazepine first-line (70-80%)', 'V2 most commonly affected', 'Bilateral TN → suspect MS', 'Pain triggered by light touch is characteristic'],
    commonTraps: ['Misdiagnosing as dental pain — unnecessary extractions', 'HLA-B*1502 testing before carbamazepine in Asian patients', 'Confusing with glossopharyngeal neuralgia'],
    usmleConcepts: ['SCA is most common compressing vessel', 'Carbamazepine: blocks voltage-gated Na+ channels', 'V1: superior orbital fissure, V2: foramen rotundum, V3: foramen ovale'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: gid('Oral Squamous Cell Carcinoma'), topic: 'Oral Squamous Cell Carcinoma', subject: 'oral-pathology' as SubjectId, discipline: 'bds' as Discipline,
    definition: 'Most common oral malignancy — invasive growth of malignant squamous cells from oral mucosal epithelium through basement membrane into connective tissue.',
    coreConcept: 'Multistep carcinogenesis: normal → hyperplasia → dysplasia → CIS → invasive carcinoma. Tobacco + alcohol act synergistically as major risk factors.',
    pathophysiology: 'Chronic carcinogen exposure → DNA damage → TP53, p16 mutations → loss of cell cycle control → dysplasia → basement membrane breach → invasion → lymphatic spread to cervical nodes.',
    clinicalFeatures: ['Non-healing ulcer with rolled everted edges, indurated base', 'Most common sites: lateral tongue, floor of mouth, lower lip', 'Leukoplakia/erythroplakia as premalignant lesions', 'Trismus from pterygoid involvement', 'Cervical lymphadenopathy (firm, fixed nodes)'],
    investigations: ['Incisional biopsy — gold standard', 'CT/MRI — tumour extent, bone invasion, nodal involvement', 'PET-CT — distant mets, second primaries', 'OPG — mandibular invasion'],
    management: ['Early (T1-T2, N0): wide excision (1cm margin) or RT', 'Advanced: surgery + adjuvant chemoradiotherapy', 'Neck dissection: elective or therapeutic', 'Free flap reconstruction'],
    complications: ['Local recurrence (10-30%)', 'Osteoradionecrosis', 'Second primaries (field cancerisation)', 'Dysphagia and nutritional compromise'],
    associations: ['Tobacco + alcohol (synergistic)', 'Betel quid/paan', 'HPV-16 (oropharyngeal, better prognosis)', 'Erythroplakia: up to 50% malignant transformation'],
    differentialDiagnosis: ['Traumatic ulcer — heals in 2 weeks', 'Oral TB — undermined edges, AFB positive', 'Lichen planus — bilateral, Wickham striae'],
    examPearls: ['Most common site: lateral tongue and floor of mouth', 'Erythroplakia > leukoplakia malignant potential', 'TP53 most commonly mutated gene', 'Field cancerisation explains multiple tumours'],
    commonTraps: ['Assuming white patches are leukoplakia — must biopsy', 'Verrucous carcinoma: slow-growing, rarely metastasises', 'Occult nodal mets in 20-30% of clinically N0 cases'],
    usmleConcepts: ['TP53 mutation most common in OSCC', 'Field cancerisation: entire mucosa exposed to carcinogens', 'HPV+ oropharyngeal SCC: better prognosis'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: gid('Dental Caries'), topic: 'Dental Caries', subject: 'operative-dentistry' as SubjectId, discipline: 'bds' as Discipline,
    definition: 'Multifactorial, biofilm-mediated progressive destruction of dental hard tissues by acid-producing bacteria metabolising dietary carbohydrates.',
    coreConcept: 'Imbalance between demineralisation (acid) and remineralisation (saliva). S. mutans initiates enamel caries; Lactobacillus drives dentine progression. Critical pH: enamel ~5.5, dentine ~6.2.',
    pathophysiology: 'Sugars → cariogenic bacteria → lactic acid → pH below critical → hydroxyapatite dissolution → white spot → cavitation → dentine → pulpitis → necrosis. Fluoride forms fluorapatite (lower critical pH).',
    clinicalFeatures: ['White spot lesion (early, reversible)', 'Cavitation — visible hole', 'Sensitivity to sweet, cold, hot', 'Pain on biting when dentine reached', 'Pulpitis: spontaneous (irreversible) or stimulus-triggered (reversible)'],
    investigations: ['Visual-tactile examination', 'Bitewing radiographs — interproximal caries', 'DIAGNOdent — early detection', 'CAMBRA risk assessment'],
    management: ['Fluoride varnish, CPP-ACP, dietary modification', 'Resin infiltration (ICON) for non-cavitated lesions', 'Selective caries removal + adhesive restoration', 'SDF — arrest active caries in high-risk patients'],
    complications: ['Pulpitis (reversible → irreversible)', 'Periapical abscess', 'Ludwig angina (mandibular molar)', 'Cavernous sinus thrombosis (maxillary)'],
    associations: ['Xerostomia — dramatically increases risk', 'Sjögren syndrome, head/neck radiotherapy', 'Early childhood caries — prolonged bottle feeding'],
    differentialDiagnosis: ['Enamel hypoplasia — developmental, not progressive', 'Erosion — dietary/reflux acid, not bacterial', 'Fluorosis — mottled but structurally sound'],
    examPearls: ['S. mutans: enamel initiator; Lactobacillus: dentine progression', 'Critical pH: enamel 5.5, dentine 6.2', 'Sucrose most cariogenic — bacteria form glucans', 'Bitewing radiographs most useful for detection'],
    commonTraps: ['Treating white spot operatively — it is reversible', 'Confusing erosion (dietary acid) with caries (bacterial acid)', 'Overlooking caries risk assessment'],
    usmleConcepts: ['Fluoride → fluorapatite (critical pH ~4.5)', 'Stephan curve: frequency of sugar > total amount', 'Sjögren triad: xerostomia + KCS + CTD'],
    isCurated: true, createdAt: '2026-01-01T00:00:00Z',
  },
]
export const CURATED_QUIZZES_EXTRA: QuizSet[] = []
export const CURATED_ANKI_CARDS_EXTRA: AnkiCardV2[] = []

export const ALL_GUIDES = [...CURATED_GUIDES, ...CURATED_GUIDES_EXTRA]
export const ALL_QUIZZES = [...CURATED_QUIZZES, ...CURATED_QUIZZES_EXTRA]
export const ALL_ANKI_CARDS = [...CURATED_ANKI_CARDS, ...CURATED_ANKI_CARDS_EXTRA]

export function getAllGuides(): HighYieldGuide[] { return ALL_GUIDES }
export function getAllQuizzes(): QuizSet[] { return ALL_QUIZZES }
export function getAllAnkiCards(topic: string): AnkiCardV2[] {
  const key = topic.trim().toLowerCase()
  return ALL_ANKI_CARDS.filter(c => c.topic.toLowerCase() === key)
}
export function searchAllGuides(query: string): HighYieldGuide[] {
  const q = query.trim().toLowerCase()
  if (!q) return ALL_GUIDES
  return ALL_GUIDES.filter(g => g.topic.toLowerCase().includes(q) || g.subject.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q))
}
export function searchAllQuizzes(query: string): QuizSet[] {
  const q = query.trim().toLowerCase()
  if (!q) return ALL_QUIZZES
  return ALL_QUIZZES.filter(qz => qz.topic.toLowerCase().includes(q) || qz.subject.toLowerCase().includes(q))
}
export function filterAllGuidesByDiscipline(discipline: Discipline): HighYieldGuide[] {
  return ALL_GUIDES.filter(g => g.discipline === discipline)
}
export function filterAllQuizzesByDiscipline(discipline: Discipline): QuizSet[] {
  return ALL_QUIZZES.filter(q => q.discipline === discipline)
}
