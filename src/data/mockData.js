export const SYMPTOM_CATEGORIES = [
  { id: 'pain',         label: 'Pain',                 icon: '⚡', color: '#ef4444', types: ['Sharp', 'Dull', 'Throbbing', 'Burning', 'Stabbing', 'Aching'] },
  { id: 'fatigue',      label: 'Fatigue / Weakness',   icon: '😴', color: '#f59e0b', types: ['General fatigue', 'Muscle weakness', 'Dizziness', 'Low energy'] },
  { id: 'swelling',     label: 'Swelling / Inflammation', icon: '🔴', color: '#f97316', types: ['Swelling', 'Redness', 'Warmth', 'Tenderness'] },
  { id: 'skin',         label: 'Skin Issues',           icon: '🌿', color: '#84cc16', types: ['Rash', 'Irritation', 'Dry skin', 'Itching', 'Bruising'] },
  { id: 'respiratory',  label: 'Respiratory',           icon: '🫁', color: '#06b6d4', types: ['Shortness of breath', 'Cough', 'Wheezing', 'Chest tightness'] },
  { id: 'digestive',    label: 'Digestive',             icon: '🫃', color: '#8b5cf6', types: ['Nausea', 'Stomach pain', 'Bloating', 'Cramps', 'Indigestion'] },
  { id: 'neurological', label: 'Neurological',          icon: '🧠', color: '#ec4899', types: ['Headache', 'Dizziness', 'Numbness', 'Tingling', 'Blurred vision'] },
  { id: 'other',        label: 'Other',                 icon: '📝', color: '#6b7280', types: ['Custom'] },
]

export const CHRONIC_CONDITION_PRESETS = [
  { name: 'Asthma',             icon: '🫁', category: 'respiratory',  icd: 'J45' },
  { name: 'Hypertension',       icon: '❤️', category: 'cardiovascular', icd: 'I10' },
  { name: 'Type 2 Diabetes',    icon: '🩸', category: 'endocrine',    icd: 'E11' },
  { name: 'Type 1 Diabetes',    icon: '🩸', category: 'endocrine',    icd: 'E10' },
  { name: 'COPD',               icon: '🌬️', category: 'respiratory',  icd: 'J44' },
  { name: 'Atrial Fibrillation',icon: '💓', category: 'cardiovascular', icd: 'I48' },
  { name: 'Epilepsy',           icon: '🧠', category: 'neurological', icd: 'G40' },
  { name: 'Depression',         icon: '🌧️', category: 'mental',       icd: 'F32' },
  { name: 'Anxiety Disorder',   icon: '😰', category: 'mental',       icd: 'F41' },
  { name: 'Rheumatoid Arthritis',icon:'🦴', category: 'musculoskeletal', icd: 'M05' },
  { name: 'Chronic Migraine',   icon: '🤕', category: 'neurological', icd: 'G43' },
  { name: 'Hypothyroidism',     icon: '🦋', category: 'endocrine',    icd: 'E03' },
  { name: 'Crohn\'s Disease',   icon: '🫁', category: 'digestive',    icd: 'K50' },
  { name: 'Multiple Sclerosis', icon: '🧬', category: 'neurological', icd: 'G35' },
  { name: 'Heart Failure',      icon: '💔', category: 'cardiovascular', icd: 'I50' },
]

export const BODY_REGIONS = [
  { id: 'head',            label: 'Head',            position: [0, 0.87, 0] },
  { id: 'neck',            label: 'Neck',            position: [0, 0.67, 0] },
  { id: 'chest',           label: 'Chest',           position: [0, 0.42, 0] },
  { id: 'abdomen',         label: 'Abdomen',         position: [0, 0.12, 0] },
  { id: 'pelvis',          label: 'Pelvis / Groin',  position: [0, -0.1, 0] },
  { id: 'left-shoulder',   label: 'Left Shoulder',   position: [-0.28, 0.52, 0] },
  { id: 'right-shoulder',  label: 'Right Shoulder',  position: [0.28, 0.52, 0] },
  { id: 'left-upper-arm',  label: 'Left Upper Arm',  position: [-0.34, 0.27, 0] },
  { id: 'right-upper-arm', label: 'Right Upper Arm', position: [0.34, 0.27, 0] },
  { id: 'left-elbow',      label: 'Left Elbow',      position: [-0.37, 0.08, 0] },
  { id: 'right-elbow',     label: 'Right Elbow',     position: [0.37, 0.08, 0] },
  { id: 'left-lower-arm',  label: 'Left Forearm',    position: [-0.38, -0.12, 0] },
  { id: 'right-lower-arm', label: 'Right Forearm',   position: [0.38, -0.12, 0] },
  { id: 'left-hand',       label: 'Left Hand',       position: [-0.39, -0.3, 0] },
  { id: 'right-hand',      label: 'Right Hand',      position: [0.39, -0.3, 0] },
  { id: 'left-thigh',      label: 'Left Thigh',      position: [-0.14, -0.35, 0] },
  { id: 'right-thigh',     label: 'Right Thigh',     position: [0.14, -0.35, 0] },
  { id: 'left-knee',       label: 'Left Knee',       position: [-0.14, -0.57, 0] },
  { id: 'right-knee',      label: 'Right Knee',      position: [0.14, -0.57, 0] },
  { id: 'left-shin',       label: 'Left Shin',       position: [-0.14, -0.74, 0] },
  { id: 'right-shin',      label: 'Right Shin',      position: [0.14, -0.74, 0] },
  { id: 'left-foot',       label: 'Left Foot',       position: [-0.14, -0.92, 0] },
  { id: 'right-foot',      label: 'Right Foot',      position: [0.14, -0.92, 0] },
]

// Pre-seeded user accounts — used for UID-based family search demo
export const DEMO_USERS = [
  { id: 'usr-demo-1',   email: 'olga@demo.com',  password: 'demo123', name: 'Olga Morgan',    role: 'user',   familyId: 'fam-demo',    uid: '847.392.015' },
  { id: 'usr-demo-2',   email: 'james@demo.com', password: 'demo123', name: 'James Morgan',   role: 'user',   familyId: 'fam-demo',    uid: '523.167.840' },
  { id: 'usr-demo-3',   email: 'lily@demo.com',  password: 'demo123', name: 'Lily Morgan',    role: 'user',   familyId: 'fam-demo',    uid: '391.028.774' },
  { id: 'usr-demo-doc', email: 'dr@demo.com',    password: 'demo123', name: 'Dr. Sarah Chen', role: 'doctor', familyId: 'fam-doc',     uid: '991.444.267' },
  { id: 'usr-demo-4',   email: 'alex@demo.com',  password: 'demo123', name: 'Alex Rivera',    role: 'user',   familyId: 'fam-rivera',  uid: '264.851.093' },
  { id: 'usr-demo-5',   email: 'priya@demo.com', password: 'demo123', name: 'Priya Sharma',   role: 'user',   familyId: 'fam-sharma',  uid: '738.294.561' },
]

// Pre-seeded incoming connection requests (targeting Olga, usr-demo-1)
export const DEMO_FAMILY_REQUESTS = [
  {
    id:           'req-demo-1',
    fromUserId:   'usr-demo-4',
    fromUserName: 'Alex Rivera',
    fromUserUid:  '264.851.093',
    fromFamilyId: 'fam-rivera',
    toUserId:     'usr-demo-1',
    toUserName:   'Olga Morgan',
    relationship: 'Friend',
    status:       'pending',
    timestamp:    new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id:           'req-demo-2',
    fromUserId:   'usr-demo-5',
    fromUserName: 'Priya Sharma',
    fromUserUid:  '738.294.561',
    fromFamilyId: 'fam-sharma',
    toUserId:     'usr-demo-1',
    toUserName:   'Olga Morgan',
    relationship: 'Carer',
    status:       'pending',
    timestamp:    new Date(Date.now() - 28 * 3600000).toISOString(),
  },
]

export const DEMO_FAMILY = { id: 'fam-demo', name: 'Morgan Family' }

export const DEMO_MEMBERS = [
  { id: 'mem-1', familyId: 'fam-demo', userId: 'usr-demo-1', name: 'Olga Morgan',  age: 34, gender: 'female', relationship: 'Self',     avatar: 'OM', avatarColor: '#6366f1' },
  { id: 'mem-2', familyId: 'fam-demo', userId: 'usr-demo-2', name: 'James Morgan', age: 37, gender: 'male',   relationship: 'Partner',  avatar: 'JM', avatarColor: '#0891b2' },
  { id: 'mem-3', familyId: 'fam-demo', userId: 'usr-demo-3', name: 'Lily Morgan',  age: 9,  gender: 'female', relationship: 'Daughter', avatar: 'LM', avatarColor: '#ec4899' },
]

export const DEMO_SYMPTOMS = [
  {
    id: 'sym-1', memberId: 'mem-1', bodyRegion: 'head', bodyLabel: 'Head',
    category: 'neurological', categoryLabel: 'Neurological', type: 'Headache',
    severity: 6, duration: '2 days', notes: 'Worse in the morning, better after coffee.',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), resolved: false,
  },
  {
    id: 'sym-2', memberId: 'mem-1', bodyRegion: 'left-knee', bodyLabel: 'Left Knee',
    category: 'pain', categoryLabel: 'Pain', type: 'Sharp',
    severity: 4, duration: '1 week', notes: 'Pain when going up stairs.',
    timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), resolved: false,
  },
  {
    id: 'sym-3', memberId: 'mem-2', bodyRegion: 'chest', bodyLabel: 'Chest',
    category: 'respiratory', categoryLabel: 'Respiratory', type: 'Chest tightness',
    severity: 7, duration: '3 days', notes: 'Occurs after exercise.',
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), resolved: false,
  },
  {
    id: 'sym-4', memberId: 'mem-1', bodyRegion: 'chest', bodyLabel: 'Right Chest',
    category: 'respiratory', categoryLabel: 'Respiratory', type: 'Wheezing',
    severity: 5, duration: 'A few hours', notes: 'Triggered by cold air outside.',
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), resolved: true,
  },
  {
    id: 'sym-5', memberId: 'mem-2', bodyRegion: 'head', bodyLabel: 'Forehead',
    category: 'pain', categoryLabel: 'Pain', type: 'Throbbing',
    severity: 5, duration: '1 day', notes: 'Likely tension headache.',
    timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), resolved: true,
  },
]

export const DEMO_CHECKINS = [
  { id: 'ci-1', memberId: 'mem-1', date: new Date(Date.now()).toISOString(),               feeling: 'good',    notes: 'Feeling mostly okay today.' },
  { id: 'ci-2', memberId: 'mem-1', date: new Date(Date.now() - 1 * 86400000).toISOString(), feeling: 'okay',    notes: 'Headache still there.' },
  { id: 'ci-3', memberId: 'mem-1', date: new Date(Date.now() - 2 * 86400000).toISOString(), feeling: 'bad',     notes: 'Really struggling with the headache.' },
  { id: 'ci-4', memberId: 'mem-1', date: new Date(Date.now() - 3 * 86400000).toISOString(), feeling: 'okay',    notes: '' },
  { id: 'ci-5', memberId: 'mem-1', date: new Date(Date.now() - 4 * 86400000).toISOString(), feeling: 'great',   notes: 'Best day this week!' },
  { id: 'ci-6', memberId: 'mem-1', date: new Date(Date.now() - 5 * 86400000).toISOString(), feeling: 'good',    notes: '' },
  { id: 'ci-7', memberId: 'mem-1', date: new Date(Date.now() - 6 * 86400000).toISOString(), feeling: 'okay',    notes: 'Knee acting up.' },
  { id: 'ci-8', memberId: 'mem-2', date: new Date(Date.now() - 1 * 86400000).toISOString(), feeling: 'bad',     notes: 'Chest tightness bad today.' },
  { id: 'ci-9', memberId: 'mem-2', date: new Date(Date.now() - 2 * 86400000).toISOString(), feeling: 'okay',    notes: '' },
]

export const DEMO_DOCUMENTS = [
  {
    id: 'doc-demo-1', memberId: 'mem-1', name: 'CBC Blood Test Results',
    docType: 'lab', notes: 'WBC slightly elevated — follow up recommended.',
    uploadedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    fileUrl: '/samples/blood-test-cbc.svg',
  },
  {
    id: 'doc-demo-2', memberId: 'mem-1', name: 'Prescription — Salbutamol & Fluticasone',
    docType: 'prescription', notes: 'Asthma management. Issued by Dr. Sarah Chen.',
    uploadedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    fileUrl: '/samples/prescription-salbutamol.svg',
  },
  {
    id: 'doc-demo-3', memberId: 'mem-2', name: 'ABPM — Blood Pressure Monitoring',
    docType: 'lab', notes: 'Grade 2 hypertension confirmed. Starting Amlodipine.',
    uploadedAt: new Date(Date.now() - 42 * 86400000).toISOString(),
    fileUrl: '/samples/bp-monitoring-report.svg',
  },
  {
    id: 'doc-demo-4', memberId: 'mem-2', name: 'Chest X-Ray Report (PA + Lateral)',
    docType: 'imaging', notes: 'Mild cardiomegaly. Echo requested.',
    uploadedAt: new Date(Date.now() - 49 * 86400000).toISOString(),
    fileUrl: '/samples/chest-xray-report.svg',
  },
]

// ── Phase 2: Chronic conditions ───────────────────────────────────────────────
export const DEMO_CONDITIONS = [
  {
    id: 'cond-1', memberId: 'mem-1', name: 'Asthma', icon: '🫁',
    icd: 'J45', diagnosedDate: '2019-03-01',
    severity: 'moderate', linkedCategories: ['respiratory'],
    notes: 'Triggered by cold air, exercise, and dust. Managed with Salbutamol + Fluticasone.',
  },
  {
    id: 'cond-2', memberId: 'mem-2', name: 'Hypertension', icon: '❤️',
    icd: 'I10', diagnosedDate: '2022-07-15',
    severity: 'moderate', linkedCategories: ['pain', 'neurological'],
    notes: 'Grade 2, confirmed via ABPM March 2025. On Amlodipine 5mg.',
  },
]

export const DEMO_MEDICATIONS = [
  { id: 'med-1', memberId: 'mem-1', name: 'Salbutamol (Ventolin)', dosage: '100mcg', frequency: 'As needed (PRN)', conditionId: 'cond-1' },
  { id: 'med-2', memberId: 'mem-1', name: 'Fluticasone (Flixotide)', dosage: '250mcg', frequency: 'Twice daily', conditionId: 'cond-1' },
  { id: 'med-3', memberId: 'mem-2', name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily (morning)', conditionId: 'cond-2' },
]

// ── Phase 2: Risk profiles ────────────────────────────────────────────────────
export const DEMO_RISK_PROFILES = [
  {
    memberId: 'mem-1',
    riskLevel: 'high',           // normal | high | critical
    mandatoryCheckIn: true,
    escalationMins: 30,          // minutes after missed check-in before escalation
    assignedDoctorId: 'doc-demo',
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    memberId: 'mem-2',
    riskLevel: 'normal',
    mandatoryCheckIn: false,
    escalationMins: 60,
    assignedDoctorId: 'doc-demo',
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
]

export const ACTIVITY_DATA = [
  { day: 'Sun', steps: 6200,  calories: 1800 },
  { day: 'Mon', steps: 8900,  calories: 2100 },
  { day: 'Tue', steps: 7400,  calories: 1950 },
  { day: 'Wed', steps: 13000, calories: 2300 },
  { day: 'Thu', steps: 9500,  calories: 2050 },
  { day: 'Fri', steps: 11200, calories: 2180 },
  { day: 'Sat', steps: 10781, calories: 2120 },
]

export const HEART_RATE_DATA = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  bpm: 65 + Math.round(Math.sin(i * 0.7) * 18 + Math.random() * 10),
  high: 95 + Math.round(Math.random() * 20),
  low:  58 + Math.round(Math.random() * 8),
}))

export const FEELING_CONFIG = {
  great:    { label: 'Great',    emoji: '😄', color: '#10b981', bg: '#d1fae5' },
  good:     { label: 'Good',     emoji: '🙂', color: '#6366f1', bg: '#e0e7ff' },
  okay:     { label: 'Okay',     emoji: '😐', color: '#f59e0b', bg: '#fef3c7' },
  bad:      { label: 'Bad',      emoji: '😔', color: '#f97316', bg: '#ffedd5' },
  terrible: { label: 'Terrible', emoji: '😣', color: '#ef4444', bg: '#fee2e2' },
}
