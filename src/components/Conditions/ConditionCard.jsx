import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, Pill, TrendingUp } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { SYMPTOM_CATEGORIES } from '../../data/mockData'
import { severityLabel } from '../../utils/severity'

const SEVERITY_COLORS = {
  mild:     { bg: '#d1fae5', text: '#065f46', label: 'Mild' },
  moderate: { bg: '#fef3c7', text: '#92400e', label: 'Moderate' },
  severe:   { bg: '#fee2e2', text: '#991b1b', label: 'Severe' },
}

export default function ConditionCard({ condition, medications, symptoms }) {
  const { removeCondition, removeMedication } = useApp()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const sev  = SEVERITY_COLORS[condition.severity] || SEVERITY_COLORS.mild
  const meds = medications.filter(m => m.conditionId === condition.id)

  // Symptoms linked via category
  const linkedSymptoms = symptoms.filter(s =>
    (condition.linkedCategories || []).includes(s.category) && !s.resolved
  )

  const linkedCats = SYMPTOM_CATEGORIES.filter(c => (condition.linkedCategories || []).includes(c.id))

  return (
    <motion.div layout className="glass-card rounded-2xl overflow-hidden">
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpen(o => !o)}>
        {/* Icon */}
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: sev.bg }}>
          {condition.icon || '🏥'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-extrabold text-gray-800">{condition.name}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: sev.bg, color: sev.text }}>
              {sev.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-gray-400">ICD: {condition.icd}</p>
            {condition.diagnosedDate && (
              <p className="text-[11px] text-gray-300">
                · Since {new Date(condition.diagnosedDate).getFullYear()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {linkedSymptoms.length > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {linkedSymptoms.length} active
            </span>
          )}
          <div className="flex items-center gap-1 text-gray-300">
            <Pill size={11} />
            <span className="text-[10px]">{meds.length}</span>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
              {/* Notes */}
              {condition.notes && (
                <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-1">Clinical Notes</p>
                  <p className="text-xs text-blue-700 leading-relaxed">{condition.notes}</p>
                </div>
              )}

              {/* Linked symptom categories */}
              {linkedCats.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Monitoring</p>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedCats.map(cat => (
                      <span key={cat.id} className="text-[11px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
                        style={{ background: cat.color + '18', color: cat.color }}>
                        {cat.icon} {cat.label}
                        {linkedSymptoms.filter(s => s.category === cat.id).length > 0 && (
                          <span className="bg-amber-400 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-0.5">
                            {linkedSymptoms.filter(s => s.category === cat.id).length}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">
                  Medications ({meds.length})
                </p>
                {meds.length === 0 ? (
                  <p className="text-xs text-gray-300 italic">No medications linked</p>
                ) : (
                  <div className="space-y-1.5">
                    {meds.map(med => (
                      <div key={med.id} className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                        <Pill size={12} className="text-indigo-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-indigo-800 truncate">{med.name}</p>
                          <p className="text-[10px] text-indigo-400">{med.dosage} · {med.frequency}</p>
                        </div>
                        <button
                          onClick={() => removeMedication(med.id)}
                          className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={10} className="text-rose-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Symptom trend */}
              {linkedSymptoms.length > 0 && (
                <div className="bg-amber-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                  <TrendingUp size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-amber-600 font-semibold mb-0.5">Active Symptoms</p>
                    <p className="text-xs text-amber-700">
                      {linkedSymptoms.map(s => `${s.bodyLabel} (${severityLabel(s.severity)})`).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Remove condition */}
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold hover:text-rose-700 transition-colors"
              >
                <Trash2 size={12} />
                Remove condition
              </button>
              <AnimatePresence>
                {confirming && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                      <p className="text-[11px] font-semibold text-rose-700 mb-0.5">Remove {condition.name}?</p>
                      <p className="text-[10px] text-rose-400 mb-3 leading-relaxed">
                        This can't be undone. The condition and all linked data will be permanently removed.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => removeCondition(condition.id)}
                          className="flex-1 py-1.5 rounded-xl bg-rose-500 text-white text-[11px] font-bold">
                          Yes, remove it
                        </button>
                        <button onClick={() => setConfirming(false)}
                          className="flex-1 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-[11px] font-semibold">
                          Keep it
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
