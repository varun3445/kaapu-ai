import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BodyScene from '../components/Body3D/BodyScene'
import SymptomForm from '../components/Symptoms/SymptomForm'
import { SYMPTOM_CATEGORIES } from '../data/mockData'

// ── Symptom pill ──────────────────────────────────────────────────────────────
function SymptomPill({ symptom, onResolve }) {
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === symptom.category)
  const sev = symptom.severity
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: (cat?.color || '#6366f1') + '22' }}>{cat?.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{symptom.bodyLabel}</p>
        <p className="text-[10px] text-gray-400">{symptom.type} · {symptom.duration}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          sev >= 7 ? 'bg-rose-100 text-rose-600' : sev >= 5 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
        }`}>{sev >= 7 ? '⚠ High' : sev >= 5 ? 'Mid' : 'Low'}</span>
        <button onClick={() => onResolve(symptom.id)} className="p-1 text-gray-300 hover:text-rose-400 transition-colors">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Voice hook ────────────────────────────────────────────────────────────────
function useVoiceInput({ onTranscript }) {
  const [listening,  setListening]  = useState(false)
  const [supported,  setSupported]  = useState(false)
  const [transcript, setTranscript] = useState('')
  const recogRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SR)
  }, [])

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recog = new SR()
    recog.continuous     = false
    recog.interimResults = true
    recog.lang           = 'en-GB'
    recog.onstart  = () => setListening(true)
    recog.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setTranscript(final || interim)
      if (final) onTranscript(final.trim())
    }
    recog.onerror = () => setListening(false)
    recog.onend   = () => setListening(false)
    recogRef.current = recog
    recog.start()
  }, [onTranscript])

  const stop = useCallback(() => {
    recogRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, supported, transcript, start, stop }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LogPain() {
  const { currentSymptoms, addSymptom, resolveSymptom, skinColor } = useApp()

  const [selectedRegion, setSelectedRegion] = useState(null)
  const [showForm,       setShowForm]       = useState(false)
  const [hoverLabel,     setHoverLabel]     = useState(null)
  const [voiceNotes,     setVoiceNotes]     = useState('')
  const [voiceToast,     setVoiceToast]     = useState('')

  const activeSymptoms = currentSymptoms.filter(s => !s.resolved)
  const pins = useMemo(() =>
    activeSymptoms
      .filter(s => s.pinPosition)
      .map(s => ({ id: s.id, label: s.bodyLabel, position: s.pinPosition, severity: s.severity })),
    [activeSymptoms]
  )

  const handleTranscript = useCallback((text) => {
    setVoiceNotes(text)
    setVoiceToast(text)
    setTimeout(() => setVoiceToast(''), 4000)
  }, [])

  const { listening, supported, transcript, start, stop } = useVoiceInput({ onTranscript: handleTranscript })

  function handleRegionClick({ id, label, position }) {
    setSelectedRegion({ id, label, position })
    setShowForm(true)
  }

  function handleFormSubmit(data) {
    addSymptom({
      ...data,
      pinPosition: selectedRegion?.position,
      notes: data.notes || voiceNotes || undefined,
    })
    setShowForm(false)
    setSelectedRegion(null)
    setVoiceNotes('')
  }

  return (
    <div className="flex flex-col h-full relative">

      {/* Page title bar */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0 bg-gradient-to-b from-slate-50 to-indigo-50">
        <h1 className="text-lg font-extrabold text-gray-900">Any symptoms today?</h1>
        <p className="text-xs text-gray-400">
          {activeSymptoms.length > 0
            ? `${activeSymptoms.length} active · tap body to log more`
            : 'Tap the body to log a symptom'}
        </p>
      </div>

      {/* Voice transcript bar */}
      <AnimatePresence>
        {(listening || voiceToast) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5 flex-shrink-0"
          >
            {listening ? (
              <div className="flex items-center gap-2.5">
                <div className="flex gap-0.5 items-end h-4">
                  {[0,1,2,3,4].map(i => (
                    <motion.div key={i} className="w-0.5 bg-indigo-500 rounded-full"
                      animate={{ height: [4, 14, 4] }}
                      transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.1 }} />
                  ))}
                </div>
                <p className="text-xs font-semibold text-indigo-700 flex-1 truncate">
                  {transcript || 'Listening…'}
                </p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-indigo-700">
                ✓ <span className="text-indigo-500">"{voiceToast}"</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D body */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-slate-50 to-indigo-50 min-h-0">
        <BodyScene
          pins={pins}
          onRegionClick={handleRegionClick}
          onHover={setHoverLabel}
          skinColor={skinColor}
        />

        <AnimatePresence>
          {hoverLabel && !showForm && (
            <motion.div
              key={hoverLabel}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm"
            >
              {hoverLabel}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedRegion && !showForm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg"
            >
              {selectedRegion.label} selected
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] text-gray-400 font-medium pointer-events-none">
          <RotateCcw size={10} /> Rotate · Pan · Zoom
        </div>
      </div>

      {/* Active symptoms strip */}
      {activeSymptoms.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-3 pb-2 border-t border-gray-100 max-h-36 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Symptoms</p>
          <div className="space-y-2">
            {activeSymptoms.map(s => (
              <SymptomPill key={s.id} symptom={s} onResolve={resolveSymptom} />
            ))}
          </div>
        </div>
      )}

      {/* ── Voice button — fixed above bottom nav ── */}
      {supported && (
        <div className="flex-shrink-0 flex justify-center pb-3 pt-2 bg-indigo-50">
          <motion.button
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            animate={listening ? { scale: 1.08 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm shadow-lg transition-colors ${
              listening
                ? 'bg-rose-500 text-white shadow-rose-200'
                : 'bg-indigo-600 text-white shadow-indigo-200 active:scale-95'
            }`}
          >
            <Mic size={22} className={listening ? 'animate-pulse' : ''} />
            {listening ? 'Listening…' : 'Hold to speak'}
          </motion.button>
        </div>
      )}

      {/* Symptom form */}
      <AnimatePresence>
        {showForm && selectedRegion && (
          <SymptomForm
            region={{ id: selectedRegion.id, label: selectedRegion.label }}
            initialNotes={voiceNotes}
            onSubmit={handleFormSubmit}
            onClose={() => { setShowForm(false); setSelectedRegion(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
