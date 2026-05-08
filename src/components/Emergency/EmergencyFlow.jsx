import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, MapPin, Loader, RefreshCw } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { useApp } from '../../context/AppContext'
import { playTick, playFinalBeep, playCancel, startAlarm, stopActiveAlarm } from '../../utils/audio'

const COUNTDOWN = 15

export default function EmergencyFlow({ onClose, sentRef }) {
  const { triggerEmergency, currentMember } = useApp()

  const [phase,    setPhase]    = useState('countdown')  // countdown | sending
  const [count,    setCount]    = useState(COUNTDOWN)
  const [note,     setNote]     = useState('')
  const [location, setLocation] = useState(null)
  const [locState, setLocState] = useState('requesting')

  const timerRef = useRef(null)

  // ── Geolocation ───────────────────────────────────────────────────────────
  // Use native Capacitor plugin on device (triggers iOS permission dialog),
  // fall back to browser API on web.
  const requestLocation = useCallback(async () => {
    setLocState('requesting')
    try {
      if (Capacitor.isNativePlatform()) {
        // Request permission first (shows the iOS system dialog)
        const perm = await Geolocation.requestPermissions()
        if (perm.location === 'denied') { setLocState('denied'); return }
        const pos = await Geolocation.getCurrentPosition({ timeout: 10000, maximumAge: 30000, enableHighAccuracy: true })
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setLocState('got')
      } else {
        // Web fallback
        if (!navigator.geolocation) { setLocState('unavailable'); return }
        navigator.geolocation.getCurrentPosition(
          p => {
            setLocation({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })
            setLocState('got')
          },
          err => setLocState(err.code === 1 ? 'denied' : 'unavailable'),
          { timeout: 8000, maximumAge: 30000 }
        )
      }
    } catch {
      setLocState('unavailable')
    }
  }, [])

  useEffect(() => {
    requestLocation()
    timerRef.current = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          playFinalBeep()
          triggerNowRef.current?.()
          return 0
        }
        playTick()
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const triggerNowRef = useRef(null)
  const locationRef   = useRef(location)
  const noteRef       = useRef(note)
  useEffect(() => { locationRef.current = location }, [location])
  useEffect(() => { noteRef.current = note }, [note])

  triggerNowRef.current = async () => {
    // Guard: only fire once
    if (sentRef && sentRef.current) return
    if (sentRef) sentRef.current = true

    clearInterval(timerRef.current)
    setPhase('sending')
    startAlarm()
    await triggerEmergency({ note: noteRef.current, location: locationRef.current })
    // Once triggered, activeEmergency is set → EmergencySummaryModal takes over → close this flow
    onClose()
  }

  function handleCancel() {
    clearInterval(timerRef.current)
    stopActiveAlarm()
    playCancel()
    onClose()
  }

  const progress = ((COUNTDOWN - count) / COUNTDOWN) * 100

  const locMeta = {
    requesting:  { cls: 'bg-amber-50  text-amber-600',   msg: 'Getting location…' },
    got:         { cls: 'bg-emerald-50 text-emerald-700', msg: `📍 Location locked (±${location ? Math.round(location.accuracy) : '?'}m)` },
    denied:      { cls: 'bg-rose-50    text-rose-500',    msg: 'Location denied' },
    unavailable: { cls: 'bg-gray-50    text-gray-400',    msg: 'Location unavailable' },
  }[locState] ?? { cls: 'bg-gray-50 text-gray-400', msg: '' }

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
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-500 px-6 pt-6 pb-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
              >
                <AlertTriangle size={20} strokeWidth={2.5} />
              </motion.div>
              <span className="font-extrabold text-base tracking-tight">Emergency Alert</span>
            </div>
            {phase === 'countdown' && (
              <button onClick={handleCancel} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 pb-10 space-y-5">
          <AnimatePresence mode="wait">

            {/* ── COUNTDOWN ── */}
            {phase === 'countdown' && (
              <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex justify-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#fee2e2" strokeWidth="7" />
                      <motion.circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke="#dc2626" strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 52}`}
                        strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                        transition={{ duration: 0.85, ease: 'linear' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        key={count}
                        initial={{ scale: 1.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-6xl font-black text-rose-600 leading-none tabular-nums"
                      >
                        {count}
                      </motion.span>
                      <span className="text-xs text-rose-400 font-semibold mt-1">seconds</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-sm font-extrabold text-rose-600 flex-shrink-0">
                    {currentMember?.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{currentMember?.name}</p>
                    <div className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${locMeta.cls}`}>
                      <MapPin size={10} />
                      {locMeta.msg}
                      {(locState === 'denied' || locState === 'unavailable') && (
                        <button onClick={requestLocation} className="ml-1"><RefreshCw size={9} /></button>
                      )}
                    </div>
                  </div>
                </div>

                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional: describe what's happening…"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                />

                <button onClick={handleCancel}
                  className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-extrabold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
                  ✕ Cancel — I'm OK
                </button>
                <button onClick={() => triggerNowRef.current?.()}
                  className="w-full py-3 rounded-2xl bg-rose-600 text-white font-extrabold text-sm hover:bg-rose-700 active:scale-95 transition-all">
                  🚨 Send Now
                </button>
              </motion.div>
            )}

            {/* ── SENDING ── */}
            {phase === 'sending' && (
              <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center py-10 gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader size={40} className="text-rose-500" />
                </motion.div>
                <p className="text-sm font-bold text-gray-700">Sending emergency alert…</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
