import { useState } from 'react'
import { X, ChevronDown, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SYMPTOM_CATEGORIES } from '../../data/mockData'

const DURATIONS = ['Just started', 'A few hours', '1 day', '2–3 days', '1 week', '2+ weeks', 'Ongoing']

const SEV_COLOR = (s) =>
  s <= 3 ? '#10b981' : s <= 5 ? '#f59e0b' : s <= 7 ? '#f97316' : '#ef4444'
const SEV_LABEL = (s) =>
  s <= 2 ? 'Mild' : s <= 4 ? 'Mild–Moderate' : s <= 6 ? 'Moderate' : s <= 8 ? 'Severe' : 'Very Severe'

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
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: 'white',
          maxHeight: 'calc(100dvh - 7rem)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Gradient header ── */}
        <div
          className="px-6 pt-6 pb-5 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin size={12} className="text-indigo-200" />
                <p className="text-indigo-200 text-[11px] font-semibold uppercase tracking-widest">
                  Log Symptom
                </p>
              </div>
              <h2 className="text-white font-extrabold text-xl leading-tight">{region.label}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <form
          id="symptom-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
          style={{ background: '#f9f9fb' }}
        >

          {/* Category */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Category
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SYMPTOM_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategoryId(cat.id); setTypeIdx(0) }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left transition-all"
                  style={{
                    background: categoryId === cat.id ? 'white' : 'white',
                    border: categoryId === cat.id
                      ? '2px solid #6366f1'
                      : '1.5px solid rgba(0,0,0,0.08)',
                    boxShadow: categoryId === cat.id
                      ? '0 0 0 3px rgba(99,102,241,0.12)'
                      : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <span className="text-lg leading-none">{cat.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type chips */}
          <AnimatePresence>
            {categoryId && !isOther && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {types.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeIdx(i)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: typeIdx === i ? '#6366f1' : 'white',
                        color:      typeIdx === i ? 'white' : '#374151',
                        border:     typeIdx === i ? '1.5px solid #6366f1' : '1.5px solid rgba(0,0,0,0.10)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            {isOther && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Describe</p>
                <input
                  type="text"
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  placeholder="e.g. Tingling in fingers"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  style={{ border: '1.5px solid rgba(0,0,0,0.10)' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Severity */}
          <div className="bg-white rounded-2xl px-4 py-4" style={{ border: '1.5px solid rgba(0,0,0,0.07)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Severity</p>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: SEV_COLOR(severity) }}>
                {severity}/10 — {SEV_LABEL(severity)}
              </span>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-gray-300 mt-1 font-medium">
              <span>Mild</span><span>Very severe</span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Duration</p>
            <div className="relative">
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ border: '1.5px solid rgba(0,0,0,0.10)' }}
              >
                {DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Notes <span className="normal-case font-normal">(optional)</span></p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional details…"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ border: '1.5px solid rgba(0,0,0,0.10)' }}
            />
          </div>

          {/* High severity warning */}
          {severity >= 7 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl px-4 py-3 text-xs font-semibold"
              style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', color: '#e11d48' }}
            >
              ⚠️ High severity — consider reaching out to a doctor.
            </motion.div>
          )}
        </form>

        {/* ── Sticky footer ── */}
        <div
          className="flex-shrink-0 px-5 py-4"
          style={{ background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <button
            type="submit"
            form="symptom-form"
            disabled={!categoryId}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: categoryId
                ? 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
                : '#e5e7eb',
              color: categoryId ? 'white' : '#9ca3af',
            }}
          >
            Log Symptom
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
