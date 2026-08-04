import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BodyScene from '../components/Body3D/BodyScene'
import SymptomForm from '../components/Symptoms/SymptomForm'
import { SYMPTOM_CATEGORIES } from '../data/mockData'
import { severityLabel, SEVERITY_HIGH_THRESHOLD, SEVERITY_MID_THRESHOLD } from '../utils/severity'

function PinCard({ symptom, onResolve }) {
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === symptom.category)
  const sev = symptom.severity
  return (
    <motion.div layout initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-12 }}
      className="flex items-center gap-3 glass-card rounded-2xl p-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: (cat?.color || '#6366f1') + '22' }}>{cat?.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-black">{symptom.bodyLabel}</p>
        <p className="text-[11px] text-black/75">{symptom.type} · {symptom.duration}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
          sev >= SEVERITY_HIGH_THRESHOLD ? 'bg-rose-100 text-rose-600' : sev >= SEVERITY_MID_THRESHOLD ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
        }`}>{severityLabel(sev)}</span>
        <button onClick={() => onResolve(symptom.id)} className="text-[10px] text-black/75 hover:text-emerald-500 transition-colors font-medium">
          Resolve ✓
        </button>
      </div>
    </motion.div>
  )
}

export default function BodyMap() {
  const { currentSymptoms, addSymptom, resolveSymptom, skinColor } = useApp()

  // selectedRegion: { id, label, position: THREE.Vector3 } | null
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [showForm,       setShowForm]       = useState(false)
  const [showTip,        setShowTip]        = useState(true)
  const [hoverLabel,     setHoverLabel]     = useState(null)

  const activeSymptoms = currentSymptoms.filter(s => !s.resolved)

  // Build pin array from symptoms that have a stored 3D position
  const pins = useMemo(() =>
    activeSymptoms
      .filter(s => s.pinPosition)
      .map(s => ({ id: s.id, label: s.bodyLabel, position: s.pinPosition, severity: s.severity })),
    [activeSymptoms]
  )

  function handleRegionClick({ id, label, position }) {
    setSelectedRegion({ id, label, position })
    setShowForm(true)
    setShowTip(false)
  }

  function handleFormSubmit(data) {
    addSymptom({ ...data, pinPosition: selectedRegion?.position })
    setShowForm(false)
    setSelectedRegion(null)
  }

  function handleFormClose() {
    setShowForm(false)
    setSelectedRegion(null)
  }

  // The region object SymptomForm expects: { id, label }
  const formRegion = selectedRegion
    ? { id: selectedRegion.id, label: selectedRegion.label }
    : null

  return (
    <div className="flex flex-col h-[calc(100dvh-156px)] max-w-lg mx-auto overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-black">Body Map</h2>
          <p className="text-xs text-black/75">
            {activeSymptoms.length} active {activeSymptoms.length === 1 ? 'symptom' : 'symptoms'}
          </p>
        </div>
        <button
          onClick={() => setShowTip(t => !t)}
          className="w-8 h-8 glass-card rounded-full flex items-center justify-center text-black/75 hover:text-primary-600 transition-colors"
        >
          <Info size={15} />
        </button>
      </div>

      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            className="mx-4 mb-2 overflow-hidden"
          >
            <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-xl">👆</span>
              <p className="text-xs text-primary-700 font-medium">
                Tap directly on the body to log a symptom. Drag to rotate · Two-finger drag to pan · Pinch to zoom.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D canvas */}
      <div data-tour="bodymap-canvas" className="flex-1 relative mx-4 rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50 to-indigo-50 shadow-card">
        <BodyScene
          pins={pins}
          onRegionClick={handleRegionClick}
          onHover={setHoverLabel}
          skinColor={skinColor}
        />

        {/* Hover label — shows body part name while cursor is on the model */}
        <AnimatePresence>
          {hoverLabel && !showForm && (
            <motion.div
              key={hoverLabel}
              initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm"
            >
              {hoverLabel}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation pill after click */}
        <AnimatePresence>
          {selectedRegion && !showForm && (
            <motion.div
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg"
            >
              {selectedRegion.label} selected
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-black/75 font-medium">
          <RotateCcw size={10} /> Rotate · Pan · Zoom
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <AnimatePresence mode="wait">
          {activeSymptoms.length === 0 ? (
            <motion.div
              key="all-clear"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="w-full rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '0.75px solid rgba(0,0,0,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              <span className="text-2xl">✨</span>
              <div>
                <p className="text-sm font-bold text-black/80">Doing great, champ!</p>
                <p className="text-xs text-black/75">No symptoms logged — keep it up</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="symptom-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs font-semibold text-black/75 uppercase tracking-wider mb-2">Logged Symptoms</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                <AnimatePresence>
                  {activeSymptoms.map(s => (
                    <PinCard key={s.id} symptom={s} onResolve={resolveSymptom} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showForm && formRegion && (
          <SymptomForm
            region={formRegion}
            onSubmit={handleFormSubmit}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
