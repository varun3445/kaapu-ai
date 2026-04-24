import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useApp } from '../../context/AppContext'
import { stopActiveAlarm, playCancel } from '../../utils/audio'

export default function EmergencyBanner() {
  const { activeEmergency, resolveEmergency } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!activeEmergency) return null

  function handleResolve() {
    if (!confirming) { setConfirming(true); return }
    stopActiveAlarm()   // kill the siren
    playCancel()        // play a reassuring ascending tone
    resolveEmergency(activeEmergency.id)
    setConfirming(false)
  }

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: 'spring', damping: 22 }}
      className="relative z-50"
    >
      {/* Pulse overlay */}
      <motion.div
        className="absolute inset-0 bg-rose-600"
        animate={{ opacity: [1, 0.85, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      <div className="relative bg-rose-600 text-white px-4 py-2.5">
        <div className="max-w-lg mx-auto">
          {/* Main row */}
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <AlertTriangle size={16} strokeWidth={2.5} />
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold tracking-wide">🚨 EMERGENCY ACTIVE</p>
              <p className="text-rose-200 text-[11px] truncate">
                Triggered {format(new Date(activeEmergency.triggeredAt), 'h:mm a')}
                {activeEmergency.note ? ` · "${activeEmergency.note}"` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-[10px] font-bold text-rose-200 underline underline-offset-2"
              >
                {expanded ? 'Less' : 'Details'}
              </button>

              <button
                onClick={handleResolve}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                  confirming
                    ? 'bg-white text-rose-600 scale-105'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <CheckCircle size={12} />
                {confirming ? "Confirm OK" : "I'm OK"}
              </button>

              {confirming && (
                <button
                  onClick={() => setConfirming(false)}
                  className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Expanded summary */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 bg-white/15 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-rose-200 font-semibold uppercase tracking-wider mb-1">Summary sent to your doctor</p>
                  <p className="text-[11px] text-white/90 leading-relaxed">{activeEmergency.summary}</p>
                  {activeEmergency.location && (
                    <p className="text-[10px] text-rose-200 mt-1.5">
                      📍 Location: {activeEmergency.location.lat.toFixed(4)}, {activeEmergency.location.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
