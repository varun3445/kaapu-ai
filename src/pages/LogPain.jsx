import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, RotateCcw, CheckCircle2, MapPin } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BodyScene from '../components/Body3D/BodyScene'
import SymptomForm from '../components/Symptoms/SymptomForm'
import { SYMPTOM_CATEGORIES, BODY_REGIONS } from '../data/mockData'

// ── Voice NLP ─────────────────────────────────────────────────────────────────

// 3D world-space pin positions for voice-detected regions
// Coord system: Y up (head ~0.72, feet ~-0.67), X negative = model right arm,
// X positive = model left arm, Z positive = front. Z offset ~0.1-0.2 = front surface.
const VOICE_PIN_POSITIONS = {
  'head':              { x:  0,     y:  0.80, z:  0.25 },
  'neck':              { x:  0,     y:  0.42, z:  0.09 },
  'chest':             { x:  0,     y:  0.22, z:  0.16 },
  'abdomen':           { x:  0,     y:  0.07, z:  0.14 },
  'pelvis':            { x:  0,     y: -0.06, z:  0.14 },
  'left-hip':          { x:  0.22,  y: -0.06, z:  0.10 },
  'right-hip':         { x: -0.22,  y: -0.06, z:  0.10 },
  'left-shoulder':     { x:  0.35,  y:  0.30, z:  0.07 },
  'right-shoulder':    { x: -0.35,  y:  0.30, z:  0.07 },
  'left-upper-arm':    { x:  0.50,  y:  0.30, z:  0.06 },
  'right-upper-arm':   { x: -0.50,  y:  0.30, z:  0.06 },
  'left-elbow':        { x:  0.63,  y:  0.30, z:  0.06 },
  'right-elbow':       { x: -0.63,  y:  0.30, z:  0.06 },
  'left-lower-arm':    { x:  0.72,  y:  0.30, z:  0.05 },
  'right-lower-arm':   { x: -0.72,  y:  0.30, z:  0.05 },
  'left-hand':         { x:  0.79,  y:  0.30, z:  0.04 },
  'right-hand':        { x: -0.79,  y:  0.30, z:  0.04 },
  'left-thigh':        { x:  0.11,  y: -0.22, z:  0.09 },
  'right-thigh':       { x: -0.11,  y: -0.22, z:  0.09 },
  'left-knee':         { x:  0.13,  y: -0.38, z:  0.09 },
  'right-knee':        { x: -0.13,  y: -0.38, z:  0.09 },
  'left-shin':         { x:  0.13,  y: -0.55, z:  0.08 },
  'right-shin':        { x: -0.13,  y: -0.55, z:  0.08 },
  'left-foot':         { x:  0.13,  y: -0.67, z:  0.14 },
  'right-foot':        { x: -0.13,  y: -0.67, z:  0.14 },
}

// Multi-word phrases FIRST so they take priority over single-word matches
const REGION_RULES = [
  { id: 'head',            kw: ['headache','migraine','forehead','temple','face','skull','sinus','eye','ear','nose','mouth','jaw','cheek','head'] },
  { id: 'neck',            kw: ['stiff neck','neck pain','sore neck','neck','throat','collar'] },
  { id: 'chest',           kw: ['chest pain','chest tightness','chest','heart','breast','sternum','rib','lung','breathing','breath','cough'] },
  { id: 'abdomen',         kw: ['stomach ache','stomach pain','tummy ache','abdomen','stomach','belly','tummy','gut','nausea','bloat','indigestion'] },
  { id: 'left-hip',        kw: ['left hip','hip left','left side of my back','left lower back'] },
  { id: 'right-hip',       kw: ['right hip','hip right','right side of my back','right lower back'] },
  { id: 'pelvis',          kw: ['lower abdomen','pelvic pain','pelvis','groin','hip pain','hip'] },
  { id: 'left-shoulder',   kw: ['left shoulder','shoulder left','left trap'] },
  { id: 'right-shoulder',  kw: ['right shoulder','shoulder right','right trap','shoulder'] },
  { id: 'left-upper-arm',  kw: ['left upper arm','left bicep','upper left arm','left arm'] },
  { id: 'right-upper-arm', kw: ['right upper arm','right bicep','upper right arm','right arm','arm'] },
  { id: 'left-elbow',      kw: ['left elbow','elbow left'] },
  { id: 'right-elbow',     kw: ['right elbow','elbow right','elbow'] },
  { id: 'left-lower-arm',  kw: ['left forearm','left lower arm','left tricep'] },
  { id: 'right-lower-arm', kw: ['right forearm','right lower arm','right tricep','forearm'] },
  { id: 'left-hand',       kw: ['left hand','left wrist','left finger','left palm','left thumb'] },
  { id: 'right-hand',      kw: ['right hand','right wrist','right finger','right palm','right thumb','wrist','hand','finger'] },
  { id: 'left-thigh',      kw: ['left thigh','left quad','left hamstring','upper left leg','left upper leg'] },
  { id: 'right-thigh',     kw: ['right thigh','right quad','right hamstring','upper right leg','right upper leg','thigh'] },
  { id: 'left-knee',       kw: ['left knee'] },
  { id: 'right-knee',      kw: ['right knee','knee'] },
  { id: 'left-shin',       kw: ['left shin','left calf','left lower leg'] },
  { id: 'right-shin',      kw: ['right shin','right calf','right lower leg','shin','calf'] },
  { id: 'left-foot',       kw: ['left foot','left ankle','left toe','left heel'] },
  { id: 'right-foot',      kw: ['right foot','right ankle','right toe','right heel','ankle','foot','heel','toe'] },
]

const CATEGORY_RULES = [
  { id: 'neurological', kw: ['headache','migraine','dizzy','dizziness','numb','numbness','tingle','tingling','blurred vision','vision'] },
  { id: 'respiratory',  kw: ['breath','breathing','cough','coughing','wheeze','wheezing','tight','shortness'] },
  { id: 'digestive',    kw: ['nausea','stomach','bloat','cramp','indigestion','vomit','sick','constipat','diarrhea'] },
  { id: 'fatigue',      kw: ['tired','fatigue','weak','weakness','exhausted','energy','lethargy'] },
  { id: 'swelling',     kw: ['swollen','swelling','inflamed','inflammation','puffy','puffed'] },
  { id: 'skin',         kw: ['rash','itch','itching','dry','bruise','bruising'] },
  { id: 'pain',         kw: ['pain','ache','hurt','hurts','sore','sharp','stabbing','throbbing','burning','aching','tender','pressure','spasm','stiff','stiffness'] },
]

function parseVoice(text) {
  const lower = text.toLowerCase()
  const regionId = REGION_RULES.reduce((found, rule) =>
    found || (rule.kw.some(k => lower.includes(k)) ? rule.id : null)
  , null)
  const position   = regionId ? VOICE_PIN_POSITIONS[regionId] : null
  const bodyRegion = regionId ? BODY_REGIONS.find(r => r.id === regionId) : null
  const regionLabel = bodyRegion?.label ||
    (regionId ? regionId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null)
  const categoryId = CATEGORY_RULES.reduce((found, rule) =>
    found || (rule.kw.some(k => lower.includes(k)) ? rule.id : null)
  , null) || 'pain'
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === categoryId)
  return { regionId, regionLabel, position, categoryId, cat, type: cat?.types[0] || 'General' }
}

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
  const [voicePhase,     setVoicePhase]     = useState('idle') // idle | analysing | plotted | tap
  const [voicePlot,      setVoicePlot]      = useState(null)   // { label } on success

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
    setVoicePhase('analysing')
    setTimeout(() => {
      const { regionId, regionLabel, position, categoryId, cat, type } = parseVoice(text)
      if (regionId && position) {
        addSymptom({
          bodyRegion:    regionId,
          bodyLabel:     regionLabel,
          category:      categoryId,
          categoryLabel: cat?.label || categoryId,
          type,
          severity:      5,
          duration:      'Just started',
          notes:         text,
          pinPosition:   position,
        })
        setVoicePlot({ label: regionLabel })
        setVoicePhase('plotted')
        setTimeout(() => { setVoicePhase('idle'); setVoicePlot(null) }, 3500)
      } else {
        setVoicePhase('tap')
        setTimeout(() => setVoicePhase('idle'), 4000)
      }
    }, 900)
  }, [addSymptom])

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
    <div className="flex flex-col h-full relative max-w-[480px] mx-auto w-full">

      {/* Page title bar */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0 bg-gradient-to-b from-slate-50 to-indigo-50">
        <h1 className="text-lg font-extrabold text-gray-900">Any symptoms today?</h1>
        <p className="text-xs text-gray-400">
          {activeSymptoms.length > 0
            ? `${activeSymptoms.length} active · tap body to log more`
            : 'Tap the body to log a symptom'}
        </p>
      </div>

      {/* Voice status bar */}
      <AnimatePresence>
        {voicePhase === 'plotted' && voicePlot && (
          <motion.div
            key="plotted"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-2 flex-shrink-0"
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">Plotted on <span className="text-emerald-600">{voicePlot.label}</span></p>
            </div>
          </motion.div>
        )}
        {voicePhase === 'tap' && (
          <motion.div
            key="tap"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-2 flex-shrink-0"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
              <MapPin size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-amber-700">Got it — tap the body where it hurts</p>
            </div>
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

        {/* Listening / analysing overlay */}
        <AnimatePresence>
          {(listening || voicePhase === 'analysing') && (
            <motion.div
              key="voice-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ background: 'rgba(238,240,255,0.7)', backdropFilter: 'blur(2px)' }}
            >
              {listening ? (
                <div className="flex gap-2.5 items-center">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 rounded-full bg-indigo-500"
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <motion.div
                    className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent' }} />
                  </motion.div>
                  <p className="mt-3 text-sm font-bold text-indigo-700">Analysing…</p>
                </>
              )}
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

      {/* ── Voice button — tap to start, auto-stops when speech ends ── */}
      {supported && (
        <div className="flex-shrink-0 flex justify-center pb-3 pt-2 bg-indigo-50">
          <motion.button
            onClick={listening ? stop : start}
            animate={listening ? { scale: 1.08 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm shadow-lg transition-colors ${
              listening
                ? 'bg-rose-500 text-white shadow-rose-200'
                : 'bg-indigo-600 text-white shadow-indigo-200 active:scale-95'
            }`}
          >
            <Mic size={22} className={listening ? 'animate-pulse' : ''} />
            {listening ? 'Listening…' : 'Tap to speak'}
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
