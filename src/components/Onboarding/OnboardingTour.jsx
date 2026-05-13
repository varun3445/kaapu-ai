import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Heart } from 'lucide-react'

export const TOUR_KEY = 'kaapu_tour_v1_done'

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Kaapu 👋',
    body: "Your family's health, all in one place. Let's take a 30-second tour so you know where everything is.",
    position: 'center',
    icon: '🏠',
  },
  {
    id: 'checkin',
    target: '[data-tour="checkin"]',
    title: 'Daily Check-in',
    body: 'Log how you\'re feeling every day. Your mood and notes help track wellbeing over time — and alert family if things get worse.',
    position: 'bottom',
    icon: '😊',
  },
  {
    id: 'bodymap',
    target: '[data-tour="nav-bodymap"]',
    title: 'Body Map',
    body: 'Tap any body part to log a symptom — pain, discomfort, swelling. Add severity and notes to track it over time.',
    position: 'top',
    icon: '🫀',
  },
  {
    id: 'emergency',
    target: '[data-tour="emergency-btn"]',
    title: 'Emergency Button',
    body: 'Press and hold in an emergency. Instantly alerts all connected family members with your location and health summary.',
    position: 'top',
    icon: '🚨',
  },
  {
    id: 'family',
    target: '[data-tour="nav-family"]',
    title: 'Family & People',
    body: 'View connected family members, check their recent health status, and manage your connections.',
    position: 'top',
    icon: '👨‍👩‍👧',
  },
  {
    id: 'profile',
    target: '[data-tour="header-profile"]',
    title: 'Your Profile',
    body: 'Update your health info, add emergency contacts, configure notifications, and replay this tour anytime from here.',
    position: 'bottom',
    icon: '⚙️',
  },
  {
    id: 'done',
    target: null,
    title: "You're all set! 🎉",
    body: "Kaapu works best when your family is connected. Share your unique ID (in Profile) with family members to get started.",
    position: 'center',
    icon: '❤️',
  },
]

const PAD = 10       // padding around spotlight
const RADIUS = 16    // spotlight border-radius
const TIP_W = 300    // tooltip width

// ── Spotlight SVG mask ────────────────────────────────────────────────────────
function SpotlightMask({ rect, ww, wh }) {
  if (!rect) {
    // Full dim — no spotlight
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ display: 'block' }}>
        <rect x={0} y={0} width={ww} height={wh} fill="rgba(0,0,0,0.72)" />
      </svg>
    )
  }

  const x = rect.left - PAD
  const y = rect.top  - PAD
  const w = rect.width  + PAD * 2
  const h = rect.height + PAD * 2

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={ww} height={wh}
      style={{ display: 'block' }}
    >
      <defs>
        <mask id="spotlight-mask">
          <rect x={0} y={0} width={ww} height={wh} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={RADIUS} ry={RADIUS} fill="black" />
        </mask>
      </defs>
      <rect
        x={0} y={0} width={ww} height={wh}
        fill="rgba(0,0,0,0.72)"
        mask="url(#spotlight-mask)"
      />
      {/* Highlight ring */}
      <rect
        x={x} y={y} width={w} height={h}
        rx={RADIUS} ry={RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={2}
      />
    </svg>
  )
}

// ── Tooltip card ──────────────────────────────────────────────────────────────
function Tooltip({ step, rect, stepIdx, total, ww, wh, onNext, onSkip }) {
  const isCenter = step.position === 'center' || !rect

  let left, top, arrowSide, arrowOffset

  if (isCenter) {
    left = ww / 2 - TIP_W / 2
    top  = wh / 2 - 120
  } else {
    // Horizontal: centre on the spotlight, clamp to viewport
    const cx = rect.left + rect.width / 2
    left = cx - TIP_W / 2
    left = Math.max(12, Math.min(left, ww - TIP_W - 12))

    // Arrow offset from card left to point at center of element
    arrowOffset = cx - left

    if (step.position === 'bottom') {
      top      = rect.bottom + PAD + 14
      arrowSide = 'top'
    } else {
      top      = rect.top - PAD - 14 - 180  // card height ~180
      arrowSide = 'bottom'
    }
    top = Math.max(8, Math.min(top, wh - 200))
  }

  const isFirst = stepIdx === 0
  const isLast  = stepIdx === total - 1

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, scale: 0.92, y: isCenter ? 12 : (step.position === 'bottom' ? -8 : 8) }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      style={{
        position: 'absolute',
        left,
        top,
        width: TIP_W,
        zIndex: 10,
      }}
    >
      {/* Arrow */}
      {arrowSide === 'top' && (
        <div style={{
          position: 'absolute',
          top: -7,
          left: Math.max(16, Math.min(arrowOffset - 7, TIP_W - 32)),
          width: 14,
          height: 7,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 14, height: 14,
            background: 'white',
            borderRadius: 3,
            transform: 'rotate(45deg) translateY(7px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }} />
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-primary-500 rounded-full"
            initial={{ width: `${(stepIdx / (total - 1)) * 100}%` }}
            animate={{ width: `${(stepIdx / (total - 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="px-5 pt-4 pb-5">
          {/* Icon + title */}
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-2xl">{step.icon}</span>
            <p className="text-[15px] font-extrabold text-gray-900">{step.title}</p>
          </div>

          {/* Body */}
          <p className="text-xs text-gray-500 leading-relaxed mb-4">{step.body}</p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-300 font-semibold">
              {stepIdx + 1} / {total}
            </p>
            <div className="flex items-center gap-2">
              {!isLast && !isFirst && (
                <button
                  onClick={onSkip}
                  className="text-[11px] text-gray-400 font-semibold px-2 py-1 rounded-lg hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary-600 px-4 py-2 rounded-xl hover:bg-primary-700 transition-colors"
              >
                {isLast ? (
                  <>Done <Heart size={12} /></>
                ) : (
                  <>Next <ChevronRight size={13} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Arrow bottom */}
      {arrowSide === 'bottom' && (
        <div style={{
          position: 'absolute',
          bottom: -7,
          left: Math.max(16, Math.min(arrowOffset - 7, TIP_W - 32)),
          width: 14,
          height: 7,
          overflow: 'hidden',
          transform: 'rotate(180deg)',
        }}>
          <div style={{
            width: 14, height: 14,
            background: 'white',
            borderRadius: 3,
            transform: 'rotate(45deg) translateY(7px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }} />
        </div>
      )}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingTour({ onDone }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [rect,    setRect]    = useState(null)
  const [dims,    setDims]    = useState({ ww: window.innerWidth, wh: window.innerHeight })
  const rafRef = useRef(null)

  const step = STEPS[stepIdx]

  // Measure target element
  const measure = useCallback(() => {
    if (!step.target) { setRect(null); return }
    const el = document.querySelector(step.target)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom })
  }, [step.target])

  useLayoutEffect(() => {
    measure()
    // Re-measure on resize
    const onResize = () => {
      setDims({ ww: window.innerWidth, wh: window.innerHeight })
      measure()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  // Re-measure every frame so spotlight tracks if layout shifts
  useEffect(() => {
    let alive = true
    function loop() {
      if (!alive) return
      measure()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [measure])

  function next() {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(i => i + 1)
    } else {
      finish()
    }
  }

  function finish() {
    localStorage.setItem(TOUR_KEY, '1')
    onDone?.()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: 'none' }}
    >
      {/* Dimmed overlay with spotlight cutout */}
      <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
        <SpotlightMask
          rect={rect}
          ww={dims.ww}
          wh={dims.wh}
        />
      </div>

      {/* Skip button — top right */}
      <button
        onClick={finish}
        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        style={{ pointerEvents: 'auto', marginTop: 'env(safe-area-inset-top, 0px)' }}
        aria-label="Skip tour"
      >
        <X size={14} />
      </button>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <div
          key={step.id}
          className="absolute inset-0 pointer-events-none"
          style={{ pointerEvents: 'none' }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            <Tooltip
              step={step}
              rect={rect}
              stepIdx={stepIdx}
              total={STEPS.length}
              ww={dims.ww}
              wh={dims.wh}
              onNext={next}
              onSkip={finish}
            />
          </div>
        </div>
      </AnimatePresence>
    </div>,
    document.body
  )
}
