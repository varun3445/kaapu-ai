import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Plus, X, Smartphone, Activity } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ActivityChart from '../components/Dashboard/ActivityChart'
import DailyCheckIn from '../components/CheckIn/DailyCheckIn'
import { FEELING_CONFIG, SYMPTOM_CATEGORIES } from '../data/mockData'
import { format, isToday } from 'date-fns'

// ── Daily check-in modal ─────────────────────────────────────────────────────
// targetDate – Date object (for past days) or undefined (today)
function CheckInModal({ onClose, targetDate }) {
  const isPast   = targetDate && !isToday(targetDate)
  const title    = isPast ? `Check-in · ${format(targetDate, 'EEE, d MMM')}` : 'Daily Check-in'

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative glass-elevated rounded-3xl w-full max-w-sm p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <DailyCheckIn onClose={onClose} targetDate={targetDate} />
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Connect Health modal ──────────────────────────────────────────────────────
function ConnectHealthModal({ onClose }) {
  return createPortal(
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
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-extrabold text-gray-900">Connect Health App</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={13} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Sync vitals automatically from your phone.</p>

        <div className="space-y-3">
          {/* Apple Health */}
          <button className="w-full flex items-center gap-4 glass-card rounded-2xl p-4 text-left hover:bg-white/80 transition-colors active:scale-[0.98]">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #ff2d55 0%, #ff6b6b 100%)' }}>
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Apple Health</p>
              <p className="text-xs text-gray-400 mt-0.5">Heart rate, steps, SpO₂, sleep & more</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>

          {/* Google Health Connect */}
          <button className="w-full flex items-center gap-4 glass-card rounded-2xl p-4 text-left hover:bg-white/80 transition-colors active:scale-[0.98]">
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
              <p className="text-xs text-gray-400 mt-0.5">Android health data, activity & vitals</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>
        </div>

        <p className="text-[10px] text-gray-300 text-center mt-4">
          Coming soon — integration in development
        </p>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── "Connect Health" placeholder card ────────────────────────────────────────
function ConnectHealthCard({ icon, label, onConnect }) {
  return (
    <div className="glass-card rounded-2xl p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        <Smartphone size={12} className="text-gray-300" />
      </div>
      <p className="text-[10px] text-gray-400 font-medium leading-none">{label}</p>
      <button
        onClick={onConnect}
        className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center hover:bg-primary-100 transition-colors"
      >
        <Plus size={13} className="text-primary-500" />
      </button>
    </div>
  )
}

// ── Mood streak mini-bar ──────────────────────────────────────────────────────
const MOOD_BAR_H = { great: 'h-14', good: 'h-10', okay: 'h-7', bad: 'h-4', terrible: 'h-2' }

// Always shows 7 consecutive calendar days (today + 6 prior).
// Days with a check-in show the bar; empty days show a tappable placeholder.
function MoodBar({ checkIns, onAddForDay }) {
  // Build today's date at midnight local time, then go back 6 days
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i)) // [today-6 … today]
    return d
  })

  return (
    <div className="flex items-end gap-1.5">
      {days.map((day) => {
        const dayStr = day.toDateString()
        const lbl    = isToday(day) ? 'Today' : format(day, 'EEE')
        // Latest check-in for this calendar day
        const ci = checkIns
          .filter(c => new Date(c.date).toDateString() === dayStr)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null

        if (ci) {
          const cfg = FEELING_CONFIG[ci.feeling]
          return (
            <div key={dayStr} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-base leading-none">{cfg.emoji}</span>
              <div
                className={`w-full rounded-lg transition-all ${MOOD_BAR_H[ci.feeling]}`}
                style={{ background: cfg.color + '55', border: `2px solid ${cfg.color}` }}
              />
              <span className="text-[9px] text-gray-400 font-medium">{lbl}</span>
            </div>
          )
        }

        // Empty slot — tappable
        return (
          <button
            key={dayStr}
            onClick={() => onAddForDay(day)}
            className="flex-1 flex flex-col items-center gap-1 group"
            aria-label={`Add check-in for ${lbl}`}
          >
            <span className="text-base leading-none text-transparent group-hover:text-primary-300 transition-colors select-none">+</span>
            <div className="w-full h-4 rounded-lg bg-gray-100 border-2 border-dashed border-gray-200 group-hover:border-primary-300 group-hover:bg-primary-50 transition-all flex items-center justify-center">
              <Plus size={8} className="text-gray-300 group-hover:text-primary-400 transition-colors" />
            </div>
            <span className="text-[9px] text-gray-300 font-medium group-hover:text-gray-400 transition-colors">{lbl}</span>
          </button>
        )
      })}
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
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          sev >= 7 ? 'bg-rose-100 text-rose-600' : sev >= 5 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
        }`}>{sev >= 7 ? '⚠ High' : sev >= 5 ? 'Mid' : 'Low'}</span>
        <button onClick={() => onResolve(symptom.id)} className="p-1 text-gray-300 hover:text-rose-400 transition-colors">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const { currentMember, currentSymptoms, currentCheckIns, resolveSymptom } = useApp()
  // checkInDate: null = closed, Date = which calendar day to log for
  const [checkInDate, setCheckInDate] = useState(null)
  const [showConnect, setShowConnect] = useState(false)

  const activeSymptoms = currentSymptoms.filter(s => !s.resolved)
  const todayCheckIn   = currentCheckIns.find(c => isToday(new Date(c.date)))
  const todayCfg       = todayCheckIn ? FEELING_CONFIG[todayCheckIn.feeling] : null

  function openCheckIn(date) {
    // date is a Date at midnight local time for that day; pass as-is
    setCheckInDate(date instanceof Date ? date : new Date())
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4 max-w-lg mx-auto">

      {/* ── Today's mood / check-in hero ──────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        className="glass-card rounded-3xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium">How are you feeling?</p>
            {todayCfg ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl">{todayCfg.emoji}</span>
                <div>
                  <p className="text-base font-extrabold text-gray-800">{todayCfg.label}</p>
                  {todayCheckIn?.notes && <p className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate">{todayCheckIn.notes}</p>}
                </div>
              </div>
            ) : (
              <p className="text-base font-bold text-gray-400 mt-1">No check-in yet</p>
            )}
          </div>
          <button onClick={() => openCheckIn(new Date())}
            className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-2 rounded-xl hover:bg-primary-100 transition-colors">
            <Plus size={13} /> Check in
          </button>
        </div>

        {/* 7-day mood bar — always shown, empty slots are tappable */}
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">7-day mood</p>
          <MoodBar checkIns={currentCheckIns} onAddForDay={openCheckIn} />
        </div>
      </motion.div>

      {/* ── Pain / symptom section ────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Pain & Symptoms</h3>
            <p className="text-xs text-gray-400">
              {activeSymptoms.length > 0 ? `${activeSymptoms.length} active` : 'Nothing logged yet'}
            </p>
          </div>
          <button onClick={() => navigate('/body-map')}
            className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl hover:bg-primary-100 transition-colors">
            <Plus size={13} /> Log
          </button>
        </div>

        {activeSymptoms.length > 0 ? (
          <div className="space-y-2">
            {activeSymptoms.slice(0, 3).map(s => (
              <SymptomPill key={s.id} symptom={s} onResolve={resolveSymptom} />
            ))}
            {activeSymptoms.length > 3 && (
              <button onClick={() => navigate('/history')}
                className="w-full text-center text-xs text-primary-600 font-semibold py-1.5">
                +{activeSymptoms.length - 3} more — view all →
              </button>
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
      </div>

      {/* ── Steps (connect state) ─────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Activity size={18} className="text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500">Steps today</p>
            <p className="text-sm text-gray-300 font-medium mt-0.5">No data yet</p>
          </div>
          <button onClick={() => setShowConnect(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.08)', border: '0.75px solid rgba(99,102,241,0.2)', color: '#6366f1' }}>
            <Plus size={12} /> Connect
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-2.5 pl-[52px]">Sync from Apple Health or Google Health Connect</p>
      </div>

      {/* ── Connect Health metrics ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Health Vitals</p>
        <div className="grid grid-cols-3 gap-2.5">
          <ConnectHealthCard icon="❤️" label="Heart Rate" onConnect={() => setShowConnect(true)} />
          <ConnectHealthCard icon="🫁" label="SpO₂"       onConnect={() => setShowConnect(true)} />
          <ConnectHealthCard icon="🔥" label="Calories"   onConnect={() => setShowConnect(true)} />
        </div>
      </div>

      {/* ── Activity chart ────────────────────────────────────────────────── */}
      <ActivityChart onConnect={() => setShowConnect(true)} />

      {/* ── Check-in modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {checkInDate && (
          <CheckInModal
            key={checkInDate.toDateString()}
            targetDate={checkInDate}
            onClose={() => setCheckInDate(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Connect Health modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showConnect && <ConnectHealthModal onClose={() => setShowConnect(false)} />}
      </AnimatePresence>
    </div>
  )
}
