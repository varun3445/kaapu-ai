import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pill, Loader, Clock, Trash2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import useMedicationInfo from '../../hooks/useMedicationInfo'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FREQS = ['Once daily', 'Twice daily', 'Three times daily', 'As needed (PRN)', 'Weekly', 'Other']
const TIME_PRESETS = [
  { label: 'Morning', time: '09:30' },
  { label: 'Noon', time: '13:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '21:30' },
]

// "09:00" -> "9:00 AM" for display
function formatTime12(t) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

// Edit view for an existing medication — view its details, and change dosage,
// frequency, reminder days/times, or which condition it's linked to. Reuses
// the same Morning/Noon/Evening/Night presets as AddMedicationModal for
// consistency; any existing time that doesn't match a preset (e.g. an
// arbitrary time set via Kaapu AI) still shows up as its own removable chip
// rather than being silently dropped.
export default function EditMedicationModal({ medication, conditions, onClose, onRequestDelete }) {
  const { updateMedication } = useApp()
  const [name,      setName]      = useState(medication.name || '')
  const [dosage,    setDosage]    = useState(medication.dosage || '')
  const [frequency, setFrequency] = useState(medication.frequency || '')
  const [condId,    setCondId]    = useState(medication.conditionId || '')
  const [days,      setDays]      = useState(medication.days || [])

  const existingTimes = medication.times || []
  const [timePresets, setTimePresets] = useState(
    TIME_PRESETS.filter(p => existingTimes.includes(p.time)).map(p => p.label)
  )
  const [customTimes, setCustomTimes] = useState(
    existingTimes.filter(t => !TIME_PRESETS.some(p => p.time === t))
  )
  const [newTime,   setNewTime]   = useState('')

  const { info, loading } = useMedicationInfo(name)

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function toggleTimePreset(preset) {
    setTimePresets(prev =>
      prev.includes(preset.label) ? prev.filter(p => p !== preset.label) : [...prev, preset.label]
    )
  }

  function addCustomTime() {
    if (!newTime || customTimes.includes(newTime)) return
    setCustomTimes(prev => [...prev, newTime].sort())
    setNewTime('')
  }

  function removeCustomTime(t) {
    setCustomTimes(prev => prev.filter(x => x !== t))
  }

  function handleSave(e) {
    e.preventDefault()
    if (!name) return
    const presetTimes = timePresets.map(label => TIME_PRESETS.find(p => p.label === label)?.time).filter(Boolean)
    const times = [...presetTimes, ...customTimes].sort()
    updateMedication(medication.id, {
      name,
      dosage,
      frequency,
      conditionId: condId || null,
      days: days.length > 0 ? days : null,
      times: times.length > 0 ? times : null,
    })
    onClose()
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
          <h2 className="text-sm font-extrabold text-gray-800">Edit Medication</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>

          <input
            type="text"
            placeholder="Medication name *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
          />

          <AnimatePresence>
            {(info || loading) && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl px-4 py-3 border" style={{ background: '#f0f4ff', borderColor: '#c7d2fe' }}>
                  {loading ? (
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Loader size={13} className="animate-spin" />
                      <p className="text-xs font-medium">Looking up medication…</p>
                    </div>
                  ) : info ? (
                    <>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Pill size={12} className="text-indigo-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{info.drugClass}</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mb-0.5">{info.name}</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{info.description} {info.uses}</p>
                    </>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="text"
            placeholder="Dosage (e.g. 100mcg, 5mg)"
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
          />

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

          <AnimatePresence>
            {showTimes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">When to take</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {TIME_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => toggleTimePreset(preset)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                        timePresets.includes(preset.label)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-100 text-gray-400'
                      }`}
                    >
                      <div>{preset.label}</div>
                      <div className="text-[10px] font-normal text-gray-400 mt-0.5">{preset.time}</div>
                    </button>
                  ))}
                </div>

                {/* Any time that doesn't match a preset (e.g. set via Kaapu AI) — kept, not dropped */}
                {customTimes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {customTimes.map(t => (
                      <span
                        key={t}
                        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold"
                      >
                        <Clock size={11} />
                        {formatTime12(t)}
                        <button type="button" onClick={() => removeCustomTime(t)} className="ml-0.5 text-primary-400 hover:text-primary-600">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
                  />
                  <button
                    type="button"
                    onClick={addCustomTime}
                    disabled={!newTime}
                    className="px-4 py-2 rounded-xl bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold disabled:opacity-40"
                  >
                    Add other
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
            Save Changes
          </button>

          <button
            type="button"
            onClick={() => { onClose(); onRequestDelete(medication.id) }}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-rose-400 text-xs font-semibold"
          >
            <Trash2 size={12} /> Remove medication
          </button>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  )
}
