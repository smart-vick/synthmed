import crypto from 'crypto';

const PROVINCES = {
  ON: { name: 'Ontario', weight: 0.385 },
  QC: { name: 'Quebec', weight: 0.228 },
  BC: { name: 'British Columbia', weight: 0.134 },
  AB: { name: 'Alberta', weight: 0.117 },
  MB: { name: 'Manitoba', weight: 0.037 },
  SK: { name: 'Saskatchewan', weight: 0.031 },
  NS: { name: 'Nova Scotia', weight: 0.026 },
  NB: { name: 'New Brunswick', weight: 0.021 },
  NL: { name: 'Newfoundland and Labrador', weight: 0.014 },
  PE: { name: 'Prince Edward Island', weight: 0.004 },
  NT: { name: 'Northwest Territories', weight: 0.001 },
  YT: { name: 'Yukon', weight: 0.001 },
  NU: { name: 'Nunavut', weight: 0.001 },
};

const ETHNICITIES = [
  { label: 'White', weight: 0.697 },
  { label: 'South Asian', weight: 0.073 },
  { label: 'Chinese', weight: 0.052 },
  { label: 'Black', weight: 0.040 },
  { label: 'Filipino', weight: 0.029 },
  { label: 'Indigenous', weight: 0.050 },
  { label: 'Latin American', weight: 0.018 },
  { label: 'Arab', weight: 0.017 },
  { label: 'Southeast Asian', weight: 0.012 },
  { label: 'Other', weight: 0.012 },
];

const CONDITIONS = {
  cardiovascular: [
    { icd: 'I10', label: 'Essential Hypertension', meds: ['Lisinopril 10mg', 'Amlodipine 5mg', 'Ramipril 5mg'], bp: [140, 165, 85, 100], bmi: [24, 38], glucose: [4.8, 6.2], hba1c: [5.0, 5.8], creatinine: [70, 120], hemoglobin: [120, 160], los: [2, 7], readmit: 0.15, age: [45, 84] },
    { icd: 'I25.1', label: 'Atherosclerotic Heart Disease', meds: ['Atorvastatin 40mg', 'ASA 81mg', 'Metoprolol 50mg'], bp: [125, 150, 75, 95], bmi: [25, 36], glucose: [5.0, 6.5], hba1c: [5.2, 6.0], creatinine: [75, 130], hemoglobin: [115, 155], los: [3, 10], readmit: 0.22, age: [50, 84] },
    { icd: 'I48', label: 'Atrial Fibrillation', meds: ['Apixaban 5mg', 'Rivaroxaban 20mg', 'Metoprolol 50mg'], bp: [120, 145, 70, 90], bmi: [22, 34], glucose: [4.5, 5.8], hba1c: [4.8, 5.6], creatinine: [65, 115], hemoglobin: [118, 152], los: [2, 8], readmit: 0.20, age: [55, 84] },
    { icd: 'I50', label: 'Heart Failure', meds: ['Furosemide 40mg', 'Carvedilol 12.5mg', 'Sacubitril/Valsartan 49/51mg'], bp: [100, 140, 65, 85], bmi: [23, 38], glucose: [4.8, 6.0], hba1c: [5.0, 5.8], creatinine: [80, 180], hemoglobin: [100, 140], los: [4, 14], readmit: 0.30, age: [55, 84] },
    { icd: 'I21', label: 'Acute Myocardial Infarction', meds: ['Clopidogrel 75mg', 'Ticagrelor 90mg', 'Heparin IV'], bp: [90, 160, 60, 100], bmi: [24, 36], glucose: [5.5, 8.0], hba1c: [5.2, 6.5], creatinine: [70, 150], hemoglobin: [110, 155], los: [3, 12], readmit: 0.18, age: [40, 84] },
    { icd: 'I63', label: 'Cerebral Infarction', meds: ['ASA 81mg', 'Clopidogrel 75mg', 'Atorvastatin 80mg'], bp: [130, 180, 80, 110], bmi: [22, 35], glucose: [5.0, 7.5], hba1c: [5.0, 6.2], creatinine: [65, 130], hemoglobin: [115, 155], los: [5, 21], readmit: 0.15, age: [50, 84] },
  ],
  diabetes: [
    { icd: 'E11', label: 'Type 2 Diabetes Mellitus', meds: ['Metformin 500mg', 'Metformin 1000mg', 'Gliclazide 30mg'], bp: [130, 155, 80, 95], bmi: [27, 42], glucose: [7.0, 14.0], hba1c: [7.0, 10.5], creatinine: [70, 140], hemoglobin: [110, 150], los: [2, 8], readmit: 0.20, age: [35, 84] },
    { icd: 'E11.2', label: 'T2DM with Kidney Complications', meds: ['Empagliflozin 10mg', 'Insulin Glargine', 'Losartan 50mg'], bp: [135, 165, 85, 100], bmi: [28, 40], glucose: [8.0, 16.0], hba1c: [7.5, 11.0], creatinine: [120, 300], hemoglobin: [95, 135], los: [4, 12], readmit: 0.28, age: [45, 84] },
    { icd: 'E11.4', label: 'T2DM with Neurological Complications', meds: ['Pregabalin 75mg', 'Duloxetine 60mg', 'Metformin 1000mg'], bp: [130, 155, 80, 95], bmi: [27, 40], glucose: [7.5, 13.0], hba1c: [7.5, 10.0], creatinine: [70, 130], hemoglobin: [105, 145], los: [3, 10], readmit: 0.22, age: [45, 84] },
    { icd: 'E11.6', label: 'T2DM with Other Complications', meds: ['Empagliflozin 25mg', 'Semaglutide 1mg', 'Insulin Aspart'], bp: [135, 160, 85, 100], bmi: [30, 44], glucose: [9.0, 18.0], hba1c: [8.5, 12.0], creatinine: [90, 200], hemoglobin: [100, 140], los: [4, 14], readmit: 0.30, age: [40, 84] },
    { icd: 'E10', label: 'Type 1 Diabetes Mellitus', meds: ['Insulin Glargine', 'Insulin Aspart', 'Insulin Lispro'], bp: [110, 135, 70, 85], bmi: [19, 28], glucose: [4.0, 18.0], hba1c: [6.5, 10.0], creatinine: [55, 110], hemoglobin: [115, 155], los: [2, 8], readmit: 0.18, age: [18, 65] },
  ],
  respiratory: [
    { icd: 'J44.1', label: 'COPD with Acute Exacerbation', meds: ['Tiotropium 18mcg', 'Salbutamol Inhaler', 'Prednisone 40mg'], bp: [130, 155, 75, 95], bmi: [18, 30], glucose: [5.0, 7.5], hba1c: [5.0, 6.0], creatinine: [60, 110], hemoglobin: [130, 175], los: [3, 12], readmit: 0.28, age: [50, 84] },
    { icd: 'J45', label: 'Asthma', meds: ['Salbutamol Inhaler PRN', 'Fluticasone/Salmeterol', 'Montelukast 10mg'], bp: [110, 130, 65, 80], bmi: [20, 32], glucose: [4.5, 5.5], hba1c: [4.8, 5.4], creatinine: [55, 95], hemoglobin: [120, 155], los: [1, 5], readmit: 0.12, age: [18, 65] },
    { icd: 'J18', label: 'Pneumonia, Unspecified', meds: ['Amoxicillin 1g', 'Azithromycin 500mg', 'Ceftriaxone 1g IV'], bp: [100, 140, 60, 85], bmi: [19, 34], glucose: [5.5, 8.0], hba1c: [5.0, 6.0], creatinine: [65, 140], hemoglobin: [105, 150], los: [3, 14], readmit: 0.20, age: [28, 84] },
    { icd: 'J96.0', label: 'Acute Respiratory Failure', meds: ['Supplemental O2', 'Dexamethasone 6mg', 'Remdesivir 200mg'], bp: [90, 135, 55, 80], bmi: [20, 38], glucose: [6.0, 10.0], hba1c: [5.2, 6.5], creatinine: [70, 180], hemoglobin: [100, 145], los: [5, 21], readmit: 0.25, age: [40, 84] },
  ],
  'mental-health': [
    { icd: 'F32', label: 'Major Depressive Episode', meds: ['Sertraline 50mg', 'Escitalopram 10mg', 'Venlafaxine 75mg'], bp: [105, 130, 65, 82], bmi: [19, 34], glucose: [4.2, 5.5], hba1c: [4.6, 5.4], creatinine: [55, 95], hemoglobin: [115, 155], los: [3, 14], readmit: 0.18, age: [18, 75] },
    { icd: 'F41.1', label: 'Generalized Anxiety Disorder', meds: ['Escitalopram 10mg', 'Buspirone 10mg', 'Paroxetine 20mg'], bp: [110, 138, 68, 88], bmi: [19, 32], glucose: [4.3, 5.6], hba1c: [4.7, 5.5], creatinine: [55, 90], hemoglobin: [118, 155], los: [2, 10], readmit: 0.14, age: [18, 70] },
    { icd: 'F20', label: 'Schizophrenia', meds: ['Risperidone 2mg', 'Olanzapine 10mg', 'Aripiprazole 15mg'], bp: [108, 135, 65, 85], bmi: [22, 38], glucose: [4.5, 7.0], hba1c: [4.8, 6.5], creatinine: [55, 100], hemoglobin: [115, 155], los: [5, 28], readmit: 0.30, age: [18, 65] },
    { icd: 'F31', label: 'Bipolar Affective Disorder', meds: ['Lithium 600mg', 'Valproate 500mg', 'Quetiapine 200mg'], bp: [108, 135, 65, 85], bmi: [21, 36], glucose: [4.5, 6.0], hba1c: [4.8, 5.8], creatinine: [55, 105], hemoglobin: [115, 155], los: [4, 21], readmit: 0.25, age: [18, 65] },
  ],
  orthopedic: [
    { icd: 'M17', label: 'Osteoarthritis of Knee', meds: ['Naproxen 500mg', 'Celecoxib 200mg', 'Acetaminophen 500mg'], bp: [120, 145, 70, 90], bmi: [25, 40], glucose: [4.5, 5.8], hba1c: [4.8, 5.6], creatinine: [60, 110], hemoglobin: [118, 155], los: [2, 7], readmit: 0.08, age: [50, 84] },
    { icd: 'S72.0', label: 'Fracture of Neck of Femur', meds: ['Morphine 5mg PRN', 'Enoxaparin 40mg', 'Calcium/Vitamin D'], bp: [110, 150, 65, 90], bmi: [18, 30], glucose: [5.0, 7.0], hba1c: [5.0, 5.8], creatinine: [60, 130], hemoglobin: [95, 135], los: [5, 21], readmit: 0.18, age: [65, 84] },
    { icd: 'M81', label: 'Osteoporosis without Fracture', meds: ['Alendronate 70mg weekly', 'Calcium/Vitamin D', 'Denosumab 60mg'], bp: [115, 140, 65, 85], bmi: [17, 27], glucose: [4.5, 5.5], hba1c: [4.8, 5.4], creatinine: [55, 100], hemoglobin: [110, 145], los: [1, 4], readmit: 0.06, age: [55, 84] },
    { icd: 'M54.5', label: 'Low Back Pain', meds: ['Ibuprofen 400mg', 'Cyclobenzaprine 10mg', 'Naproxen 250mg'], bp: [115, 140, 70, 88], bmi: [22, 36], glucose: [4.5, 5.5], hba1c: [4.8, 5.4], creatinine: [55, 100], hemoglobin: [120, 158], los: [1, 5], readmit: 0.10, age: [25, 75] },
    { icd: 'M10', label: 'Gout', meds: ['Colchicine 0.6mg', 'Allopurinol 300mg', 'Indomethacin 50mg'], bp: [125, 155, 78, 95], bmi: [26, 38], glucose: [5.0, 6.5], hba1c: [5.0, 5.8], creatinine: [80, 140], hemoglobin: [125, 160], los: [1, 5], readmit: 0.12, age: [35, 75] },
  ],
  renal: [
    { icd: 'N18.3', label: 'Chronic Kidney Disease, Stage 3', meds: ['Losartan 50mg', 'Sodium Bicarbonate 650mg', 'Epoetin Alfa'], bp: [135, 165, 80, 100], bmi: [24, 36], glucose: [5.0, 7.0], hba1c: [5.0, 6.5], creatinine: [130, 250], hemoglobin: [90, 125], los: [3, 10], readmit: 0.22, age: [50, 84] },
    { icd: 'N39.0', label: 'Urinary Tract Infection', meds: ['Nitrofurantoin 100mg', 'Ciprofloxacin 500mg', 'Trimethoprim/Sulfamethoxazole'], bp: [110, 145, 65, 90], bmi: [20, 34], glucose: [5.0, 7.5], hba1c: [5.0, 6.0], creatinine: [60, 130], hemoglobin: [105, 145], los: [2, 7], readmit: 0.15, age: [25, 84] },
  ],
  oncology: [
    { icd: 'C50', label: 'Malignant Neoplasm of Breast', meds: ['Tamoxifen 20mg', 'Letrozole 2.5mg', 'Paclitaxel IV'], bp: [105, 135, 62, 82], bmi: [20, 35], glucose: [4.5, 6.5], hba1c: [4.8, 5.8], creatinine: [55, 100], hemoglobin: [90, 130], los: [2, 10], readmit: 0.20, age: [35, 80] },
    { icd: 'C34', label: 'Malignant Neoplasm of Bronchus/Lung', meds: ['Carboplatin IV', 'Pembrolizumab IV', 'Morphine SR 15mg'], bp: [100, 140, 60, 85], bmi: [17, 30], glucose: [5.0, 7.0], hba1c: [5.0, 6.0], creatinine: [60, 120], hemoglobin: [85, 125], los: [4, 18], readmit: 0.28, age: [45, 84] },
    { icd: 'C18', label: 'Malignant Neoplasm of Colon', meds: ['Capecitabine 500mg', 'Oxaliplatin IV', 'Ondansetron 8mg'], bp: [105, 140, 62, 85], bmi: [20, 34], glucose: [4.8, 6.5], hba1c: [4.8, 5.8], creatinine: [55, 110], hemoglobin: [85, 130], los: [4, 14], readmit: 0.22, age: [40, 84] },
    { icd: 'C61', label: 'Malignant Neoplasm of Prostate', meds: ['Leuprolide 7.5mg IM', 'Enzalutamide 160mg', 'Bicalutamide 50mg'], bp: [115, 145, 68, 90], bmi: [22, 34], glucose: [4.8, 6.0], hba1c: [4.8, 5.8], creatinine: [65, 120], hemoglobin: [100, 145], los: [2, 8], readmit: 0.15, age: [55, 84] },
  ],
  neurological: [
    { icd: 'G30', label: "Alzheimer's Disease", meds: ['Donepezil 10mg', 'Memantine 10mg', 'Rivastigmine Patch 9.5mg'], bp: [110, 145, 65, 85], bmi: [18, 28], glucose: [4.5, 5.8], hba1c: [4.8, 5.5], creatinine: [55, 100], hemoglobin: [110, 148], los: [5, 21], readmit: 0.25, age: [65, 84] },
    { icd: 'G40', label: 'Epilepsy', meds: ['Levetiracetam 500mg', 'Valproate 500mg', 'Lamotrigine 100mg'], bp: [108, 130, 65, 82], bmi: [20, 32], glucose: [4.3, 5.5], hba1c: [4.6, 5.4], creatinine: [55, 95], hemoglobin: [118, 155], los: [2, 8], readmit: 0.16, age: [18, 75] },
    { icd: 'G20', label: "Parkinson's Disease", meds: ['Levodopa/Carbidopa 100/25mg', 'Pramipexole 0.5mg', 'Rasagiline 1mg'], bp: [95, 135, 55, 80], bmi: [19, 28], glucose: [4.5, 5.6], hba1c: [4.7, 5.4], creatinine: [55, 100], hemoglobin: [110, 148], los: [3, 14], readmit: 0.20, age: [55, 84] },
  ],
  gastrointestinal: [
    { icd: 'K21', label: 'Gastro-oesophageal Reflux Disease', meds: ['Omeprazole 20mg', 'Pantoprazole 40mg', 'Esomeprazole 40mg'], bp: [110, 135, 65, 85], bmi: [24, 36], glucose: [4.5, 5.8], hba1c: [4.8, 5.5], creatinine: [55, 95], hemoglobin: [118, 155], los: [1, 4], readmit: 0.08, age: [25, 75] },
    { icd: 'K50', label: "Crohn's Disease", meds: ['Mesalamine 1g', 'Infliximab IV', 'Azathioprine 50mg'], bp: [105, 130, 62, 80], bmi: [18, 28], glucose: [4.3, 5.5], hba1c: [4.6, 5.4], creatinine: [50, 90], hemoglobin: [95, 135], los: [3, 14], readmit: 0.22, age: [18, 65] },
    { icd: 'K74', label: 'Hepatic Fibrosis and Cirrhosis', meds: ['Spironolactone 100mg', 'Lactulose 30mL', 'Propranolol 40mg'], bp: [95, 125, 55, 75], bmi: [22, 32], glucose: [4.0, 8.0], hba1c: [4.5, 6.5], creatinine: [60, 180], hemoglobin: [80, 125], los: [4, 18], readmit: 0.30, age: [40, 75] },
  ],
  endocrine: [
    { icd: 'E03', label: 'Hypothyroidism', meds: ['Levothyroxine 75mcg', 'Levothyroxine 100mcg', 'Levothyroxine 50mcg'], bp: [105, 135, 65, 85], bmi: [24, 36], glucose: [4.5, 5.8], hba1c: [4.8, 5.5], creatinine: [55, 95], hemoglobin: [105, 145], los: [1, 5], readmit: 0.08, age: [30, 80] },
    { icd: 'E05', label: 'Thyrotoxicosis', meds: ['Methimazole 10mg', 'Propranolol 40mg', 'Propylthiouracil 100mg'], bp: [120, 155, 70, 95], bmi: [17, 26], glucose: [5.0, 7.0], hba1c: [5.0, 6.0], creatinine: [50, 90], hemoglobin: [115, 155], los: [2, 7], readmit: 0.10, age: [25, 70] },
  ],
};

const ALL_CONDITIONS = Object.values(CONDITIONS).flat();
const PROVINCE_CODES = Object.keys(PROVINCES);

let idCounter = 0;

function randomFloat(min, max, decimals = 1) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function makeUniqueId() {
  idCounter++;
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(2).toString('hex');
  return `SYN-CA-${timestamp}-${random}`.toUpperCase();
}

function generateAdmissionDate() {
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const admitMs = oneYearAgo + Math.random() * (now - oneYearAgo);
  return new Date(admitMs);
}

export function generateRecord({ province, conditionCategory } = {}) {
  const pvCode = (province && province !== 'random')
    ? province
    : weightedRandom(PROVINCE_CODES.map(c => ({ code: c, weight: PROVINCES[c].weight }))).code;

  const pool = (conditionCategory && conditionCategory !== 'random' && CONDITIONS[conditionCategory])
    ? CONDITIONS[conditionCategory]
    : ALL_CONDITIONS;

  const cond = pool[Math.floor(Math.random() * pool.length)];

  const ageMin = cond.age[0];
  const ageMax = cond.age[1];
  const age = randomInt(ageMin, ageMax);
  const sex = Math.random() > 0.48 ? 'Female' : 'Male';

  const bmi = randomFloat(cond.bmi[0], cond.bmi[1]);
  const bpSystolic = randomInt(cond.bp[0], cond.bp[1]);
  const bpDiastolic = randomInt(cond.bp[2], cond.bp[3]);
  const glucose = randomFloat(cond.glucose[0], cond.glucose[1]);
  const hba1c = randomFloat(cond.hba1c[0], cond.hba1c[1]);

  let creatinine = randomFloat(cond.creatinine[0], cond.creatinine[1], 0);
  if (age > 70) creatinine = Math.round(creatinine * randomFloat(1.05, 1.25));
  if (sex === 'Female') creatinine = Math.round(creatinine * randomFloat(0.8, 0.95));

  let hemoglobin = randomFloat(cond.hemoglobin[0], cond.hemoglobin[1], 0);
  if (sex === 'Female') hemoglobin = Math.round(hemoglobin * randomFloat(0.88, 0.96));
  if (age > 75) hemoglobin = Math.round(hemoglobin * randomFloat(0.92, 0.98));

  const los = randomInt(cond.los[0], cond.los[1]);
  const readmit = Math.random() < cond.readmit;

  const medication = cond.meds[Math.floor(Math.random() * cond.meds.length)];
  const ethnicity = weightedRandom(ETHNICITIES).label;

  const admissionDate = generateAdmissionDate();
  const dischargeDate = new Date(admissionDate.getTime() + los * 24 * 60 * 60 * 1000);

  const possibleSecondary = ALL_CONDITIONS.filter(c => c.icd !== cond.icd);
  const hasSecondary = Math.random() < 0.45;
  const secondary = hasSecondary
    ? possibleSecondary[Math.floor(Math.random() * possibleSecondary.length)]
    : null;

  return {
    patient_id: makeUniqueId(),
    age,
    sex,
    ethnicity,
    province_code: pvCode,
    province: PROVINCES[pvCode].name,
    icd10_primary: cond.icd,
    diagnosis_label: cond.label,
    secondary_diagnosis: secondary ? `${secondary.icd} ${secondary.label}` : null,
    medication,
    bmi,
    bp_systolic_mmhg: bpSystolic,
    bp_diastolic_mmhg: bpDiastolic,
    glucose_mmol: glucose,
    hba1c_pct: hba1c,
    creatinine_umol: creatinine,
    hemoglobin_g_l: hemoglobin,
    los_days: los,
    admission_date: admissionDate.toISOString().split('T')[0],
    discharge_date: dischargeDate.toISOString().split('T')[0],
    readmit_30d: readmit,
    synthetic: true,
  };
}

export function getConditionCategories() {
  return Object.keys(CONDITIONS);
}

export function getProvinceCodes() {
  return PROVINCE_CODES;
}

export { CONDITIONS, PROVINCES };
