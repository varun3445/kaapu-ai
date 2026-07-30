import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Smartphone, Activity, CheckCircle, Loader, RotateCcw, CheckCircle2, Search, Pill, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateMoodFromSymptoms } from '../context/AppContext'
import BodyScene from '../components/Body3D/BodyScene'
import SymptomForm from '../components/Symptoms/SymptomForm'
import { FEELING_CONFIG, SYMPTOM_CATEGORIES, CHRONIC_CONDITION_PRESETS } from '../data/mockData'
import { severityLabel, SEVERITY_HIGH_THRESHOLD, SEVERITY_MID_THRESHOLD } from '../utils/severity'
import ConditionCard from '../components/Conditions/ConditionCard'
import AddMedicationModal from '../components/Medications/AddMedicationModal'
import { format, isToday } from 'date-fns'
import { useHealthData } from '../hooks/useHealthData'

// ── Per-day symptom helpers ───────────────────────────────────────────────────
function getSymptomsForDay(day, allSymptoms, memberId) {
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0)
  const dayEnd   = new Date(day); dayEnd.setHours(23, 59, 59, 999)
  return allSymptoms.filter(s => {
    if (s.memberId !== memberId) return false
    const start = new Date(s.timestamp)
    if (start > dayEnd) return false
    if (s.resolved) {
      if (!s.resolvedAt) return start >= dayStart && start <= dayEnd
      return new Date(s.resolvedAt) >= dayStart
    }
    return true
  })
}

function getMoodForDay(day, allSymptoms, memberId) {
  return calculateMoodFromSymptoms(getSymptomsForDay(day, allSymptoms, memberId))
}

// ── Day detail modal ──────────────────────────────────────────────────────────
function DayDetailModal({ day, symptoms, memberId, onClose, onResolve, onLogPain }) {
  const daySymptoms = getSymptomsForDay(day, symptoms, memberId)
  const mood = calculateMoodFromSymptoms(daySymptoms)
  const cfg  = FEELING_CONFIG[mood]
  const isPast = !isToday(day)
  const title = isToday(day) ? 'Today' : format(day, 'EEEE, d MMM')

  // Score breakdown
  const severe   = daySymptoms.filter(s => s.severity >= SEVERITY_HIGH_THRESHOLD)
  const moderate = daySymptoms.filter(s => s.severity >= SEVERITY_MID_THRESHOLD && s.severity < SEVERITY_HIGH_THRESHOLD)
  const minor    = daySymptoms.filter(s => s.severity < SEVERITY_MID_THRESHOLD)
  const score    = severe.length * 4 + moderate.length * 2 + minor.length

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center px-3 pb-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{   y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 -4px 40px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between"
          style={{ background: cfg.bg }}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{cfg.emoji}</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: cfg.color }}>{title}</p>
              <p className="text-lg font-extrabold text-gray-800">{cfg.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Score pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Pain score:</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: cfg.color + '18', color: cfg.color }}>
              {score} pt{score !== 1 ? 's' : ''} → {cfg.label}
            </span>
            {score > 0 && (
              <span className="text-[10px] text-gray-400">
                {severe.length > 0 && `${severe.length} severe (×4)`}
                {moderate.length > 0 && `${severe.length > 0 ? ' · ' : ''}${moderate.length} moderate (×2)`}
                {minor.length > 0 && `${(severe.length + moderate.length) > 0 ? ' · ' : ''}${minor.length} minor (×1)`}
              </span>
            )}
          </div>

          {/* Symptom list */}
          {daySymptoms.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Active symptoms this day
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {daySymptoms.map(s => {
                  const cat = SYMPTOM_CATEGORIES.find(c => c.id === s.category)
                  const sev = s.severity
                  const stillActive = !s.resolved
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: (cat?.color || '#6366f1') + '22' }}>{cat?.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{s.bodyLabel}</p>
                        <p className="text-[10px] text-gray-400">{s.type} · {severityLabel(sev)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                          sev >= SEVERITY_HIGH_THRESHOLD ? 'bg-rose-100 text-rose-600' : sev >= SEVERITY_MID_THRESHOLD ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>{severityLabel(sev)}</span>
                        {stillActive && (
                          <button
                            onClick={() => onResolve(s.id)}
                            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle size={11} /> Resolve
                          </button>
                        )}
                        {!stillActive && (
                          <span className="text-[10px] text-gray-300 font-medium">Resolved</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50">
              <span className="text-2xl">✨</span>
              <div>
                <p className="text-sm font-bold text-emerald-700">No symptoms this day</p>
                <p className="text-xs text-emerald-500">That's why the mood was Great!</p>
              </div>
            </div>
          )}

          {/* Actions */}
          {!isPast && (
            <button
              onClick={() => { onClose(); onLogPain() }}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }}
            >
              + Log Pain on Body Map
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Mood streak bar (symptom-derived, tappable) ───────────────────────────────
const MOOD_BAR_H = { great: 'h-14', good: 'h-10', okay: 'h-7', bad: 'h-4', terrible: 'h-2' }

function MoodBar({ symptoms, memberId, onDayPress }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d
  })

  return (
    <div className="flex items-end gap-1.5">
      {days.map((day) => {
        const dayStr = day.toDateString()
        const lbl    = isToday(day) ? 'Today' : format(day, 'EEE')
        const mood   = getMoodForDay(day, symptoms, memberId)
        const cfg    = FEELING_CONFIG[mood]
        return (
          <button
            key={dayStr}
            onClick={() => onDayPress(day)}
            className="flex-1 flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            <span className="text-base leading-none">{cfg.emoji}</span>
            <div
              className={`w-full rounded-lg transition-all ${MOOD_BAR_H[mood]}`}
              style={{ background: cfg.color + '55', border: `2px solid ${cfg.color}` }}
            />
            <span className="text-[9px] text-gray-400 font-medium">{lbl}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Connect Health modal ──────────────────────────────────────────────────────
function ConnectHealthModal({ onClose, onConnect, connecting, isIOS, isAndroid, isNative, unavailable, notInstalled }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-sm glass-elevated rounded-3xl px-5 pt-5 pb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-extrabold text-gray-900">Connect Health App</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={13} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Sync vitals automatically from your phone.</p>
        <div className="space-y-3">
          {/* Apple Health */}
          <button
            onClick={isIOS ? onConnect : undefined}
            disabled={connecting || !isIOS}
            className={`w-full flex items-center gap-4 glass-card rounded-2xl p-4 text-left transition-colors active:scale-[0.98] ${isIOS ? 'hover:bg-white/80' : 'opacity-50 cursor-default'}`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #ff2d55 0%, #ff6b6b 100%)' }}>
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Apple Health</p>
              <p className="text-xs text-gray-400 mt-0.5">{isIOS ? 'Heart rate, steps, SpO₂ & calories' : 'iOS only'}</p>
            </div>
            {(connecting && isIOS)
              ? <Loader size={16} className="text-primary-400 animate-spin flex-shrink-0" />
              : isIOS
                ? <span className="text-gray-300 flex-shrink-0">›</span>
                : <span className="text-[10px] text-gray-300 flex-shrink-0">iOS only</span>}
          </button>
          {/* Google Health Connect */}
          <button
            onClick={isAndroid ? onConnect : undefined}
            disabled={connecting || !isAndroid}
            className={`w-full flex items-center gap-4 glass-card rounded-2xl p-4 text-left transition-colors active:scale-[0.98] ${isAndroid ? 'hover:bg-white/80' : 'opacity-50 cursor-default'}`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white border border-gray-100">
              <svg viewBox="0 0 24 24" className="w-7 h-7">
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                <path d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.66 2.84c2.13-1.99 3.76-4.92 3.76-8.66z" fill="#4285F4"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Google Health Connect</p>
              <p className="text-xs text-gray-400 mt-0.5">{isAndroid ? 'Steps, heart rate, SpO₂ & calories' : 'Android only'}</p>
            </div>
            {(connecting && isAndroid)
              ? <Loader size={16} className="text-primary-400 animate-spin flex-shrink-0" />
              : isAndroid
                ? <span className="text-gray-300 flex-shrink-0">›</span>
                : <span className="text-[10px] text-gray-300 flex-shrink-0">Android only</span>}
          </button>
          {unavailable && (
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-xl px-3 py-2 text-center">
              {isIOS ? "HealthKit isn't available on the simulator — test on a real iPhone." : 'Health data not available on this device.'}
            </p>
          )}
          {notInstalled && (
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-xl px-3 py-2 text-center">
              Health Connect isn't installed. Install it from the Play Store, then try again.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Web health prompt ─────────────────────────────────────────────────────────
function WebHealthPrompt() {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden">
      {/* Coming soon overlay */}
      <div className="absolute inset-0 rounded-2xl bg-white/85 backdrop-blur-md z-10 flex flex-col items-center justify-center gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Coming Soon</span>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
        <Smartphone size={22} className="text-primary-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">Health data needs the app</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Steps, heart rate, SpO₂ and calories sync from Apple Health on iPhone or Google Health Connect on Android.
        </p>
      </div>
      <div className="flex gap-2 w-full">
        <a href="https://apps.apple.com" target="_blank" rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white flex-shrink-0">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          App Store
        </a>
        <a href="https://play.google.com" target="_blank" rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)' }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white flex-shrink-0">
            <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
          </svg>
          Play Store
        </a>
      </div>
    </div>
  )
}

// ── Vitals card ───────────────────────────────────────────────────────────────
function VitalCard({ icon, label, value, unit, onConnect, connected }) {
  return (
    <div className="glass-card rounded-2xl p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {connected ? <CheckCircle size={12} className="text-emerald-400" /> : <Smartphone size={12} className="text-gray-300" />}
      </div>
      {connected ? (
        value != null
          ? <p className="text-base font-extrabold text-gray-800 leading-none">{value.toLocaleString()}<span className="text-[10px] font-medium text-gray-400 ml-0.5">{unit}</span></p>
          : <p className="text-sm font-bold text-gray-300 leading-none">N/A</p>
      ) : (
        <p className="text-[10px] text-gray-300 font-medium leading-none">—</p>
      )}
      <p className="text-[10px] text-gray-400 font-medium leading-none">{label}</p>
      {!connected && (
        <button onClick={onConnect} className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors">
          <Plus size={13} className="text-primary-500" />
        </button>
      )}
    </div>
  )
}

// ── Active symptom pill ───────────────────────────────────────────────────────
function SymptomPill({ symptom, onResolve }) {
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === symptom.category)
  const sev = symptom.severity
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: (cat?.color || '#6366f1') + '22' }}>{cat?.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{symptom.bodyLabel}</p>
        <p className="text-[10px] text-gray-400">{symptom.type} · {symptom.duration}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
          sev >= SEVERITY_HIGH_THRESHOLD ? 'bg-rose-100 text-rose-600' : sev >= SEVERITY_MID_THRESHOLD ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
        }`}>{severityLabel(sev)}</span>
        <button onClick={() => onResolve(symptom.id)} className="p-1 text-gray-300 hover:text-rose-400 transition-colors">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Body map modal ────────────────────────────────────────────────────────────
function BodyMapModal({ onClose, onSymptomAdded, skinColor }) {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [showForm,       setShowForm]       = useState(false)
  const [hoverLabel,     setHoverLabel]     = useState(null)
  const { currentSymptoms, resolveSymptom } = useApp()

  const activeSymptoms = currentSymptoms.filter(s => !s.resolved)
  const pins = useMemo(() =>
    activeSymptoms
      .filter(s => s.pinPosition)
      .map(s => ({ id: s.id, label: s.bodyLabel, position: s.pinPosition, severity: s.severity })),
    [activeSymptoms]
  )

  function handleRegionClick({ id, label, position }) {
    setSelectedRegion({ id, label, position })
    setShowForm(true)
  }

  function handleFormSubmit(data) {
    onSymptomAdded({ ...data, pinPosition: selectedRegion?.position })
    setShowForm(false)
    setSelectedRegion(null)
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center px-3 pb-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card — bottom sheet style */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{   y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full max-w-lg flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: 'white',
          height: '82vh',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">Body Map</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeSymptoms.length > 0
                ? `${activeSymptoms.length} active symptom${activeSymptoms.length !== 1 ? 's' : ''} · tap to log more`
                : 'Tap the body to log a symptom'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* 3D canvas */}
        <div data-tour="bodymap-canvas" className="flex-1 relative overflow-hidden bg-gradient-to-b from-slate-50 to-indigo-50">
          <BodyScene
            pins={pins}
            onRegionClick={handleRegionClick}
            onHover={setHoverLabel}
            skinColor={skinColor}
          />
          <AnimatePresence>
            {hoverLabel && !showForm && (
              <motion.div
                key={hoverLabel}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm"
              >
                {hoverLabel}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {selectedRegion && !showForm && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg"
              >
                {selectedRegion.label} selected
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
            <RotateCcw size={10} /> Rotate · Pan · Zoom
          </div>
        </div>

        {/* Active symptoms list */}
        {activeSymptoms.length > 0 && (
          <div className="flex-shrink-0 px-4 pt-3 pb-4 border-t border-gray-100 max-h-44 overflow-y-auto">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Symptoms</p>
            <div className="space-y-2">
              {activeSymptoms.map(s => (
                <SymptomPill key={s.id} symptom={s} onResolve={resolveSymptom} />
              ))}
            </div>
          </div>
        )}

        {/* Symptom form */}
        <AnimatePresence>
          {showForm && selectedRegion && (
            <SymptomForm
              region={{ id: selectedRegion.id, label: selectedRegion.label }}
              onSubmit={handleFormSubmit}
              onClose={() => { setShowForm(false); setSelectedRegion(null) }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Add Condition modal ───────────────────────────────────────────────────────
function AddConditionModal({ onClose }) {
  const { addCondition } = useApp()
  const [query,      setQuery]      = useState('')
  const [selected,   setSelected]   = useState(null)
  const [severity,   setSeverity]   = useState('mild')
  const [diagDate,   setDiagDate]   = useState('')
  const [notes,      setNotes]      = useState('')
  const [linkedCats, setLinkedCats] = useState([])
  const [step,       setStep]       = useState('pick')

  const filtered = CHRONIC_CONDITION_PRESETS.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  function selectPreset(p) {
    setSelected(p)
    const cat = SYMPTOM_CATEGORIES.find(c => c.id === p.category)
    if (cat) setLinkedCats([cat.id])
    setStep('details')
  }

  function handleSave() {
    if (!selected) return
    addCondition({ name: selected.name, icon: selected.icon, icd: selected.icd, severity, diagnosedDate: diagDate || null, notes, linkedCategories: linkedCats })
    onClose()
  }

  function toggleCat(catId) {
    setLinkedCats(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId])
  }

  return createPortal(
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }}
        transition={{ type:'spring', damping:28, stiffness:320 }}
        className="relative w-full max-w-md flex flex-col rounded-3xl overflow-hidden"
        style={{ background:'white', maxHeight:'88vh', boxShadow:'0 -4px 40px rgba(0,0,0,0.18)' }}>
        <div className="flex justify-between items-center px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-extrabold text-gray-800">{step === 'pick' ? 'Add Condition' : selected?.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{step === 'pick' ? 'Select from common conditions' : 'Fill in details'}</p>
          </div>
          <div className="flex items-center gap-2">
            {step === 'details' && <button onClick={() => setStep('pick')} className="text-xs text-primary-500 font-semibold">← Back</button>}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={14} /></button>
          </div>
        </div>

        {step === 'pick' && (
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" placeholder="Search conditions…" value={query} onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
            </div>
            <div className="space-y-2">
              {filtered.map(p => (
                <button key={p.name} onClick={() => selectPreset(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all text-left">
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{p.name}</p>
                    <p className="text-[11px] text-gray-400">ICD: {p.icd} · {p.category}</p>
                  </div>
                  <span className="text-primary-400 text-lg">›</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No matches found</p>}
            </div>
          </div>
        )}

        {step === 'details' && selected && (
          <div className="flex-1 overflow-y-auto px-5 pt-4 space-y-4 pb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {['mild','moderate','severe'].map(s => (
                  <button key={s} type="button" onClick={() => setSeverity(s)}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all capitalize ${
                      severity === s
                        ? s === 'mild' ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : s === 'moderate' ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-gray-100 text-gray-400'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Diagnosis Date (optional)</label>
              <input type="date" value={diagDate} onChange={e => setDiagDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">Monitor Symptom Categories</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_CATEGORIES.filter(c => c.id !== 'other').map(cat => (
                  <button key={cat.id} type="button" onClick={() => toggleCat(cat.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border-2 transition-all"
                    style={linkedCats.includes(cat.id) ? { background: cat.color+'18', borderColor: cat.color, color: cat.color } : { borderColor:'#e5e7eb', color:'#9ca3af' }}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Clinical Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Triggers, management strategy, doctor notes…" rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary-400" />
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100">
            <button onClick={handleSave} className="w-full py-3 rounded-2xl bg-primary-600 text-white font-extrabold text-sm hover:bg-primary-700 transition-colors">
              Add {selected?.name}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Condition detail modal ────────────────────────────────────────────────────
function ConditionDetailModal({ condition, onClose, onAddMed }) {
  const { currentMedications, currentSymptoms } = useApp()
  return createPortal(
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      exit={{ opacity:0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center px-3 pb-4"
      style={{ paddingBottom:'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y:40, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:40, opacity:0 }}
        transition={{ type:'spring', damping:30, stiffness:320 }}
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background:'white', maxHeight:'80vh', boxShadow:'0 -4px 40px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{condition.icon}</span>
            <div>
              <p className="text-sm font-extrabold text-gray-800">{condition.name}</p>
              <p className="text-[11px] text-gray-400 capitalize">{condition.severity} · ICD {condition.icd}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight:'65vh' }}>
          <div className="p-4">
            <ConditionCard condition={condition} medications={currentMedications} symptoms={currentSymptoms} />
          </div>
          <div className="px-4 pb-5">
            <button
              onClick={() => { onClose(); onAddMed() }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 border-dashed border-primary-200 text-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Pill size={14} /> Add Medication to this Condition
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const {
    currentMember, currentSymptoms, addSymptom, resolveSymptom, skinColor,
    currentConditions, removeCondition, currentMedications, addCondition, addMedication, removeMedication,
  } = useApp()
  const { connected, vitals, loading: healthLoading, connect, isIOS, isAndroid, isNative } = useHealthData()

  const [showBodyMap,    setShowBodyMap]    = useState(false)
  const [selectedDay,    setSelectedDay]    = useState(null)   // Date | null — for day detail
  const [showConnect,    setShowConnect]    = useState(false)
  const [connecting,     setConnecting]     = useState(false)
  const [healthUnavail,  setHealthUnavail]  = useState(false)
  const [notInstalled,   setNotInstalled]   = useState(false)
  const [showAddCond,    setShowAddCond]    = useState(false)
  const [showAddMed,     setShowAddMed]     = useState(false)
  const [medicationToDelete, setMedicationToDelete] = useState(null)  // medication ID being confirmed for deletion
  const [selectedCond,   setSelectedCond]   = useState(null)  // condition object | null

  // Allow tour to open/close the body map modal via custom events
  useEffect(() => {
    const open  = () => setShowBodyMap(true)
    const close = () => setShowBodyMap(false)
    window.addEventListener('kaapu:open-bodymap',  open)
    window.addEventListener('kaapu:close-bodymap', close)
    return () => {
      window.removeEventListener('kaapu:open-bodymap',  open)
      window.removeEventListener('kaapu:close-bodymap', close)
    }
  }, [])

  const activeSymptoms = currentSymptoms.filter(s => !s.resolved)
  const todayMood      = calculateMoodFromSymptoms(activeSymptoms)
  const todayCfg       = FEELING_CONFIG[todayMood]

  async function handleConnect() {
    setConnecting(true); setHealthUnavail(false); setNotInstalled(false)
    const result = await connect()
    setConnecting(false)
    if (result.success)                       setShowConnect(false)
    else if (result.reason === 'not-available') setHealthUnavail(true)
    else if (result.reason === 'not-installed') setNotInstalled(true)
  }

  function handleSymptomAdded(data) {
    addSymptom(data)
    // Keep body map open so user can log multiple points
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4 max-w-lg mx-auto">

      {/* ── How are you feeling — auto-derived from body map ──────────────── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        data-tour="checkin"
        className="glass-card rounded-3xl p-5 overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 font-medium">How are you feeling?</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl">{todayCfg.emoji}</span>
              <div>
                <p className="text-base font-extrabold text-gray-800">{todayCfg.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {activeSymptoms.length === 0
                    ? 'No active symptoms — great work!'
                    : `${activeSymptoms.length} active symptom${activeSymptoms.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>
          <button
            data-tour="log-pain-btn"
            onClick={() => navigate('/log-pain')}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-2 rounded-xl hover:bg-primary-100 transition-colors whitespace-nowrap"
          >
            <Plus size={13} /> Log Pain
          </button>
        </div>

        {/* 7-day mood bar — symptom-derived, always shown */}
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">7-Day History</p>
          <MoodBar symptoms={currentSymptoms} memberId={currentMember?.id} onDayPress={setSelectedDay} />
        </div>
      </motion.div>

      {/* ── Pain & Symptoms ───────────────────────────────────────────────── */}
      <div data-tour="health-mapping" className="glass-card rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Health Mapping</h3>
            <p className="text-xs text-gray-400">
              {activeSymptoms.length > 0 ? `${activeSymptoms.length} active` : 'Nothing logged yet'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button data-tour="add-med-btn" onClick={() => setShowAddMed(true)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">
              <Pill size={12} /> Med
            </button>
            <button onClick={() => setShowAddCond(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1.5 rounded-xl hover:bg-primary-100 transition-colors">
              <Plus size={12} /> Condition
            </button>
          </div>
        </div>

        {activeSymptoms.length > 0 ? (
          <div className="space-y-2">
            {activeSymptoms.slice(0, 3).map(s => (
              <SymptomPill key={s.id} symptom={s} onResolve={resolveSymptom} />
            ))}
            {activeSymptoms.length > 3 && (
              <p className="text-center text-xs text-primary-600 font-semibold py-1.5">
                +{activeSymptoms.length - 3} more — open body map to see all
              </p>
            )}
          </div>
        ) : (
          <div className="w-full rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.55)',
              border: '0.75px solid rgba(0,0,0,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
            }}>
            <span className="text-2xl">✨</span>
            <div>
              <p className="text-sm font-bold text-gray-700">Doing great, champ!</p>
              <p className="text-xs text-gray-400">No symptoms logged — keep it up</p>
            </div>
          </div>
        )}

        {/* ── Conditions — always visible ── */}
        {currentConditions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Conditions</p>
            <div className="space-y-1.5">
              {currentConditions.map(c => {
                const sevColor =
                  c.severity === 'severe'   ? { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' } :
                  c.severity === 'moderate' ? { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' } :
                                              { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' }
                return (
                  <button key={c.id}
                    onClick={() => setSelectedCond(c)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left active:scale-[0.98] transition-transform"
                    style={{ background: sevColor.bg }}>
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: sevColor.text }}>{c.name}</p>
                      {c.severity && (
                        <p className="text-[10px] capitalize" style={{ color: sevColor.dot }}>{c.severity}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: sevColor.dot }}>›</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Medications — always visible ── */}
        {currentMedications.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Medications</p>
            <div className="space-y-1.5">
              {currentMedications.map(m => {
                const linkedCondition = currentConditions.find(c => c.id === m.conditionId)
                const isConfirming = medicationToDelete === m.id
                return (
                  <div key={m.id}>
                    {!isConfirming ? (
                      <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-50">
                        <Pill size={13} className="text-indigo-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-indigo-800 truncate">{m.name}</p>
                          <p className="text-[10px] text-indigo-400">
                            {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                            {linkedCondition && (
                              <span className="ml-1 text-indigo-300">· {linkedCondition.icon} {linkedCondition.name}</span>
                            )}
                            {!linkedCondition && (
                              <span className="ml-1 text-indigo-200">· unlinked</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => setMedicationToDelete(m.id)}
                          className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={10} className="text-rose-400" />
                        </button>
                      </div>
                    ) : (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                            <p className="text-[11px] font-semibold text-rose-700 mb-0.5">Remove {m.name}?</p>
                            <p className="text-[10px] text-rose-400 mb-3 leading-relaxed">
                              This can't be undone. The medication will be permanently removed.
                            </p>
                            <div className="flex gap-2">
                              <button onClick={() => removeMedication(m.id)}
                                className="flex-1 py-1.5 rounded-xl bg-rose-500 text-white text-[11px] font-bold">
                                Yes, remove it
                              </button>
                              <button onClick={() => setMedicationToDelete(null)}
                                className="flex-1 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-[11px] font-semibold">
                                Keep it
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Steps ─────────────────────────────────────────────────────────── */}
      {isNative ? (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Activity size={18} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-500">Steps today</p>
              {connected && vitals?.steps != null
                ? <p className="text-base font-extrabold text-gray-800 mt-0.5">{vitals.steps.toLocaleString()}</p>
                : <p className="text-sm text-gray-300 font-medium mt-0.5">No data yet</p>}
            </div>
            {connected
              ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
              : (
                <button onClick={() => setShowConnect(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '0.75px solid rgba(99,102,241,0.2)', color: '#6366f1' }}>
                  <Plus size={12} /> Connect
                </button>
              )}
          </div>
          {!connected && (
            <p className="text-[10px] text-gray-300 mt-2.5 pl-[52px]">
              {isIOS ? 'Sync from Apple Health' : 'Sync from Google Health Connect'}
            </p>
          )}
        </div>
      ) : (
        <WebHealthPrompt />
      )}

      {/* ── Health Vitals ─────────────────────────────────────────────────── */}
      {isNative && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Health Vitals</p>
          <div className="grid grid-cols-3 gap-2.5">
            <VitalCard icon="❤️" label="Heart Rate" unit="bpm"  value={vitals?.heartRate} connected={connected} onConnect={() => setShowConnect(true)} />
            <VitalCard icon="🫁" label="SpO₂"       unit="%"    value={vitals?.spo2}      connected={connected} onConnect={() => setShowConnect(true)} />
            <VitalCard icon="🔥" label="Calories"   unit="kcal" value={vitals?.calories}  connected={connected} onConnect={() => setShowConnect(true)} />
          </div>
        </div>
      )}

      {/* ── Day detail modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <DayDetailModal
            key={selectedDay.toDateString()}
            day={selectedDay}
            symptoms={currentSymptoms}
            memberId={currentMember?.id}
            onClose={() => setSelectedDay(null)}
            onResolve={(id) => { resolveSymptom(id) }}
            onLogPain={() => navigate('/log-pain')}
          />
        )}
      </AnimatePresence>

      {/* ── Body Map Sheet ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBodyMap && (
          <BodyMapModal
            onClose={() => setShowBodyMap(false)}
            onSymptomAdded={handleSymptomAdded}
            skinColor={skinColor}
          />
        )}
      </AnimatePresence>

      {/* ── Connect Health modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showConnect && (
          <ConnectHealthModal
            onClose={() => { setShowConnect(false); setHealthUnavail(false); setNotInstalled(false) }}
            onConnect={handleConnect}
            connecting={connecting}
            isIOS={isIOS}
            isAndroid={isAndroid}
            isNative={isNative}
            unavailable={healthUnavail}
            notInstalled={notInstalled}
          />
        )}
      </AnimatePresence>

      {/* ── Add Condition modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddCond && <AddConditionModal onClose={() => setShowAddCond(false)} />}
      </AnimatePresence>

      {/* ── Add Medication modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddMed && (
          <AddMedicationModal
            onClose={() => setShowAddMed(false)}
            conditions={currentConditions}
          />
        )}
      </AnimatePresence>

      {/* ── Condition detail modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCond && (
          <ConditionDetailModal
            key={selectedCond.id}
            condition={selectedCond}
            onClose={() => setSelectedCond(null)}
            onAddMed={() => setShowAddMed(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Delete medication confirmation ──────────────────────────────── */}
    </div>
  )
}
