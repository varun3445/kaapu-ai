import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, Bell, Shield, LogOut, ChevronRight, ChevronLeft,
  Copy, Check as CheckIcon, MapPin, Clock, PauseCircle,
  Eye, EyeOff, Users, BarChart2, Save, Phone, Trash2,
  Download, AlertTriangle, FileText, TrendingUp, TrendingDown, Minus, PlayCircle,
  Megaphone, Send, Pill, Sparkles,
} from 'lucide-react'
import { TOUR_KEY } from '../Onboarding/OnboardingTour'
import { useApp } from '../../context/AppContext'
import { Avatar } from '../Family/FamilySwitcher'
import { supabase } from '../../supabase'

// ── Save feedback modal ───────────────────────────────────────────────────────
function SaveFeedbackModal({ result, onClose }) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onClose, 2000)
    return () => clearTimeout(t)
  }, [result, onClose])

  return createPortal(
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 12 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.88, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 24, stiffness: 340 }}
            className="relative flex flex-col items-center gap-3 bg-white rounded-3xl px-8 py-7 shadow-2xl w-full max-w-xs text-center"
          >
            {result === 'saved' ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckIcon size={26} className="text-emerald-500" />
                </div>
                <p className="text-base font-extrabold text-gray-900">Changes saved!</p>
                <p className="text-xs text-gray-400">Your profile has been updated across all devices.</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Save size={22} className="text-gray-400" />
                </div>
                <p className="text-base font-extrabold text-gray-900">No changes to save</p>
                <p className="text-xs text-gray-400">Everything is already up to date.</p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Weight history sheet ──────────────────────────────────────────────────────
function WeightHistorySheet({ history, units, onClose }) {
  const { currentUser, updateProfile } = useApp()
  const isImperial = units === 'imperial'

  const [sorted,     setSorted]     = useState([...history].sort((a, b) => new Date(b.date) - new Date(a.date)))
  // keep sorted in sync if parent history prop changes (e.g. after delete)

  const [editingIdx, setEditingIdx] = useState(null)   // index in sorted array
  const [editVal,    setEditVal]    = useState('')
  const [confirmDel, setConfirmDel] = useState(null)   // index pending delete confirm

  function display(kg) {
    return isImperial ? `${(kg * 2.20462).toFixed(1)} lbs` : `${kg} kg`
  }
  function toKg(val) {
    const n = parseFloat(val)
    return isImperial ? parseFloat((n / 2.20462).toFixed(1)) : n
  }

  async function commitEdit(idx) {
    const newKg = toKg(editVal)
    if (!newKg || newKg <= 0) { setEditingIdx(null); return }
    const updated = sorted.map((e, i) => i === idx ? { ...e, weightKg: newKg } : e)
    setSorted(updated)
    setEditingIdx(null)
    await updateProfile({ weightHistory: updated })
  }

  async function deleteEntry(idx) {
    const updated = sorted.filter((_, i) => i !== idx)
    setSorted(updated)
    setConfirmDel(null)
    await updateProfile({ weightHistory: updated })
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-5"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.93, opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Weight History</h3>
            <p className="text-xs text-gray-400 mt-0.5">{sorted.length} entr{sorted.length === 1 ? 'y' : 'ies'} · tap ✏️ to edit</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-2 flex-1">
          {sorted.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">⚖️</p>
              <p className="text-sm font-semibold text-gray-600">No history yet</p>
              <p className="text-xs text-gray-400 mt-1">Save your weight to start tracking</p>
            </div>
          ) : sorted.map((entry, i) => {
            const prev  = sorted[i + 1]
            const delta = prev ? parseFloat((entry.weightKg - prev.weightKg).toFixed(1)) : null
            const deltaDisplay = delta === null ? null
              : isImperial
                ? `${delta >= 0 ? '+' : ''}${(delta * 2.20462).toFixed(1)} lbs`
                : `${delta >= 0 ? '+' : ''}${delta} kg`
            const isGain = delta !== null && delta > 0
            const isLoss = delta !== null && delta < 0
            const entryDate = new Date(entry.date)
            const sameDay   = sorted.filter(e => new Date(e.date).toDateString() === entryDate.toDateString()).length > 1
            const dateStr   = sameDay
              ? entryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + entryDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : entryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            const isEditing = editingIdx === i
            const isDeleting = confirmDel === i

            return (
              <AnimatePresence key={entry.date + i} mode="wait">
                {isDeleting ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3"
                  >
                    <p className="flex-1 text-xs font-semibold text-rose-700">Delete {dateStr} entry?</p>
                    <button onClick={() => setConfirmDel(null)}
                      className="text-[10px] font-bold text-gray-500 px-3 py-1.5 rounded-xl bg-white border border-gray-200">
                      Cancel
                    </button>
                    <button onClick={() => deleteEntry(i)}
                      className="text-[10px] font-bold text-white px-3 py-1.5 rounded-xl bg-rose-500">
                      Delete
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                      isEditing ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                    }`}
                  >
                    {/* Date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800">{dateStr}</p>
                      {i === 0 && !isEditing && (
                        <p className="text-[10px] text-primary-500 font-semibold mt-0.5">Latest</p>
                      )}
                    </div>

                    {/* Weight — editable inline */}
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            autoFocus
                            type="number"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(i); if (e.key === 'Escape') setEditingIdx(null) }}
                            className="w-24 px-2 py-1.5 pr-8 rounded-xl text-sm font-bold text-gray-800 border border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">
                            {isImperial ? 'lbs' : 'kg'}
                          </span>
                        </div>
                        <button onClick={() => commitEdit(i)}
                          className="w-7 h-7 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                          <CheckIcon size={12} className="text-white" />
                        </button>
                        <button onClick={() => setEditingIdx(null)}
                          className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <X size={12} className="text-gray-500" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Weight + delta */}
                        <p className="text-sm font-extrabold text-gray-900">{display(entry.weightKg)}</p>
                        <div className={`flex items-center gap-1 w-[68px] justify-end ${
                          isGain ? 'text-rose-500' : isLoss ? 'text-emerald-500' : 'text-gray-400'
                        }`}>
                          {delta !== null && (
                            <>
                              {isGain  ? <TrendingUp  size={12} /> :
                               isLoss  ? <TrendingDown size={12} /> :
                                         <Minus size={12} />}
                              <span className="text-[11px] font-bold">{deltaDisplay}</span>
                            </>
                          )}
                        </div>

                        {/* Edit / Delete actions */}
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => { setEditingIdx(i); setEditVal(isImperial ? (entry.weightKg * 2.20462).toFixed(1) : String(entry.weightKg)) }}
                            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-primary-50 hover:text-primary-500 flex items-center justify-center transition-colors text-gray-400"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmDel(i)}
                            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center transition-colors text-gray-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

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

function Input({ label, style: extraStyle, suffix, ...props }) {
  return (
    <div>
      {label && <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">{label}</label>}
      <div className="relative">
        <input {...props}
          className={`w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none transition-all ${suffix ? 'pr-10' : ''}`}
          style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)', ...extraStyle }} />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold pointer-events-none">{suffix}</span>
        )}
      </div>
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
// Common timezones list for the picker
const TIMEZONES = [
  { label: 'UTC',                        value: 'UTC' },
  { label: 'London (GMT/BST)',            value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)',        value: 'Europe/Paris' },
  { label: 'Athens / Helsinki (EET)',     value: 'Europe/Athens' },
  { label: 'Dubai (GST)',                 value: 'Asia/Dubai' },
  { label: 'Karachi (PKT)',               value: 'Asia/Karachi' },
  { label: 'India (IST +5:30)',           value: 'Asia/Kolkata' },
  { label: 'Dhaka (BST +6)',              value: 'Asia/Dhaka' },
  { label: 'Bangkok (ICT +7)',            value: 'Asia/Bangkok' },
  { label: 'Singapore / KL (SGT +8)',     value: 'Asia/Singapore' },
  { label: 'Tokyo / Seoul (JST +9)',      value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST +10)',           value: 'Australia/Sydney' },
  { label: 'Auckland (NZST +12)',         value: 'Pacific/Auckland' },
  { label: 'São Paulo (BRT -3)',          value: 'America/Sao_Paulo' },
  { label: 'New York (ET)',               value: 'America/New_York' },
  { label: 'Chicago (CT)',                value: 'America/Chicago' },
  { label: 'Denver (MT)',                 value: 'America/Denver' },
  { label: 'Los Angeles (PT)',            value: 'America/Los_Angeles' },
  { label: 'Anchorage (AKT)',             value: 'America/Anchorage' },
  { label: 'Honolulu (HST)',              value: 'Pacific/Honolulu' },
]

const NOTIF_DEFAULTS = { medications: true, connections: true, aiInsights: true }

const INSIGHT_DAYS = [
  { id: 'sunday',    label: 'S' },
  { id: 'monday',    label: 'M' },
  { id: 'tuesday',   label: 'T' },
  { id: 'wednesday', label: 'W' },
  { id: 'thursday',  label: 'T' },
  { id: 'friday',    label: 'F' },
  { id: 'saturday',  label: 'S' },
]

function NotificationsPage({ onBack }) {
  const { currentUser, updateProfile } = useApp()
  const [paused,      setPaused]      = useState(currentUser?.checkInPaused || false)
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [timezone,    setTimezone]    = useState(currentUser?.timezone || detectedTz || 'UTC')
  const [notifPrefs,  setNotifPrefs]  = useState({ ...NOTIF_DEFAULTS, ...(currentUser?.notifPrefs || {}) })
  const [insightDay,  setInsightDay]  = useState(currentUser?.insightDay || 'monday')
  const [saved,       setSaved]       = useState(false)
  const [saveResult,  setSaveResult]  = useState(null)

  function togglePref(key) {
    setNotifPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  function save() {
    const origPrefs = { ...NOTIF_DEFAULTS, ...(currentUser?.notifPrefs || {}) }
    const changed =
      paused      !== (currentUser?.checkInPaused || false)  ||
      timezone    !== (currentUser?.timezone      || 'UTC')  ||
      insightDay  !== (currentUser?.insightDay    || 'monday') ||
      Object.keys(notifPrefs).some(k => notifPrefs[k] !== origPrefs[k])
    if (changed) {
      updateProfile({ checkInPaused: paused, timezone, notifPrefs, insightDay })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    }
    setSaveResult(changed ? 'saved' : 'no-changes')
  }

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Notifications" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Timezone</p>
          <div className="glass-card rounded-2xl px-4 py-3">
            <p className="text-[10px] text-gray-400 mb-2">Used to send reminders at the right local time</p>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
            >
              {/* Show detected tz at top if not in list */}
              {!TIMEZONES.find(t => t.value === detectedTz) && (
                <option value={detectedTz}>{detectedTz} (auto-detected)</option>
              )}
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.value === detectedTz ? `${tz.label} (auto-detected)` : tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">Alert Preferences</p>
          <div className="glass-card rounded-2xl px-4 divide-y divide-black/5">
            <SettingRow icon={Bell} label="Emergency Alerts" sub="Always on — cannot be disabled" iconBg="bg-rose-50" iconColor="text-rose-500">
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full">Always on</span>
            </SettingRow>
            <SettingRow icon={Pill} label="Medication Reminders" sub="Alerts at your scheduled medication times" iconBg="bg-indigo-50" iconColor="text-indigo-500">
              <Toggle value={notifPrefs.medications} onChange={() => togglePref('medications')} />
            </SettingRow>
            <SettingRow icon={Users} label="Connections" sub="Family activity, join requests and updates" iconBg="bg-emerald-50" iconColor="text-emerald-500">
              <Toggle value={notifPrefs.connections} onChange={() => togglePref('connections')} />
            </SettingRow>
            <div>
              <SettingRow icon={Sparkles} label="AI Insights" sub="Personalised health tips from Kaapu" iconBg="bg-violet-50" iconColor="text-violet-500">
                <Toggle value={notifPrefs.aiInsights} onChange={() => togglePref('aiInsights')} />
              </SettingRow>
              <AnimatePresence>
                {notifPrefs.aiInsights && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-1 pb-3 pt-1">
                      <p className="text-[10px] text-violet-400 font-semibold mb-2">
                        Weekly insight delivery day
                      </p>
                      <div className="flex gap-1.5">
                        {INSIGHT_DAYS.map(d => (
                          <button
                            key={d.id}
                            onClick={() => setInsightDay(d.id)}
                            className={`w-8 h-8 rounded-full text-[11px] font-bold flex-shrink-0 flex items-center justify-center transition-colors ${
                              insightDay === d.id
                                ? 'bg-violet-500 text-white'
                                : 'bg-violet-50 text-violet-400 hover:bg-violet-100'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <SettingRow icon={Bell} label="Health Reminders" sub="Check-in nudges and symptom logging" iconBg="bg-blue-50" iconColor="text-blue-500">
              <Toggle value={!paused} onChange={v => setPaused(!v)} />
            </SettingRow>
          </div>
        </div>
        <SaveButton saved={saved} onClick={save} />
        <SaveFeedbackModal result={saveResult} onClose={() => setSaveResult(null)} />
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
  const [saveResult, setSaveResult] = useState(null)
  const [downloading, setDownloading] = useState(false)

  function toggle(key) { setPriv(p => ({ ...p, [key]: !p[key] })) }
  function save() {
    const orig = { ...defaults, ...(currentUser?.privacySettings || {}) }
    const changed = Object.keys(priv).some(k => priv[k] !== orig[k])
    if (changed) {
      updateProfile({ privacySettings: priv })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    }
    setSaveResult(changed ? 'saved' : 'no-changes')
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
        <SaveFeedbackModal result={saveResult} onClose={() => setSaveResult(null)} />
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
  const [heightCm,     setHeightCm]     = useState(currentUser?.heightCm?.toString()  || '')
  const [weightKg,     setWeightKg]     = useState(currentUser?.weightKg?.toString()  || '')
  const [units,        setUnits]        = useState(currentUser?.units || 'metric')

  // Sync fields when currentUser loads async (e.g. after DB fetch completes)
  const prevUserId = useRef(null)
  useEffect(() => {
    if (!currentUser || currentUser.id === prevUserId.current) return
    prevUserId.current = currentUser.id
    setName(currentUser.name          || '')
    setAge(currentUser.age?.toString() || '')
    setGender(currentUser.gender      || 'other')
    setEmail(currentUser.email        || '')
    setHomeLocation(currentUser.homeLocation  || '')
    setHeightCm(currentUser.heightCm?.toString()  || '')
    setWeightKg(currentUser.weightKg?.toString()  || '')
    setUnits(currentUser.units        || 'metric')
  }, [currentUser])
  const [saved,        setSaved]        = useState(false)
  const [saveResult,   setSaveResult]   = useState(null)
  const [showWtHistory, setShowWtHistory] = useState(false)
  const [deleteStep,   setDeleteStep]   = useState(0)
  const [deleteInput,  setDeleteInput]  = useState('')

  // Derived display values for imperial
  const heightFt   = heightCm ? Math.floor(parseFloat(heightCm) / 30.48) : ''
  const heightIn   = heightCm ? Math.round((parseFloat(heightCm) / 2.54) % 12) : ''
  const weightLbs  = weightKg ? Math.round(parseFloat(weightKg) * 2.20462) : ''

  function handleHeightImperial(ft, inches) {
    const totalIn = (parseFloat(ft) || 0) * 12 + (parseFloat(inches) || 0)
    setHeightCm(totalIn ? (totalIn * 2.54).toFixed(1) : '')
  }
  function handleWeightLbs(lbs) {
    setWeightKg(lbs ? (parseFloat(lbs) / 2.20462).toFixed(1) : '')
  }

  async function save() {
    const updates = {
      name:         name.trim()  || currentUser?.name,
      age:          age ? parseInt(age) : null,
      gender,
      email:        email.trim() || currentUser?.email,
      homeLocation: homeLocation.trim(),
      heightCm:     heightCm ? parseFloat(heightCm) : null,
      weightKg:     weightKg ? parseFloat(weightKg) : null,
      units,
    }
    const changed =
      updates.name         !== currentUser?.name ||
      updates.age          !== (currentUser?.age ?? null) ||
      updates.gender       !== currentUser?.gender ||
      updates.email        !== currentUser?.email ||
      updates.homeLocation !== (currentUser?.homeLocation || '') ||
      updates.heightCm     !== (currentUser?.heightCm ?? null) ||
      updates.weightKg     !== (currentUser?.weightKg ?? null) ||
      updates.units        !== (currentUser?.units || 'metric')
    if (changed) {
      // If weight changed, always append a new entry so every change is tracked
      if (updates.weightKg !== (currentUser?.weightKg ?? null) && updates.weightKg !== null) {
        const existing = Array.isArray(currentUser?.weightHistory) ? currentUser.weightHistory : []
        updates.weightHistory = [
          ...existing,
          { date: new Date().toISOString(), weightKg: updates.weightKg },
        ]
      }
      await updateProfile(updates)
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    }
    setSaveResult(changed ? 'saved' : 'no-changes')
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
        <div data-tour="account-personal">
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

            {/* Unit toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Units</label>
              <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                {['metric', 'imperial'].map(u => (
                  <button key={u} onClick={() => setUnits(u)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all capitalize ${
                      units === u ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
                    }`}>
                    {u === 'metric' ? 'Metric (cm / kg)' : 'Imperial (ft / lbs)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Height */}
            {units === 'metric' ? (
              <Input label="Height" type="number" placeholder="175" min={50} max={250}
                value={heightCm} onChange={e => setHeightCm(e.target.value)}
                suffix="cm" />
            ) : (
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Height</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="number" placeholder="5" min={1} max={8}
                      value={heightFt}
                      onChange={e => handleHeightImperial(e.target.value, heightIn)}
                      className="w-full px-3 py-2.5 pr-8 rounded-xl text-sm text-gray-800 focus:outline-none transition-all"
                      style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)' }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">ft</span>
                  </div>
                  <div className="relative flex-1">
                    <input type="number" placeholder="11" min={0} max={11}
                      value={heightIn}
                      onChange={e => handleHeightImperial(heightFt, e.target.value)}
                      className="w-full px-3 py-2.5 pr-8 rounded-xl text-sm text-gray-800 focus:outline-none transition-all"
                      style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)' }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold">in</span>
                  </div>
                </div>
              </div>
            )}

            {/* Weight */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Weight</label>
                {(currentUser?.weightHistory?.length > 0) && (
                  <button
                    onClick={() => setShowWtHistory(true)}
                    className="text-[10px] font-semibold text-primary-500 underline underline-offset-2 hover:text-primary-600 transition-colors"
                  >
                    History ({currentUser.weightHistory.length})
                  </button>
                )}
              </div>
              {units === 'metric' ? (
                <Input type="number" placeholder="70" min={1} max={500}
                  value={weightKg} onChange={e => setWeightKg(e.target.value)}
                  suffix="kg" />
              ) : (
                <Input type="number" placeholder="154" min={1} max={1100}
                  value={weightLbs} onChange={e => handleWeightLbs(e.target.value)}
                  suffix="lbs" />
              )}
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
        <SaveFeedbackModal result={saveResult} onClose={() => setSaveResult(null)} />
        <AnimatePresence>
          {showWtHistory && (
            <WeightHistorySheet
              history={currentUser?.weightHistory || []}
              units={units}
              onClose={() => setShowWtHistory(false)}
            />
          )}
        </AnimatePresence>

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
  const [saveResult, setSaveResult] = useState(null)
  const [errors, setErrors]     = useState([false, false, false])

  function update(idx, field, val) {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c))
    if (field === 'name' && val.trim()) {
      setErrors(prev => prev.map((e, i) => i === idx ? false : e))
    }
  }

  function clear(idx) {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...EMPTY_CONTACT } : c))
  }

  async function save() {
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
    const orig   = (currentUser?.emergencyContacts || [])
    const changed = JSON.stringify(filled) !== JSON.stringify(orig.slice(0, filled.length))
    if (changed) {
      await updateProfile({ emergencyContacts: filled })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    }
    setSaveResult(changed ? 'saved' : 'no-changes')
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
                  placeholder="Phone e.g. +447911123456"
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
        <SaveFeedbackModal result={saveResult} onClose={() => setSaveResult(null)} />
      </div>
    </div>
  )
}

// ── Main ProfilePanel ─────────────────────────────────────────────────────────
export default function ProfilePanel({ open, onClose }) {
  const { currentUser, currentMember, skinColor, setSkinColor, logout, isAdmin, sendBroadcast } = useApp()
  const [copied, setCopied] = useState(false)
  const [page,   setPage]   = useState(null)

  const uid = currentUser?.uid || '—'
  const [nudgeMsg,    setNudgeMsg]    = useState("Don't forget to log today's check-in! 💙")
  const [nudgeSending, setNudgeSending] = useState(false)
  const [nudgeSent,    setNudgeSent]    = useState(false)

  async function handleNudge() {
    if (!nudgeMsg.trim()) return
    setNudgeSending(true)
    const { ok } = await sendBroadcast({ message: nudgeMsg.trim(), type: 'nudge' })
    setNudgeSending(false)
    if (ok) { setNudgeSent(true); setTimeout(() => setNudgeSent(false), 3000) }
  }

  function copyUID() {
    navigator.clipboard?.writeText(uid).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() { setPage(null); onClose() }

  // Tour can navigate to a sub-page (e.g. 'account') via this event
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.page) setPage(e.detail.page)
      else if (!e.detail?.open) setPage(null)
    }
    window.addEventListener('kaapu:tour-profile', handler)
    return () => window.removeEventListener('kaapu:tour-profile', handler)
  }, [])

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
                  <div data-tour="profile-uid" className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
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

                  {/* Replay tour — temporarily hidden, needs update for new UI */}


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
