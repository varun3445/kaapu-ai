import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pill, Loader, Clock, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import useMedicationInfo from '../../hooks/useMedicationInfo'

// Extract dosage embedded in a medication name, e.g. "Dolo 650" → "650mg"
function extractDosageFromName(name) {
  const withUnit = name.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|iu|units?)\b/i)
  if (withUnit) return `${withUnit[1]}${withUnit[2].toLowerCase()}`
  const bare = name.match(/\b(\d{2,4})\b/)
  if (bare) return `${bare[1]}mg`
  return null
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FREQS = ['Once daily', 'Twice daily', 'Three times daily', 'As needed (PRN)', 'Weekly', 'Other']

export default function AddMedicationModal({ onClose, conditions }) {
  const { addMedication } = useApp()
  const [name,      setName]      = useState('')
  const [dosage,    setDosage]    = useState('')
  const [frequency, setFrequency] = useState('')
  const [condId,    setCondId]    = useState(conditions[0]?.id || '')
  const [dosageAutoFilled, setDosageAutoFilled] = useState(false)
  const [days,      setDays]      = useState([])   // [] = every day
  const [times,     setTimes]     = useState([''])  // list of HH:MM strings

  const { info, loading } = useMedicationInfo(name)

  // Auto-fill dosage from the name as the user types (e.g. "Dolo 650")
  function handleNameChange(e) {
    const val = e.target.value
    setName(val)
    const extracted = extractDosageFromName(val)
    if (extracted && (!dosage || dosageAutoFilled)) {
      setDosage(extracted)
      setDosageAutoFilled(true)
    } else if (!extracted && dosageAutoFilled) {
      setDosage('')
      setDosageAutoFilled(false)
    }
  }

  // Auto-fill dosage from AI/static info card when it arrives
  useEffect(() => {
    if (info?.suggestedDosage && !dosage) {
      setDosage(info.suggestedDosage)
      setDosageAutoFilled(true)
    }
  }, [info])

  // Sync number of time slots with frequency choice
  useEffect(() => {
    if (frequency === 'Once daily')        setTimes(t => t.slice(0,1).concat([''].slice(0, Math.max(0, 1 - t.filter(Boolean).length))).slice(0,1).map(v => v || ''))
    if (frequency === 'Twice daily')       setTimes(['', ''])
    if (frequency === 'Three times daily') setTimes(['', '', ''])
    if (frequency === 'Weekly')            setTimes([''])
  }, [frequency])

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function updateTime(i, val) {
    setTimes(prev => prev.map((t, idx) => idx === i ? val : t))
  }

  function addTime() {
    setTimes(prev => [...prev, ''])
  }

  function removeTime(i) {
    setTimes(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleSave(e) {
    e.preventDefault()
    if (!name) return
    addMedication({
      name,
      dosage,
      frequency,
      conditionId: condId || null,
      days: days.length > 0 ? days : null,
      times: times.filter(Boolean),
    })
    onClose()
  }

  const sevColor = {
    bg: '#f0f4ff', border: '#c7d2fe', class: '#4f46e5',
  }

  const showDays  = frequency !== 'As needed (PRN)'
  const showTimes = frequency !== 'As needed (PRN)'

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'white', maxHeight: '90vh', boxShadow: '0 -4px 40px rgba(0,0,0,0.18)' }}
      >
        <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-extrabold text-gray-800">Add Medication</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>

          {/* Medication name */}
          <input
            type="text"
            placeholder="Medication name *"
            value={name}
            onChange={handleNameChange}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
          />

          {/* Info card */}
          <AnimatePresence>
            {(info || loading) && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl px-4 py-3 border" style={{ background: sevColor.bg, borderColor: sevColor.border }}>
                  {loading ? (
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Loader size={13} className="animate-spin" />
                      <p className="text-xs font-medium">Looking up medication…</p>
                    </div>
                  ) : info ? (
                    <>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Pill size={12} style={{ color: sevColor.class }} />
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sevColor.class }}>{info.drugClass}</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mb-0.5">{info.name}</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{info.description} {info.uses}</p>
                    </>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dosage */}
          <div className="relative">
            <input
              type="text"
              placeholder="Dosage (e.g. 100mcg, 5mg)"
              value={dosage}
              onChange={e => { setDosage(e.target.value); setDosageAutoFilled(false) }}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-primary-400 ${
                dosageAutoFilled ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200'
              }`}
            />
            {dosageAutoFilled && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-indigo-400 pointer-events-none">
                suggested
              </span>
            )}
          </div>

          {/* Frequency */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Frequency</p>
            <div className="flex flex-wrap gap-2">
              {FREQS.map(f => (
                <button
                  key={f} type="button"
                  onClick={() => setFrequency(f === frequency ? '' : f)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all ${
                    frequency === f
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-100 text-gray-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Days of week */}
          <AnimatePresence>
            {showDays && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Days
                  {days.length === 0 && <span className="ml-1.5 normal-case font-medium text-gray-300">(every day)</span>}
                </p>
                <div className="flex gap-1.5">
                  {DAYS.map(d => (
                    <button
                      key={d} type="button"
                      onClick={() => toggleDay(d)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        days.includes(d)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {d[0]}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Times */}
          <AnimatePresence>
            {showTimes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Time(s)</p>
                <div className="space-y-2">
                  {times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                        <input
                          type="time"
                          value={t}
                          onChange={e => updateTime(i, e.target.value)}
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 bg-white"
                        />
                      </div>
                      {times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTime(i)}
                          className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {times.length < 6 && (
                    <button
                      type="button"
                      onClick={addTime}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 py-1"
                    >
                      <Plus size={13} /> Add another time
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Link to condition */}
          {conditions.length > 0 && (
            <select
              value={condId}
              onChange={e => setCondId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">Not linked to condition</option>
              {conditions.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={!name}
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-extrabold text-sm disabled:opacity-40"
          >
            Add Medication
          </button>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  )
}
