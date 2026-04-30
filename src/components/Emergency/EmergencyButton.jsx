import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, MapPin, Shield, Pill, Activity, X, Phone } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { warmAudio, stopActiveAlarm } from '../../utils/audio'
import EmergencyFlow from './EmergencyFlow'

// ── My-own emergency summary modal (for the person who triggered it) ──────────
function EmergencySummaryModal() {
  const {
    activeEmergency, resolveEmergency,
    currentMember, currentConditions, currentMedications, currentSymptoms,
    currentUser,
  } = useApp()

  const ev = activeEmergency
  if (!ev) return null

  const emergencyContacts = (currentUser?.emergencyContacts || []).slice(0, 3)
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

          {/* Health snapshot */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Health Summary Shared</p>

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

          {/* Emergency contacts */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Emergency Contacts</p>
            {emergencyContacts.length > 0 ? (
              <div className="space-y-2.5">
                {emergencyContacts.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        i === 0 ? 'bg-rose-50' : i === 1 ? 'bg-amber-50' : 'bg-indigo-50'
                      }`}>
                        <Phone size={12} className={
                          i === 0 ? 'text-rose-500' : i === 1 ? 'text-amber-500' : 'text-indigo-500'
                        } />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{contact.name}</p>
                        {contact.relationship && (
                          <p className="text-[10px] text-gray-400">{contact.relationship}</p>
                        )}
                      </div>
                    </div>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                      >
                        <Phone size={10} /> Call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-gray-300 flex-shrink-0" />
                <p className="text-[11px] text-gray-400">No emergency contacts saved. Add them in Profile → Emergency Contacts.</p>
              </div>
            )}
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

// ── Observer modal — shown to connected accounts when SOMEONE ELSE is in emergency ──
function ConnectedEmergencyModal({ onDismiss }) {
  const { activeEmergency } = useApp()

  const ev = activeEmergency
  if (!ev) return null

  const name = ev.memberName || 'A family member'
  const loc  = ev.location

  // Parse the summary for key health info lines
  const summaryLines = (ev.summary || '').split(' · ').filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <motion.div
        initial={{ scale: 0.88, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="relative w-full max-w-md glass-elevated rounded-3xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Pulsing header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-700 via-rose-600 to-red-500 px-6 pt-7 pb-6 text-white">
          {/* Animated pulse rings behind icon */}
          <div className="absolute -top-4 -right-4 pointer-events-none">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute w-32 h-32 rounded-full border-2 border-white/20"
                animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
                style={{ top: 0, right: 0 }}
              />
            ))}
          </div>

          <div className="flex items-start gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5"
            >
              <AlertTriangle size={24} strokeWidth={2.5} />
            </motion.div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-rose-200 mb-0.5">Family Emergency</p>
              <p className="text-xl font-black leading-tight">{name} needs help!</p>
              <p className="text-rose-200 text-xs mt-1.5">
                Triggered at {ev.triggeredAt ? new Date(ev.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">

          {/* Location */}
          {loc && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <MapPin size={15} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Location shared</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)} (±{Math.round(loc.accuracy || 0)}m)
                </p>
              </div>
            </div>
          )}

          {/* Note */}
          {ev.note ? (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Their message</p>
              <p className="text-sm text-amber-900">"{ev.note}"</p>
            </div>
          ) : null}

          {/* Health summary */}
          {summaryLines.length > 0 && (
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{name.split(' ')[0]}'s Health Summary</p>
              {summaryLines.map((line, i) => (
                <p key={i} className={`text-[11px] leading-relaxed ${
                  line.startsWith('⚠️') ? 'text-rose-600 font-semibold' : 'text-gray-600'
                }`}>{line}</p>
              ))}
            </div>
          )}

          {/* Call 112 */}
          <a
            href="tel:112"
            className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Phone size={15} /> Call Emergency Services (112)
          </a>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <X size={14} /> Dismiss Alert
          </button>

          <p className="text-center text-[11px] text-gray-400 pb-1">
            {name.split(' ')[0]} will need to mark themselves as safe.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main export: FAB + countdown flow + correct modal ─────────────────────────
export default function EmergencyButton() {
  const { activeEmergency, currentUser, currentRiskProfile } = useApp()
  const [open,      setOpen]      = useState(false)
  const [dismissed, setDismissed] = useState(false) // observer dismissed the alert
  const sentRef = useRef(false)

  // Reset dismiss flag whenever a NEW emergency arrives
  const prevEmgId = useRef(null)
  useEffect(() => {
    if (activeEmergency?.id !== prevEmgId.current) {
      prevEmgId.current = activeEmergency?.id ?? null
      setDismissed(false)
    }
  }, [activeEmergency?.id])

  const isHighRisk    = currentRiskProfile?.riskLevel === 'high' || currentRiskProfile?.riskLevel === 'critical'
  const isActive      = !!activeEmergency
  // Is the active emergency MINE (my family triggered it) or from a connected family?
  const isMyEmergency = isActive && activeEmergency.familyId === currentUser?.familyId
  const isConnected   = isActive && !isMyEmergency && !dismissed

  return (
    <>
      {/* My own emergency summary — only when I (or my household) triggered it */}
      <AnimatePresence>
        {isMyEmergency && <EmergencySummaryModal key="mine" />}
      </AnimatePresence>

      {/* Observer alert — someone in a connected family is in emergency */}
      <AnimatePresence>
        {isConnected && (
          <ConnectedEmergencyModal
            key="connected"
            onDismiss={() => { stopActiveAlarm(); setDismissed(true) }}
          />
        )}
      </AnimatePresence>

      {/* FAB — hidden whenever any emergency is active (mine or connected) */}
      <AnimatePresence>
        {!isActive && !isConnected && (
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
