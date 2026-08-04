import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pill, Loader } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import useMedicationInfo from '../../hooks/useMedicationInfo'
import ConditionSelect from './ConditionSelect'

// Extract dosage embedded in a medication name, e.g. "Dolo 650" → "650mg"
function extractDosageFromName(name) {
  const withUnit = name.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|iu|units?)\b/i)
  if (withUnit) return `${withUnit[1]}${withUnit[2].toLowerCase()}`
  const bare = name.match(/\b(\d{2,4})\b/)
  if (bare) return `${bare[1]}mg`
  return null
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// value = what's actually stored; label = what's shown on the button.
const FREQS = [
  { value: 'Once daily', label: 'Once' },
  { value: 'Twice daily', label: 'Twice' },
  { value: 'Three times daily', label: 'Three times' },
  { value: 'As needed (PRN)', label: 'As needed (PRN)' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Other', label: 'Other' },
]
// How many reminder times a frequency allows — picking "Once" then a second
// time doesn't make sense, so cap the selection to match.
const FREQ_MAX_TIMES = { 'Once daily': 1, 'Twice daily': 2, 'Three times daily': 3, Weekly: 1 }
function maxTimesFor(freq) {
  return FREQ_MAX_TIMES[freq] ?? Infinity
}
const TIME_PRESETS = [
  { label: 'Morning', time: '09:30' },
  { label: 'Noon', time: '13:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '21:30' },
]

export default function AddMedicationModal({ onClose, conditions }) {
  const { addMedication } = useApp()
  const [name,      setName]      = useState('')
  const [dosage,    setDosage]    = useState('')
  const [frequency, setFrequency] = useState('')
  const [condId,    setCondId]    = useState(conditions[0]?.id || '')
  const [dosageAutoFilled, setDosageAutoFilled] = useState(false)
  const [days,      setDays]      = useState([])   // [] = every day
  const [timePresets, setTimePresets] = useState([])  // array of preset labels (Morning, Noon, Evening, Night)

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

  // Reset timePresets when frequency changes
  useEffect(() => {
    setTimePresets([])
  }, [frequency])

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function toggleTimePreset(preset) {
    setTimePresets(prev => {
      if (prev.includes(preset.label)) return prev.filter(p => p !== preset.label)
      if (prev.length >= maxTimesFor(frequency)) return prev // at cap — ignore until one is deselected
      return [...prev, preset.label]
    })
  }

  function handleSave(e) {
    e.preventDefault()
    if (!name) return
    // Convert preset labels back to actual times
    const times = timePresets.map(label => TIME_PRESETS.find(p => p.label === label)?.time).filter(Boolean)
    addMedication({
      name,
      dosage,
      frequency,
      conditionId: condId || null,
      days: days.length > 0 ? days : null,
      times: times.length > 0 ? times : null,
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
          <h2 className="text-sm font-extrabold text-black">Add Medication</h2>
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
                      <p className="text-xs font-semibold text-black/80 mb-0.5">{info.name}</p>
                      <p className="text-[11px] text-black/75 leading-relaxed">{info.description} {info.uses}</p>
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/75 mb-2">Frequency</p>
            <div className="flex flex-wrap gap-2">
              {FREQS.map(f => (
                <button
                  key={f.value} type="button"
                  onClick={() => setFrequency(f.value === frequency ? '' : f.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all ${
                    frequency === f.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-100 text-black/75'
                  }`}
                >
                  {f.label}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/75 mb-2">
                  Days
                  {days.length === 0 && <span className="ml-1.5 normal-case font-medium text-black/75">(every day)</span>}
                </p>
                <div className="flex gap-1.5">
                  {DAYS.map(d => (
                    <button
                      key={d} type="button"
                      onClick={() => toggleDay(d)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        days.includes(d)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-black/75'
                      }`}
                    >
                      {d[0]}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time Presets */}
          <AnimatePresence>
            {showTimes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/75 mb-2">When to take</p>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => toggleTimePreset(preset)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                        timePresets.includes(preset.label)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-100 text-black/75'
                      }`}
                    >
                      <div>{preset.label}</div>
                      <div className="text-[10px] font-normal text-black/75 mt-0.5">{preset.time}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Link to condition */}
          {conditions.length > 0 && (
            <ConditionSelect conditions={conditions} value={condId} onChange={setCondId} />
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
