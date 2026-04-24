import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, MapPin, Shield, Pill, Activity, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { warmAudio, stopActiveAlarm } from '../../utils/audio'
import EmergencyFlow from './EmergencyFlow'

// ── Persistent summary modal shown while an emergency is active ───────────────
function EmergencySummaryModal() {
  const {
    activeEmergency, resolveEmergency,
    currentMember, currentConditions, currentMedications, currentSymptoms,
  } = useApp()

  const ev = activeEmergency
  if (!ev) return null

  const activeSymptoms = currentSymptoms?.filter(s => !s.resolved) || []
  const highSev        = activeSymptoms.filter(s => s.severity >= 7)
  const loc            = ev.location

  function handleResolve() {
    stopActiveAlarm()
    resolveEmergency(ev.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-md glass-elevated rounded-3xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-500 px-6 pt-6 pb-5 text-white">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <AlertTriangle size={20} strokeWidth={2.5} />
            </motion.div>
            <span className="font-extrabold text-base tracking-tight">Emergency Alert Active</span>
          </div>
          <p className="text-rose-200 text-xs mt-1">
            Your family and care team have been notified.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 pb-8 space-y-4">

          {/* Who + location */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Alert sent for</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-sm font-extrabold text-rose-600 flex-shrink-0">
                {currentMember?.avatar}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{currentMember?.name}</p>
                {loc ? (
                  <div className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5 bg-emerald-50 text-emerald-700">
                    <MapPin size={10} /> Location shared (±{Math.round(loc.accuracy || 0)}m)
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5 bg-gray-50 text-gray-400">
                    <MapPin size={10} /> Location not available
                  </div>
                )}
              </div>
            </div>

            {ev.note ? (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Note</p>
                <p className="text-xs text-gray-700">"{ev.note}"</p>
              </div>
            ) : null}

            <p className="text-[10px] text-gray-400">
              Triggered {ev.triggeredAt ? new Date(ev.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>

          {/* Health snapshot — always shown */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Health Summary Shared</p>

            {/* Active symptoms — all of them, high severity highlighted */}
            {activeSymptoms.length > 0 ? (
              <div className="flex items-start gap-2">
                <Activity size={13} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">
                    Active symptoms
                    {highSev.length > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                        {highSev.length} high severity
                      </span>
                    )}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {activeSymptoms.map(s => (
                      <p key={s.id} className={`text-[11px] ${s.severity >= 7 ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
                        {s.bodyLabel} — {s.type}
                        <span className={`ml-1 font-bold ${s.severity >= 7 ? 'text-rose-600' : s.severity >= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {s.severity}/10
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-gray-300 flex-shrink-0" />
                <p className="text-[11px] text-gray-400">No active symptoms logged</p>
              </div>
            )}

            {/* Conditions */}
            <div className="flex items-start gap-2">
              <Shield size={13} className="text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-700">Conditions</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {currentConditions?.length > 0
                    ? currentConditions.map(c => c.name).join(', ')
                    : 'None on record'}
                </p>
              </div>
            </div>

            {/* Medications */}
            <div className="flex items-start gap-2">
              <Pill size={13} className="text-teal-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-gray-700">Medications</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {currentMedications?.length > 0
                    ? currentMedications.map(m => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`).join(', ')
                    : 'None on record'}
                </p>
              </div>
            </div>
          </div>

          {/* Resolve */}
          <button
            onClick={handleResolve}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} /> I'm OK — Resolve Alert
          </button>

          <p className="text-center text-[11px] text-gray-400">
            Tap above to let your family know you're safe.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main export: FAB + countdown flow (only when NO active emergency) ─────────
export default function EmergencyButton() {
  const { activeEmergency, currentRiskProfile } = useApp()
  const [open, setOpen] = useState(false)
  const sentRef = useRef(false) // guard against double-trigger

  const isHighRisk = currentRiskProfile?.riskLevel === 'high' || currentRiskProfile?.riskLevel === 'critical'
  const isActive   = !!activeEmergency

  return (
    <>
      {/* Persistent summary modal — shown whenever there's an active emergency */}
      <AnimatePresence>
        {isActive && <EmergencySummaryModal key="summary" />}
      </AnimatePresence>

      {/* FAB + countdown — only when no active emergency */}
      <AnimatePresence>
        {!isActive && (
          <motion.button
            key="fab"
            onClick={() => { if (!open) { warmAudio(); sentRef.current = false; setOpen(true) } }}
            className="fixed z-40 flex items-center justify-center shadow-2xl"
            style={{
              bottom: '5.5rem', right: '1rem',
              width: 52, height: 52, borderRadius: '50%',
              background: isHighRisk
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}
            whileTap={{ scale: 0.93 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            aria-label="Trigger emergency"
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-rose-500"
              animate={{ scale: [1, isHighRisk ? 1.7 : 1.45], opacity: [isHighRisk ? 0.65 : 0.45, 0] }}
              transition={{ duration: isHighRisk ? 1.1 : 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
            <AlertTriangle size={22} className="text-white" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && !isActive && (
          <EmergencyFlow
            key="flow"
            sentRef={sentRef}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
