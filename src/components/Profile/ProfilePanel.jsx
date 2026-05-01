import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, Bell, Shield, LogOut, ChevronRight, ChevronLeft,
  Copy, Check as CheckIcon, MapPin, Clock, PauseCircle,
  Eye, EyeOff, Users, BarChart2, Save, Phone, Trash2,
  Download, AlertTriangle, FileText,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Avatar } from '../Family/FamilySwitcher'
import { supabase } from '../../supabase'

// ── Skin tone helpers ─────────────────────────────────────────────────────────
const SKIN_TONES = [
  { id: 'tone-1', label: 'Cream',       hex: '#FCD7C1' },
  { id: 'tone-2', label: 'Light Beige', hex: '#E0B195' },
  { id: 'tone-3', label: 'Tan',         hex: '#C49272' },
  { id: 'tone-4', label: 'Warm Brown',  hex: '#906652' },
  { id: 'tone-5', label: 'Deep',        hex: '#604333' },
]

function skinGradient(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const ml = (ch) => Math.round(ch + (255 - ch) * 0.22)
  const sh = (ch, i) => Math.round(ch * (i === 2 ? 0.50 : 0.62))
  const midLight = `rgb(${ml(r)},${ml(g)},${ml(b)})`
  const base     = `rgb(${r},${g},${b})`
  const shadow   = `rgb(${sh(r,0)},${sh(g,1)},${sh(b,2)})`
  const specular = `radial-gradient(ellipse 52% 44% at 42% 28%, rgba(255,252,248,0.88) 0%, rgba(255,252,248,0) 55%)`
  const sphere   = `radial-gradient(ellipse at 44% 38%, ${midLight} 0%, ${base} 48%, ${shadow} 100%)`
  return `${specular}, ${sphere}`
}
function skinShadow(selected) {
  const ring = selected ? '0 0 0 2.5px #6366f1, 0 0 0 4.5px white, ' : ''
  return `${ring}0 4px 12px rgba(0,0,0,0.26), inset 0 1.5px 2px rgba(255,255,255,0.42), inset 0 -2px 5px rgba(0,0,0,0.20)`
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function SettingRow({ icon: Icon, label, sub, children, iconBg = 'bg-gray-100', iconColor = 'text-gray-500' }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={15} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="relative flex-shrink-0"
      style={{ height:26, width:46, borderRadius:13, background: value ? '#6366f1' : 'rgba(0,0,0,0.12)', transition:'background 0.22s ease', border:'none', padding:0, cursor:'pointer', boxShadow: value ? 'inset 0 1px 2px rgba(0,0,0,0.15)' : 'inset 0 1px 3px rgba(0,0,0,0.12)' }}>
      <motion.span layout animate={{ x: value ? 22 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
        style={{ position:'absolute', top:2, width:22, height:22, borderRadius:11, background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.22)', display:'block' }} />
    </button>
  )
}

function Input({ label, style: extraStyle, ...props }) {
  return (
    <div>
      {label && <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">{label}</label>}
      <input {...props}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none transition-all"
        style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)', ...extraStyle }} />
    </div>
  )
}

function BackHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-black/6 flex-shrink-0">
      <button onClick={onBack} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
        <ChevronLeft size={16} className="text-gray-600" />
      </button>
      <p className="text-sm font-extrabold text-gray-900">{title}</p>
    </div>
  )
}

function SaveButton({ saved, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${saved ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
      {saved ? <><CheckIcon size={15} /> Saved!</> : <><Save size={15} /> Save Changes</>}
    </button>
  )
}

// ── Sub-page: Notifications ───────────────────────────────────────────────────
function NotificationsPage({ onBack }) {
  const { currentUser, updateProfile } = useApp()
  const [checkInTime, setCheckInTime] = useState(currentUser?.checkInTime  || '08:00')
  const [paused,      setPaused]      = useState(currentUser?.checkInPaused || false)
  const [saved,       setSaved]       = useState(false)

  function save() {
    updateProfile({ checkInTime, checkInPaused: paused })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Notifications" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Daily Check-in</p>
          <div className="glass-card rounded-2xl px-4 divide-y divide-black/5">
            <SettingRow icon={Clock} label="Reminder Time" sub="Get a nudge to log your daily feeling" iconBg="bg-primary-50" iconColor="text-primary-500">
              <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)}
                className="text-xs font-bold text-primary-600 bg-primary-50 rounded-lg px-2 py-1 border-none outline-none cursor-pointer" />
            </SettingRow>
            <SettingRow icon={PauseCircle} label="Pause Check-ins" sub={paused ? 'Paused — reminders are off' : 'Useful when travelling or on a break'}
              iconBg={paused ? 'bg-amber-50' : 'bg-gray-100'} iconColor={paused ? 'text-amber-500' : 'text-gray-400'}>
              <Toggle value={paused} onChange={setPaused} />
            </SettingRow>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Alert Preferences</p>
          <div className="glass-card rounded-2xl px-4 divide-y divide-black/5">
            <SettingRow icon={Bell} label="Emergency Alerts" sub="Always on — cannot be disabled" iconBg="bg-rose-50" iconColor="text-rose-500">
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full">Always on</span>
            </SettingRow>
            <SettingRow icon={Bell} label="Health Reminders" sub="Medication and symptom logging reminders" iconBg="bg-blue-50" iconColor="text-blue-500">
              <Toggle value={!paused} onChange={v => setPaused(!v)} />
            </SettingRow>
          </div>
        </div>
        <SaveButton saved={saved} onClick={save} />
      </div>
    </div>
  )
}

// ── Sub-page: Privacy ─────────────────────────────────────────────────────────
function PrivacyPage({ onBack, onOpenPrivacy }) {
  const { currentUser, updateProfile } = useApp()
  const defaults = { familyVisible: true, doctorShare: true, analytics: false }
  const [priv, setPriv] = useState({ ...defaults, ...(currentUser?.privacySettings || {}) })
  const [saved, setSaved] = useState(false)
  const [downloading, setDownloading] = useState(false)

  function toggle(key) { setPriv(p => ({ ...p, [key]: !p[key] })) }
  function save() {
    updateProfile({ privacySettings: priv })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function downloadData() {
    if (!supabase || !currentUser) return
    setDownloading(true)
    try {
      const fid = currentUser.familyId
      const uid = currentUser.id
      const [
        { data: userData },
        { data: members },
        { data: symptoms },
        { data: checkIns },
        { data: conditions },
        { data: medications },
        { data: documents },
        { data: emergencyEvents },
        { data: riskProfiles },
        { data: familyRequests },
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', uid).single(),
        supabase.from('members').select('*').eq('familyId', fid),
        supabase.from('symptoms').select('*').eq('familyId', fid),
        supabase.from('checkIns').select('*').eq('familyId', fid),
        supabase.from('conditions').select('*').eq('familyId', fid),
        supabase.from('medications').select('*').eq('familyId', fid),
        supabase.from('documents').select('*').eq('familyId', fid),
        supabase.from('emergencyEvents').select('*').eq('familyId', fid),
        supabase.from('riskProfiles').select('*').eq('familyId', fid),
        supabase.from('familyRequests').select('*').or(`fromUserId.eq.${uid},toUserId.eq.${uid}`),
      ])
      const payload = {
        exportedAt: new Date().toISOString(),
        user: userData, members, symptoms, checkIns, conditions,
        medications, documents, emergencyEvents, riskProfiles, familyRequests,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `kaapu-data-${new Date().toISOString().slice(0,10)}.json`
      a.click(); URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Privacy & Sharing" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Data Access</p>
          <div className="glass-card rounded-2xl px-4 divide-y divide-black/5">
            <SettingRow icon={Users} label="Family Members" sub="Family can view your health entries" iconBg="bg-indigo-50" iconColor="text-indigo-500">
              <Toggle value={priv.familyVisible} onChange={() => toggle('familyVisible')} />
            </SettingRow>
            <SettingRow icon={Shield} label="Care Team" sub="Doctors can see your health timeline" iconBg="bg-primary-50" iconColor="text-primary-500">
              <Toggle value={priv.doctorShare} onChange={() => toggle('doctorShare')} />
            </SettingRow>
            <SettingRow icon={BarChart2} label="Anonymous Analytics" sub="Help improve Kaapu (no personal data)" iconBg="bg-gray-100" iconColor="text-gray-400">
              <Toggle value={priv.analytics} onChange={() => toggle('analytics')} />
            </SettingRow>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Data & Storage</p>
          <div className="glass-card rounded-2xl px-4 divide-y divide-black/5">
            <SettingRow icon={Eye} label="Profile Visibility" sub="Only visible to connected family" iconBg="bg-emerald-50" iconColor="text-emerald-500">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Private</span>
            </SettingRow>
            <SettingRow icon={EyeOff} label="Health ID Sharing" sub="Only visible when you share it manually" iconBg="bg-gray-100" iconColor="text-gray-400">
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Manual only</span>
            </SettingRow>
          </div>
        </div>
        <SaveButton saved={saved} onClick={save} />
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Your Data</p>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-black/5">
            <button onClick={onOpenPrivacy}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/60 transition-colors text-left">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 shadow-sm flex items-center justify-center">
                <FileText size={13} className="text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700">Privacy Policy</p>
                <p className="text-[10px] text-gray-400">How we collect and use your data</p>
              </div>
              <ChevronRight size={13} className="text-gray-300" />
            </button>
            <button onClick={downloadData} disabled={downloading}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/60 transition-colors text-left disabled:opacity-50">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 shadow-sm flex items-center justify-center">
                <Download size={13} className="text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700">Download My Data</p>
                <p className="text-[10px] text-gray-400">Export everything as JSON (GDPR Art. 20)</p>
              </div>
              {downloading && <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-page: Privacy Policy ──────────────────────────────────────────────────
function PrivacyPolicyPage({ onBack }) {
  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Privacy Policy" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs text-gray-600 leading-relaxed">
        <p className="text-[10px] text-gray-400">Last updated: April 2026</p>

        {[
          { title: 'Who we are', body: 'Kaapu is a personal and family health tracking application. When we say "we", "our", or "Kaapu", we mean the operator of this service. Your data is stored securely using Supabase, hosted in the EU.' },
          { title: 'What data we collect', body: 'We collect data you provide directly: your name, email address, age, gender, home location, health symptoms, check-ins, conditions, medications, emergency contacts, and documents you upload. We do not collect data passively beyond what is needed to operate the service.' },
          { title: 'Why we collect it (legal basis)', body: 'Health data is a "special category" under GDPR Article 9. We process it on the basis of your explicit consent, given at account creation. You may withdraw consent at any time by deleting your account.' },
          { title: 'How we use your data', body: 'Your data is used only to provide the Kaapu service to you and your connected family members. We do not sell, rent, or share your personal data with third parties for marketing purposes. Emergency contacts you provide may be displayed to family members during an SOS event.' },
          { title: 'Data retention', body: 'We retain your data for as long as your account is active. When you delete your account, all personal data is permanently erased from our systems within 30 days, including backups.' },
          { title: 'Your rights (GDPR)', body: 'You have the right to: access your data (Download my data), correct inaccurate data (edit your profile), erase your data (Delete my account), and data portability (your download is in JSON format). To exercise any right, use the controls in your Account settings or contact us.' },
          { title: 'Third-party services', body: 'We use Supabase for data storage (EU region, SOC 2 certified), and Google OAuth for sign-in. These providers process data only as instructed by us under data processing agreements.' },
          { title: 'Contact', body: 'For privacy enquiries or to exercise your rights, contact: info@ownflows.com' },
        ].map(({ title, body }) => (
          <div key={title}>
            <p className="text-xs font-extrabold text-gray-800 mb-1">{title}</p>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sub-page: Account ─────────────────────────────────────────────────────────
function AccountPage({ onBack }) {
  const { currentUser, updateProfile, logout } = useApp()
  const [name,         setName]         = useState(currentUser?.name          || '')
  const [age,          setAge]          = useState(currentUser?.age?.toString() || '')
  const [gender,       setGender]       = useState(currentUser?.gender        || 'other')
  const [email,        setEmail]        = useState(currentUser?.email         || '')
  const [homeLocation, setHomeLocation] = useState(currentUser?.homeLocation  || '')
  const [saved,        setSaved]        = useState(false)
  const [deleteStep,   setDeleteStep]   = useState(0)
  const [deleteInput,  setDeleteInput]  = useState('')

  async function save() {
    await updateProfile({
      name:         name.trim()  || currentUser?.name,
      age:          age ? parseInt(age) : null,
      gender,
      email:        email.trim() || currentUser?.email,
      homeLocation: homeLocation.trim(),
    })
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function deleteAccount() {
    if (!supabase) return
    setDeleteStep(2)
    try {
      await supabase.rpc('delete_own_account')
      logout()
    } catch (e) {
      console.error('[deleteAccount]', e)
      setDeleteStep(1)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Account" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Personal details */}
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Personal Details</p>
          <div className="space-y-3">
            <Input label="Full Name" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Age" type="number" placeholder="30" min={1} max={120} value={age} onChange={e => setAge(e.target.value)} />
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none transition-all capitalize"
                  style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
          <Input label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Location</p>
          <Input label="Home Location" type="text" placeholder="e.g. London, UK" value={homeLocation} onChange={e => setHomeLocation(e.target.value)} />
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">Used for location-based check-in reminders.</p>
        </div>

        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Health ID</p>
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 mb-0.5">Your unique identifier</p>
              <p className="text-sm font-bold font-mono text-gray-800 tracking-widest">{currentUser?.uid || '—'}</p>
            </div>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Read-only</span>
          </div>
        </div>

        <SaveButton saved={saved} onClick={save} />

        {/* Delete account */}
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Danger Zone</p>
          <div className="glass-card rounded-2xl p-4 border border-rose-100">
            {deleteStep === 0 && (
              <button onClick={() => setDeleteStep(1)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors border border-rose-200">
                <Trash2 size={14} /> Delete My Account
              </button>
            )}

            {deleteStep === 1 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-800">This cannot be undone</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">All your health data, symptoms, check-ins, and account will be permanently deleted.</p>
                  </div>
                </div>
                <Input
                  placeholder='Type DELETE to confirm'
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  style={{ border: '1.5px solid #fca5a5' }}
                />
                <div className="flex gap-2">
                  <button onClick={() => { setDeleteStep(0); setDeleteInput('') }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={deleteAccount}
                    disabled={deleteInput !== 'DELETE'}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-40 hover:bg-rose-700 transition-colors disabled:cursor-not-allowed">
                    Delete Forever
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div className="flex items-center justify-center gap-2 py-3 text-rose-500 text-xs font-semibold">
                <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                Deleting your account…
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Sub-page: Emergency Contacts ──────────────────────────────────────────────
const EMPTY_CONTACT = { name: '', phone: '', relationship: '' }
const REL_OPTIONS   = ['Partner', 'Parent', 'Sibling', 'Friend', 'Doctor', 'Other']

function EmergencyContactsPage({ onBack }) {
  const { currentUser, updateProfile } = useApp()

  const existing = (currentUser?.emergencyContacts || []).slice(0, 3)
  const padded   = [...existing, EMPTY_CONTACT, EMPTY_CONTACT, EMPTY_CONTACT].slice(0, 3)

  const [contacts, setContacts] = useState(padded.map(c => ({ ...EMPTY_CONTACT, ...c })))
  const [saved, setSaved]       = useState(false)
  const [errors, setErrors]     = useState([false, false, false])

  function update(idx, field, val) {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c))
    // Clear error for this slot when user starts typing the name
    if (field === 'name' && val.trim()) {
      setErrors(prev => prev.map((e, i) => i === idx ? false : e))
    }
  }

  function clear(idx) {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...EMPTY_CONTACT } : c))
  }

  async function save() {
    // Primary (idx 0) and Secondary (idx 1) are required
    const newErrors = [
      !contacts[0].name.trim(),
      !contacts[1].name.trim(),
      false,
    ]
    if (newErrors[0] || newErrors[1]) {
      setErrors(newErrors)
      return
    }
    setErrors([false, false, false])
    const filled = contacts.filter(c => c.name.trim() || c.phone.trim())
    await updateProfile({ emergencyContacts: filled })
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const slotLabels = ['Primary Contact', 'Secondary Contact', 'Tertiary Contact']
  const slotColors = [
    { bg: 'bg-rose-50',    icon: 'text-rose-500',    ring: 'border-rose-200'    },
    { bg: 'bg-amber-50',   icon: 'text-amber-500',   ring: 'border-amber-200'   },
    { bg: 'bg-primary-50', icon: 'text-primary-500', ring: 'border-primary-200' },
  ]

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Emergency Contacts" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        <p className="text-[11px] text-gray-400 leading-relaxed">
          These people will be shown in the emergency alert modal when you trigger an SOS. Up to 3 contacts.
        </p>

        {contacts.map((c, idx) => {
          const col      = slotColors[idx]
          const isEmpty  = !c.name && !c.phone
          const required = idx < 2
          const hasError = errors[idx]
          return (
            <div key={idx} className={`glass-card rounded-2xl p-4 border ${hasError ? 'border-rose-400' : isEmpty ? 'border-dashed border-gray-200' : col.ring}`}
              style={hasError ? { boxShadow: '0 0 0 3px rgba(239,68,68,0.10)' } : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl ${hasError ? 'bg-rose-50' : col.bg} flex items-center justify-center`}>
                    <Phone size={13} className={hasError ? 'text-rose-500' : col.icon} />
                  </div>
                  <p className="text-xs font-bold text-gray-700">
                    {slotLabels[idx]}
                    {required && <span className="text-rose-500 ml-0.5">*</span>}
                  </p>
                </div>
                {!isEmpty && (
                  <button onClick={() => clear(idx)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-rose-100 flex items-center justify-center transition-colors">
                    <Trash2 size={11} className="text-gray-400 hover:text-rose-500" />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                <Input
                  placeholder={required ? 'Full name (required)' : 'Full name'}
                  type="text"
                  value={c.name}
                  onChange={e => update(idx, 'name', e.target.value)}
                  style={hasError ? { border: '1.5px solid #f87171' } : undefined}
                />
                <Input
                  placeholder="Phone number"
                  type="tel"
                  value={c.phone}
                  onChange={e => update(idx, 'phone', e.target.value)}
                />
                <div>
                  <select
                    value={c.relationship}
                    onChange={e => update(idx, 'relationship', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                    style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)', color: c.relationship ? '#1f2937' : '#9ca3af' }}
                  >
                    <option value="">Relationship…</option>
                    {REL_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {hasError && (
                <p className="text-[11px] text-rose-500 font-semibold mt-2.5 flex items-center gap-1">
                  <span>⚠️</span> Name is required for {slotLabels[idx].toLowerCase()}.
                </p>
              )}
            </div>
          )
        })}

        <div className="glass-card rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-base mt-0.5">💡</span>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Contacts are shown to family members viewing your emergency alert. They can tap to call directly.
          </p>
        </div>

        <SaveButton saved={saved} onClick={save} />
      </div>
    </div>
  )
}

// ── Main ProfilePanel ─────────────────────────────────────────────────────────
export default function ProfilePanel({ open, onClose }) {
  const { currentUser, currentMember, skinColor, setSkinColor, logout } = useApp()
  const [copied, setCopied] = useState(false)
  const [page,   setPage]   = useState(null)

  const uid = currentUser?.uid || '—'

  function copyUID() {
    navigator.clipboard?.writeText(uid).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() { setPage(null); onClose() }

  const SETTINGS = [
    { id: 'emergency-contacts', icon: Phone,  label: 'Emergency Contacts', sub: `${(currentUser?.emergencyContacts || []).filter(c=>c.name).length || 'No'} contacts saved`, iconBg: 'bg-rose-50', iconColor: 'text-rose-500' },
    { id: 'notifications',      icon: Bell,   label: 'Notifications',       sub: 'Check-in time, reminders & alerts' },
    { id: 'privacy',            icon: Shield, label: 'Privacy & Sharing',   sub: 'Control who sees your data' },
    { id: 'account',            icon: User,   label: 'Account',             sub: currentUser?.email },
  ]

  // Age subtitle — only show "·Xyo" if age is set
  const ageLine = currentMember
    ? `${currentMember.relationship}${currentMember.age ? ` · ${currentMember.age}yo` : ''}`
    : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="fixed inset-0 z-[90] flex flex-col max-w-lg mx-auto"
          style={{ background: '#eeeae6' }}
        >
          {/* Ambient blobs */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div style={{ position:'absolute', top:'-10%', left:'-15%', width:'55%', height:'55%', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)', filter:'blur(48px)' }} />
            <div style={{ position:'absolute', bottom:'5%', right:'-10%', width:'40%', height:'40%', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', filter:'blur(48px)' }} />
          </div>

          <AnimatePresence mode="wait">
            {page ? (
              <motion.div key={page} initial={{ x:60, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:60, opacity:0 }}
                transition={{ type:'spring', damping:28, stiffness:320 }} className="flex flex-col flex-1 overflow-y-auto">
                {page === 'emergency-contacts' && <EmergencyContactsPage onBack={() => setPage(null)} />}
                {page === 'notifications'      && <NotificationsPage     onBack={() => setPage(null)} />}
                {page === 'privacy'            && <PrivacyPage           onBack={() => setPage(null)} onOpenPrivacy={() => setPage('privacy-policy')} />}
                {page === 'privacy-policy'     && <PrivacyPolicyPage     onBack={() => setPage('privacy')} />}
                {page === 'account'            && <AccountPage           onBack={() => setPage(null)} />}
              </motion.div>
            ) : (
              <motion.div key="main" initial={{ x:-40, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:-40, opacity:0 }}
                transition={{ type:'spring', damping:28, stiffness:320 }} className="flex-1 overflow-y-auto">

                {/* Hero */}
                <div className="bg-gradient-to-br from-primary-600 to-indigo-500 px-5 pb-6"
                  style={{ paddingTop:'calc(env(safe-area-inset-top, 16px) + 20px)' }}>
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      {currentMember && <Avatar member={currentMember} size="lg" />}
                      <div className="text-white">
                        <p className="font-extrabold text-base leading-tight">{currentMember?.name || currentUser?.name}</p>
                        <p className="text-primary-200 text-xs mt-0.5">{currentUser?.email}</p>
                        {ageLine && <p className="text-primary-300 text-[10px] mt-0.5">{ageLine}</p>}
                      </div>
                    </div>
                    <button onClick={handleClose}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors mt-1 flex-shrink-0">
                      <X size={15} />
                    </button>
                  </div>

                  {/* UID card */}
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-primary-200 text-[10px] font-semibold uppercase tracking-widest mb-1">Your Health ID</p>
                      <p className="text-white font-extrabold text-xl tracking-[0.2em] font-mono">{uid}</p>
                      <p className="text-primary-300 text-[10px] mt-1">Share this so others can add you to their family</p>
                    </div>
                    <button onClick={copyUID}
                      className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0">
                      {copied ? <CheckIcon size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Skin tone */}
                  <div className="glass-card rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full border border-white/60"
                        style={{ background:skinGradient(skinColor), boxShadow:'0 2px 6px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.4)' }} />
                      <div>
                        <p className="text-xs font-bold text-gray-800">3D Body Skin Tone</p>
                        <p className="text-[10px] text-gray-400">Changes the body model in Body Map</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 flex-wrap">
                      {SKIN_TONES.map(tone => {
                        const active = skinColor === tone.hex
                        return (
                          <button key={tone.id} onClick={() => setSkinColor(tone.hex)} title={tone.label}
                            className={`relative w-11 h-11 rounded-full transition-all duration-200 ${active ? 'scale-110' : 'hover:scale-105 opacity-85 hover:opacity-100'}`}
                            style={{ background:skinGradient(tone.hex), boxShadow:skinShadow(active) }}>
                            {active && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <CheckIcon size={14} color="white" strokeWidth={3}
                                  style={{ filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.55))' }} />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Settings list */}
                  <div>
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2.5">Settings</p>
                    <div className="glass-card rounded-2xl overflow-hidden divide-y divide-black/5">
                      {SETTINGS.map(item => {
                        const Icon = item.icon
                        return (
                          <button key={item.id} onClick={() => setPage(item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/60 transition-colors text-left">
                            <div className={`w-7 h-7 rounded-lg ${item.iconBg || 'bg-white/80'} shadow-sm flex items-center justify-center`}>
                              <Icon size={14} className={item.iconColor || 'text-gray-400'} />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                              <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{item.sub}</p>
                            </div>
                            <ChevronRight size={13} className="text-gray-300" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Sign out */}
                  <button onClick={() => { logout(); handleClose() }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-rose-200/60 text-rose-500 font-semibold text-sm hover:bg-rose-50 transition-colors glass-card"
                    style={{ marginBottom:'env(safe-area-inset-bottom, 16px)' }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
