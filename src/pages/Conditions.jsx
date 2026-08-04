import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Pill, Heart, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CHRONIC_CONDITION_PRESETS, SYMPTOM_CATEGORIES } from '../data/mockData'
import ConditionCard from '../components/Conditions/ConditionCard'

// ── Add condition modal ───────────────────────────────────────────────────────
function AddConditionModal({ onClose }) {
  const { addCondition } = useApp()
  const [query,      setQuery]     = useState('')
  const [selected,   setSelected]  = useState(null)
  const [severity,   setSeverity]  = useState('mild')
  const [diagDate,   setDiagDate]  = useState('')
  const [notes,      setNotes]     = useState('')
  const [linkedCats, setLinkedCats]= useState([])
  const [step,       setStep]      = useState('pick') // pick | details

  const filtered = CHRONIC_CONDITION_PRESETS.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  function selectPreset(p) {
    setSelected(p)
    // auto-link the matching category if available
    const cat = SYMPTOM_CATEGORIES.find(c => c.id === p.category)
    if (cat) setLinkedCats([cat.id])
    setStep('details')
  }

  function handleSave() {
    if (!selected) return
    addCondition({
      name:              selected.name,
      icon:              selected.icon,
      icd:               selected.icd,
      severity,
      diagnosedDate:     diagDate || null,
      notes,
      linkedCategories:  linkedCats,
    })
    onClose()
  }

  function toggleCat(catId) {
    setLinkedCats(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        transition={{ type: 'spring', damping: 28 }}
        className="relative bg-white rounded-t-3xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-black">
              {step === 'pick' ? 'Add Condition' : selected?.name}
            </h2>
            <p className="text-xs text-black/75 mt-0.5">
              {step === 'pick' ? 'Select from common conditions' : 'Fill in details'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {step === 'details' && (
              <button onClick={() => setStep('pick')} className="text-xs text-primary-500 font-semibold">← Back</button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* STEP 1 — Pick preset */}
        {step === 'pick' && (
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/75" />
              <input
                type="text"
                placeholder="Search conditions…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="space-y-2">
              {filtered.map(p => (
                <button
                  key={p.name}
                  onClick={() => selectPreset(p)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-primary-50 hover:border-primary-200 border border-transparent transition-all text-left"
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-black">{p.name}</p>
                    <p className="text-[11px] text-black/75">ICD: {p.icd} · {p.category}</p>
                  </div>
                  <span className="text-primary-400 text-lg">›</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-black/75 py-6">No matches found</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 — Details */}
        {step === 'details' && selected && (
          <div className="flex-1 overflow-y-auto px-5 space-y-4">
            {/* Severity */}
            <div>
              <label className="text-xs font-semibold text-black/75 block mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {['mild', 'moderate', 'severe'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all capitalize ${
                      severity === s
                        ? s === 'mild' ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : s === 'moderate' ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-gray-100 text-black/75'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnosed date */}
            <div>
              <label className="text-xs font-semibold text-black/75 block mb-1.5">Diagnosis Date (optional)</label>
              <input
                type="date"
                value={diagDate}
                onChange={e => setDiagDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
              />
            </div>

            {/* Linked symptom categories */}
            <div>
              <label className="text-xs font-semibold text-black/75 block mb-2">Monitor Symptom Categories</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_CATEGORIES.filter(c => c.id !== 'other').map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCat(cat.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border-2 transition-all"
                    style={
                      linkedCats.includes(cat.id)
                        ? { background: cat.color + '18', borderColor: cat.color, color: cat.color }
                        : { borderColor: '#e5e7eb', color: '#9ca3af' }
                    }
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-black/75 block mb-1.5">Clinical Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Triggers, management strategy, doctor notes…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>
        )}

        {/* Footer save button */}
        {step === 'details' && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-50">
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-2xl bg-primary-600 text-white font-extrabold text-sm hover:bg-primary-700 transition-colors"
            >
              Add {selected?.name}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Add medication modal ──────────────────────────────────────────────────────
function AddMedicationModal({ onClose, conditions }) {
  const { addMedication } = useApp()
  const [name,      setName]      = useState('')
  const [dosage,    setDosage]    = useState('')
  const [frequency, setFrequency] = useState('')
  const [condId,    setCondId]    = useState(conditions[0]?.id || '')

  const FREQS = ['Once daily', 'Twice daily', 'Three times daily', 'As needed (PRN)', 'Weekly', 'Other']

  function handleSave(e) {
    e.preventDefault()
    if (!name) return
    addMedication({ name, dosage, frequency, conditionId: condId || null })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
        transition={{ type: 'spring', damping: 28 }}
        className="relative bg-white rounded-t-3xl w-full max-w-md"
      >
        <div className="flex justify-between items-center px-5 pt-5 pb-3">
          <h2 className="text-sm font-extrabold text-black">Add Medication</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSave} className="px-5 pb-8 space-y-3">
          <input
            type="text" placeholder="Medication name *" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
          />
          <input
            type="text" placeholder="Dosage (e.g. 100mcg, 5mg)" value={dosage}
            onChange={e => setDosage(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400"
          />
          <div className="flex flex-wrap gap-2">
            {FREQS.map(f => (
              <button key={f} type="button" onClick={() => setFrequency(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all ${
                  frequency === f ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 text-black/75'
                }`}>
                {f}
              </button>
            ))}
          </div>
          {conditions.length > 0 && (
            <select
              value={condId} onChange={e => setCondId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">Not linked to condition</option>
              {conditions.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          )}
          <button type="submit" disabled={!name}
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-extrabold text-sm disabled:opacity-40">
            Add Medication
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Conditions() {
  const {
    currentMember, currentConditions, currentMedications,
    currentSymptoms, currentRiskProfile,
  } = useApp()

  const [showAddCond, setShowAddCond] = useState(false)
  const [showAddMed,  setShowAddMed]  = useState(false)

  const riskLevel = currentRiskProfile?.riskLevel || 'normal'
  const riskColors = {
    normal:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    high:     'bg-amber-50  text-amber-700  border-amber-200',
    critical: 'bg-rose-50   text-rose-700   border-rose-200',
  }

  // Standalone meds (not linked to a condition)
  const standaloneMeds = currentMedications.filter(
    m => !m.conditionId || !currentConditions.find(c => c.id === m.conditionId)
  )

  return (
    <div className="px-4 pt-4 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-black">Conditions</h2>
          <p className="text-xs text-black/75 mt-0.5">
            {currentMember?.name} · {currentConditions.length} condition{currentConditions.length !== 1 ? 's' : ''} · {currentMedications.length} med{currentMedications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddMed(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
            <Pill size={13} /> Med
          </button>
          <button onClick={() => setShowAddCond(true)}
            className="flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-primary-700 transition-colors">
            <Plus size={13} /> Condition
          </button>
        </div>
      </div>

      {/* Risk level badge */}
      {currentRiskProfile && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border mb-4 ${riskColors[riskLevel]}`}>
          <Heart size={14} />
          <p className="text-xs font-bold capitalize">
            Risk Level: {riskLevel}
            {currentRiskProfile.mandatoryCheckIn && ' · Check-in required'}
          </p>
        </div>
      )}

      {/* Conditions list */}
      {currentConditions.length === 0 ? (
        <div className="text-center py-10 glass-card rounded-3xl mb-4">
          <div className="text-5xl mb-3">🏥</div>
          <p className="text-sm font-bold text-black/75">No conditions recorded</p>
          <p className="text-xs text-black/75 mt-1">Add chronic conditions to track symptoms and medications</p>
          <button onClick={() => setShowAddCond(true)}
            className="mt-4 bg-primary-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl">
            Add first condition
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {currentConditions.map(c => (
            <ConditionCard
              key={c.id}
              condition={c}
              medications={currentMedications}
              symptoms={currentSymptoms}
            />
          ))}
        </div>
      )}

      {/* Standalone medications */}
      {standaloneMeds.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-extrabold text-black/75 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pill size={13} className="text-indigo-400" />
            Other Medications
          </p>
          <div className="space-y-2">
            {standaloneMeds.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-indigo-50 rounded-xl px-3 py-2.5">
                <Pill size={13} className="text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-indigo-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-indigo-400">{m.dosage} · {m.frequency}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddCond && <AddConditionModal onClose={() => setShowAddCond(false)} />}
        {showAddMed  && <AddMedicationModal onClose={() => setShowAddMed(false)} conditions={currentConditions} />}
      </AnimatePresence>
    </div>
  )
}
