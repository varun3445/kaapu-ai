/**
 * MockAppContext — drop-in replacement for src/context/AppContext.jsx in Storybook.
 * Exports the same { AppProvider, useApp } interface but uses static demo data.
 * No Supabase, no network calls, no Capacitor.
 */
import { createContext, useContext } from 'react'

// ── Demo data ─────────────────────────────────────────────────────────────────

const MOCK_MEMBER = {
  id: 'member-1',
  name: 'Olga Morgan',
  avatar: 'OM',
  avatarColor: '#6366f1',
  age: 34,
  gender: 'female',
  relationship: 'Self',
  bloodType: 'A+',
  height: 168,
  weight: 62,
}

const MOCK_USER = {
  id: 'usr-demo-1',
  email: 'olga@demo.com',
  name: 'Olga Morgan',
  role: 'user',
  familyId: 'fam-demo',
  uid: '847.392.015',
  emergencyContacts: [{ name: 'James Morgan', phone: '+1 555 0100', relationship: 'Spouse' }],
}

const MOCK_CONDITIONS = [
  {
    id: 'cond-1',
    name: 'Asthma',
    icon: '🫁',
    severity: 'moderate',
    icd: 'J45',
    diagnosedDate: '2018-03-15',
    linkedCategories: ['respiratory'],
    notes: 'Managed with inhaler. Worsens in cold weather.',
  },
  {
    id: 'cond-2',
    name: 'Chronic Migraine',
    icon: '🤕',
    severity: 'severe',
    icd: 'G43',
    diagnosedDate: '2020-07-01',
    linkedCategories: ['neurological', 'pain'],
    notes: 'Triggered by stress and screen time.',
  },
]

const MOCK_MEDICATIONS = [
  { id: 'med-1', conditionId: 'cond-1', name: 'Salbutamol', dosage: '100mcg', frequency: 'As needed', memberId: 'member-1' },
  { id: 'med-2', conditionId: 'cond-2', name: 'Sumatriptan', dosage: '50mg', frequency: 'As needed', memberId: 'member-1' },
]

const MOCK_SYMPTOMS = [
  {
    id: 'sym-1', bodyLabel: 'Head', bodyRegion: 'head', type: 'Headache',
    category: 'neurological', severity: 7, duration: '2–3 days',
    resolved: false, timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), memberId: 'member-1',
  },
  {
    id: 'sym-2', bodyLabel: 'Chest', bodyRegion: 'chest', type: 'Chest tightness',
    category: 'respiratory', severity: 4, duration: '1 day',
    resolved: false, timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), memberId: 'member-1',
  },
]

const MOCK_CHECKINS = [
  { id: 'ci-1', feeling: 'okay', energy: 3, date: new Date().toISOString(), memberId: 'member-1' },
]

const MOCK_FAMILY_MEMBERS = [
  MOCK_MEMBER,
  { id: 'member-2', name: 'James Morgan', avatar: 'JM', avatarColor: '#10b981', age: 36, gender: 'male', relationship: 'Spouse' },
]

const MOCK_NOTIFICATIONS = [
  { id: 'notif-1', title: 'Check-in reminder', body: "Don't forget your daily check-in!", timestamp: new Date().toISOString(), forUserId: 'usr-demo-1' },
]

const MOCK_RISK_PROFILE = { memberId: 'member-1', riskLevel: 'moderate', score: 42 }

// ── Context ───────────────────────────────────────────────────────────────────

export const AppContext = createContext(null)

const noop = () => {}
const asyncNoop = async () => {}

const MOCK_VALUE = {
  appLoading: false,
  isDemoMode: true,

  currentUser: MOCK_USER,
  login: asyncNoop, signup: asyncNoop, logout: asyncNoop,
  signInWithOAuth: asyncNoop, updateProfile: asyncNoop,

  currentMember: MOCK_MEMBER,
  myFamilyMembers: MOCK_FAMILY_MEMBERS,
  members: MOCK_FAMILY_MEMBERS,
  addMember: asyncNoop, removeMember: asyncNoop, switchMember: noop,

  familyRequests: [],
  sendFamilyRequest: asyncNoop, respondFamilyRequest: asyncNoop,

  notifCentreOpen: false,
  setNotifCentreOpen: noop,

  currentSymptoms: MOCK_SYMPTOMS,
  currentCheckIns: MOCK_CHECKINS,
  currentDocuments: [],
  symptoms: MOCK_SYMPTOMS,
  checkIns: MOCK_CHECKINS,
  documents: [],
  families: [],

  addSymptom: asyncNoop, updateSymptom: asyncNoop,
  resolveSymptom: asyncNoop, deleteSymptom: asyncNoop,
  addCheckIn: asyncNoop, deleteCheckIn: asyncNoop,
  addDocument: asyncNoop, deleteDocument: asyncNoop,

  doctorPatients: [],
  addDoctorPatient: asyncNoop,

  notifications: MOCK_NOTIFICATIONS,
  dismissNotification: noop,
  pushNotif: noop,

  skinColor: '#c4a882',
  setSkinColor: noop,

  conditions: MOCK_CONDITIONS,
  currentConditions: MOCK_CONDITIONS,
  addCondition: asyncNoop, removeCondition: asyncNoop,

  medications: MOCK_MEDICATIONS,
  currentMedications: MOCK_MEDICATIONS,
  addMedication: asyncNoop, removeMedication: asyncNoop,

  riskProfiles: [MOCK_RISK_PROFILE],
  currentRiskProfile: MOCK_RISK_PROFILE,
  setRiskProfile: asyncNoop, getRiskProfile: asyncNoop,

  emergencyEvents: [],
  activeEmergency: null,
  triggerEmergency: asyncNoop, resolveEmergency: asyncNoop, generateHealthID: asyncNoop,

  isAdmin: false,
  sendBroadcast: asyncNoop,
}

export function AppProvider({ children }) {
  return <AppContext.Provider value={MOCK_VALUE}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
