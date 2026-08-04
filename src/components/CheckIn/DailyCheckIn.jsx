import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isToday, format } from 'date-fns'
import { FEELING_CONFIG } from '../../data/mockData'
import { useApp } from '../../context/AppContext'

// targetDate – optional Date object for a past-day check-in (defaults to today)
export default function DailyCheckIn({ onClose, targetDate }) {
  const { addCheckIn, currentCheckIns } = useApp()

  const target   = targetDate instanceof Date ? targetDate : new Date()
  const isPast   = !isToday(target)
  const dayLabel = isPast ? format(target, 'EEE, d MMM') : 'today'

  // Find any existing entry for this calendar day
  const targetEntry = currentCheckIns.find(
    c => new Date(c.date).toDateString() === target.toDateString()
  )
  const isEdit = !!targetEntry

  // Pre-populate from existing entry so editing is seamless
  const [feeling, setFeeling] = useState(targetEntry?.feeling ?? null)
  const [notes,   setNotes]   = useState(targetEntry?.notes   ?? '')
  const [done,    setDone]    = useState(false)

  function handleSubmit() {
    if (!feeling) return
    addCheckIn({ feeling, notes }, isPast ? target : undefined)
    setDone(true)
    setTimeout(() => onClose?.(), 1400)
  }

  if (done) {
    const cfg = FEELING_CONFIG[feeling]
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center py-8 gap-3"
      >
        <div className="text-5xl">{cfg.emoji}</div>
        <p className="text-base font-semibold text-black">{isEdit ? 'Check-in updated!' : 'Check-in saved!'}</p>
        <p className="text-sm text-black/75">
          {isPast ? `Logged for ${format(target, 'EEE, d MMM')}.` : 'Keep taking care of yourself.'}
        </p>
      </motion.div>
    )
  }

  return (
    <div className="py-2">
      {isEdit && (
        <div className="mb-4 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
          style={{
            background: FEELING_CONFIG[targetEntry.feeling]?.bg,
            color: FEELING_CONFIG[targetEntry.feeling]?.color
          }}>
          <span>{FEELING_CONFIG[targetEntry.feeling]?.emoji}</span>
          <span>Editing {isPast ? format(target, 'EEE d MMM') : "today"}'s check-in — select a new mood to update</span>
        </div>
      )}

      <p className="text-sm text-black/75 mb-4 font-medium">
        How were you feeling {isPast ? `on ${dayLabel}` : dayLabel}?
      </p>

      <div className="flex justify-between gap-2 mb-5">
        {Object.entries(FEELING_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFeeling(key)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
              feeling === key
                ? 'border-current scale-105 shadow-sm'
                : 'border-gray-100 hover:border-gray-200'
            }`}
            style={feeling === key ? { borderColor: cfg.color, background: cfg.bg } : {}}
          >
            <span className="text-2xl">{cfg.emoji}</span>
            <span className="text-[10px] font-semibold" style={{ color: feeling === key ? cfg.color : '#9ca3af' }}>
              {cfg.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {feeling && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything else to note? (optional)"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 mb-4"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleSubmit}
        disabled={!feeling}
        className="w-full py-3 rounded-2xl font-semibold text-sm bg-primary-600 hover:bg-primary-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isEdit ? 'Update Check-in' : 'Save Check-in'}
      </button>
    </div>
  )
}
