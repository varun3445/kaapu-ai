import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, Heart, Pill, Phone, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { useApp } from '../../context/AppContext'

const RISK_COLORS = {
  normal:   { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  high:     { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
}

export default function HealthIDCard() {
  const { currentMember, generateHealthID } = useApp()
  const [open, setOpen] = useState(false)

  if (!currentMember) return null

  const hid = open ? generateHealthID(currentMember.id) : null
  const riskStyle = hid ? (RISK_COLORS[hid.riskLevel] || RISK_COLORS.normal) : RISK_COLORS.normal

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl px-4 py-3.5 hover:from-indigo-100 hover:to-blue-100 transition-all text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <ShieldCheck size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-indigo-800">Health ID</p>
          <p className="text-xs text-indigo-400">Emergency snapshot · tap to view</p>
        </div>
        <span className="text-xs font-bold text-indigo-500 bg-indigo-100 px-2.5 py-1 rounded-full">View</span>
      </button>

      {/* Health ID modal */}
      <AnimatePresence>
        {open && hid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 28 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-5 pt-6 pb-5 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} strokeWidth={2.5} />
                    <span className="font-extrabold text-base">Health ID</span>
                  </div>
                  <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <X size={13} />
                  </button>
                </div>

                {/* Identity */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-extrabold">
                    {currentMember.avatar}
                  </div>
                  <div>
                    <p className="font-extrabold text-lg leading-tight">{hid.name}</p>
                    <p className="text-indigo-200 text-xs">
                      {hid.age}yo · {hid.gender} · {hid.familyName}
                    </p>
                    <p className="text-indigo-300 text-[10px] mt-0.5">
                      Blood Type: {hid.bloodType} · Allergies: {hid.allergies}
                    </p>
                  </div>
                </div>

                {/* Risk level badge */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ background: riskStyle.bg, border: `1px solid ${riskStyle.border}` }}>
                  <AlertTriangle size={12} style={{ color: riskStyle.text }} />
                  <span className="text-[11px] font-extrabold" style={{ color: riskStyle.text }}>
                    Risk Level: {hid.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto pb-8">

                {/* Conditions */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={13} className="text-rose-400" />
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Chronic Conditions</p>
                  </div>
                  {hid.conditions.length === 0 ? (
                    <p className="text-xs text-gray-300 italic pl-1">None recorded</p>
                  ) : (
                    <div className="space-y-1.5">
                      {hid.conditions.map((c, i) => (
                        <div key={i} className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Pill size={13} className="text-indigo-400" />
                    <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Current Medications</p>
                  </div>
                  {hid.medications.length === 0 ? (
                    <p className="text-xs text-gray-300 italic pl-1">None recorded</p>
                  ) : (
                    <div className="space-y-1.5">
                      {hid.medications.map((m, i) => (
                        <div key={i} className="text-xs text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2">
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Emergency contacts */}
                {hid.emergencyContacts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={13} className="text-emerald-400" />
                      <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Emergency Contacts</p>
                    </div>
                    <div className="space-y-1.5">
                      {hid.emergencyContacts.map((c, i) => (
                        <div key={i} className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                          {c.name} · {c.relationship}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-gray-300 text-center">
                  Generated {format(new Date(hid.generatedAt), 'MMM d, yyyy h:mm a')} · For emergency use only
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
