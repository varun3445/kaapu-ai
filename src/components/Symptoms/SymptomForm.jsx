import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SYMPTOM_CATEGORIES } from '../../data/mockData'

const DURATIONS = ['Just started', 'A few hours', '1 day', '2–3 days', '1 week', '2+ weeks', 'Ongoing']

export default function SymptomForm({ region, onSubmit, onClose }) {
  const [categoryId, setCategoryId] = useState('')
  const [typeIdx,    setTypeIdx]    = useState(0)
  const [customType, setCustomType] = useState('')
  const [severity,   setSeverity]   = useState(5)
  const [duration,   setDuration]   = useState(DURATIONS[0])
  const [notes,      setNotes]      = useState('')

  const category = SYMPTOM_CATEGORIES.find(c => c.id === categoryId)
  const types    = category?.types || []
  const isOther  = categoryId === 'other'

  const severityLabel = severity <= 2 ? 'Mild' : severity <= 4 ? 'Mild–Moderate' : severity <= 6 ? 'Moderate' : severity <= 8 ? 'Severe' : 'Very Severe'
  const severityColor = severity <= 3 ? '#10b981' : severity <= 5 ? '#f59e0b' : severity <= 7 ? '#f97316' : '#ef4444'

  function handleSubmit(e) {
    e.preventDefault()
    if (!categoryId) return
    onSubmit({
      bodyRegion:    region.id,
      bodyLabel:     region.label,
      category:      categoryId,
      categoryLabel: category.label,
      type:          isOther ? customType || 'Custom' : types[typeIdx] || types[0],
      severity,
      duration,
      notes,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/*
        Sheet — flex column so header + scroll-area + sticky-footer stack cleanly.
        max-h leaves room above the bottom nav (~5rem) on mobile.
      */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative glass-elevated rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-card-lg flex flex-col mb-[4.5rem] sm:mb-0"
        style={{ maxHeight: 'calc(100dvh - 9rem)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header (fixed, never scrolls) ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Log Symptom</p>
            <h2 className="text-lg font-bold text-gray-800 mt-0.5">{region.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable form fields ── */}
        <form id="symptom-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 space-y-5 pb-4">

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SYMPTOM_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategoryId(cat.id); setTypeIdx(0) }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    categoryId === cat.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-xs font-medium text-gray-700 leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <AnimatePresence>
            {categoryId && !isOther && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {types.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeIdx(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        typeIdx === i
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-primary-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {isOther && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Describe
                </label>
                <input
                  type="text"
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  placeholder="e.g. Tingling in fingers"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Severity */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</label>
              <span className="text-xs font-bold" style={{ color: severityColor }}>
                {severity}/10 — {severityLabel}
              </span>
            </div>
            <input
              type="range"
              min={1} max={10} step={1}
              value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-300 mt-1">
              <span>Mild</span><span>Very severe</span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Duration
            </label>
            <div className="relative">
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm appearance-none focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white"
              >
                {DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional details…"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {/* Warning for high severity */}
          {severity >= 7 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700 font-medium">
              ⚠️ This is a high severity symptom. Consider reaching out to a doctor.
            </div>
          )}
        </form>

        {/* ── Sticky footer — always visible above the nav bar ── */}
        <div className="flex-shrink-0 px-6 pt-3 pb-6 bg-white border-t border-gray-100">
          <button
            type="submit"
            form="symptom-form"
            disabled={!categoryId}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
          >
            Log Symptom
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
