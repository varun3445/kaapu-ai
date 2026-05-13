import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Heart, ChevronLeft } from 'lucide-react'

export const TOUR_KEY = 'kaapu_tour_v2_done'

// ── Step definitions ──────────────────────────────────────────────────────────
// route: navigate here before spotlighting the target
// target: CSS selector for the element to spotlight (null = full-screen card)
// openProfile: whether to open the profile panel for this step
// position: where to place the tooltip relative to the target
const STEPS = [
  {
    id: 'welcome',
    route: '/',
    target: null,
    title: 'Welcome to Kaapu 👋',
    body: "Your family's health, all in one place. Let's take a quick tour — tap Next to walk through every feature.",
    position: 'center',
    icon: '🏠',
  },
  {
    id: 'checkin',
    route: '/',
    target: '[data-tour="checkin"]',
    title: 'Daily Check-in',
    body: "Every day, log how you're feeling here. Pick a mood, add a note, and Kaapu tracks your wellbeing over time. Your family gets notified if things worsen consistently.",
    position: 'bottom',
    icon: '😊',
  },
  {
    id: 'moodbar',
    route: '/',
    target: '[data-tour="checkin"]',
    title: '7-Day Mood History',
    body: "The bar below shows your last 7 days at a glance. Tap any filled day to edit that entry — missed a day? Tap the empty slot to log it retroactively.",
    position: 'bottom',
    icon: '📊',
  },
  {
    id: 'emergency',
    route: '/',
    target: '[data-tour="emergency-btn"]',
    title: 'Emergency Button',
    body: 'Press and hold this red button in an emergency. It counts down 15 seconds, then instantly alerts all your connected family members with your GPS location and full health summary.',
    position: 'top',
    icon: '🚨',
  },
  {
    id: 'bodymap-intro',
    route: '/body-map',
    target: '[data-tour="bodymap-canvas"]',
    title: 'Body Map',
    body: 'Tap directly on any body part — head, chest, back, limbs — to log a symptom. Rotate the 3D model with one finger, pinch to zoom. Your symptoms appear as pins on the body.',
    position: 'top',
    icon: '🫀',
  },
  {
    id: 'bodymap-log',
    route: '/body-map',
    target: '[data-tour="bodymap-canvas"]',
    title: 'Logging a Symptom',
    body: 'After tapping a body part, a form slides up asking for the symptom type, severity (1–10), and any notes. Kaapu tracks how it changes over time and flags anything worsening.',
    position: 'top',
    icon: '📝',
  },
  {
    id: 'history',
    route: '/history',
    target: '[data-tour="history-header"]',
    title: 'Health History',
    body: 'Everything in one timeline — symptoms, mood check-ins, and medical documents. Switch between Timeline, Conditions & Meds, and Records tabs. Use the date filter to look back months or years.',
    position: 'bottom',
    icon: '📋',
  },
  {
    id: 'records',
    route: '/history',
    target: '[data-tour="history-records-btn"]',
    title: 'Health Records',
    body: 'Tap Records to upload and store your medical documents — prescriptions, lab results, X-rays, discharge summaries. They stay private and are always accessible from your timeline.',
    position: 'bottom',
    icon: '📁',
  },
  {
    id: 'family-overview',
    route: '/family',
    target: '[data-tour="family-header"]',
    title: 'People & Family',
    body: "This page shows everyone connected to your Kaapu account. You can view their recent symptoms and mood without them having to tell you — great for keeping an eye on elderly parents or young children.",
    position: 'bottom',
    icon: '👨‍👩‍👧',
  },
  {
    id: 'family-connect',
    route: '/family',
    target: '[data-tour="family-manage-btn"]',
    title: 'Connecting with Family',
    body: "Tap Manage → Add by ID, then enter your family member's unique Health ID. They'll get a connection request to accept. Once connected, you can see each other's health updates in real time.",
    position: 'bottom',
    icon: '🔗',
  },
  {
    id: 'profile-open',
    route: '/',
    target: '[data-tour="header-profile"]',
    title: 'Your Profile',
    body: 'Tap your avatar in the top-left to open your profile. This is where you manage everything — your personal info, emergency contacts, notification preferences, and privacy settings.',
    position: 'bottom',
    icon: '👤',
  },
  {
    id: 'uid',
    route: '/',
    target: '[data-tour="profile-uid"]',
    title: 'Your Unique Health ID',
    body: "This is your unique Kaapu ID — it's how others find and connect with you. Tap the copy button and share it with family members so they can add you. Keep it like a phone number.",
    position: 'bottom',
    icon: '🔑',
    openProfile: true,
  },
  {
    id: 'account',
    route: '/',
    target: '[data-tour="account-personal"]',
    title: 'Personal Info & Health Stats',
    body: 'Update your height, weight, age, and gender here. These are shown in your emergency summary — when you press the emergency button, responders see this info instantly alongside your symptoms.',
    position: 'bottom',
    icon: '⚖️',
    openProfile: true,
    profilePage: 'account',
  },
  {
    id: 'done',
    route: '/',
    target: null,
    title: "You're all set! 🎉",
    body: "That's Kaapu. Start by logging your first check-in today, then invite a family member using your Health ID from your profile. We'll take care of the rest.",
    position: 'center',
    icon: '❤️',
    closeProfile: true,
  },
]

const PAD = 10
const RADIUS = 16
const TIP_W = 304

// ── Spotlight SVG ─────────────────────────────────────────────────────────────
function SpotlightMask({ rect, ww, wh }) {
  if (!rect) {
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
    <svg className="absolute inset-0 pointer-events-none" width={ww} height={wh} style={{ display: 'block' }}>
      <defs>
        <mask id="spotlight-mask">
          <rect x={0} y={0} width={ww} height={wh} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={RADIUS} ry={RADIUS} fill="black" />
        </mask>
      </defs>
      <rect x={0} y={0} width={ww} height={wh} fill="rgba(0,0,0,0.72)" mask="url(#spotlight-mask)" />
      <rect x={x} y={y} width={w} height={h} rx={RADIUS} ry={RADIUS}
        fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={2} />
    </svg>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ step, rect, stepIdx, total, ww, wh, onNext, onPrev, onSkip }) {
  const isCenter = step.position === 'center' || !rect

  let left, top, arrowSide, arrowOffset

  if (isCenter) {
    left = ww / 2 - TIP_W / 2
    top  = wh / 2 - 130
  } else {
    const cx = rect.left + rect.width / 2
    left = Math.max(12, Math.min(cx - TIP_W / 2, ww - TIP_W - 12))
    arrowOffset = cx - left

    if (step.position === 'bottom') {
      top      = rect.bottom + PAD + 14
      arrowSide = 'top'
    } else {
      top      = rect.top - PAD - 14 - 195
      arrowSide = 'bottom'
    }
    top = Math.max(8, Math.min(top, wh - 220))
  }

  const isFirst = stepIdx === 0
  const isLast  = stepIdx === total - 1
  const progress = (stepIdx / (total - 1)) * 100

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, scale: 0.93, y: isCenter ? 10 : step.position === 'bottom' ? -6 : 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: isCenter ? -6 : step.position === 'bottom' ? -6 : 6 }}
      transition={{ type: 'spring', damping: 28, stiffness: 340 }}
      style={{ position: 'absolute', left, top, width: TIP_W, zIndex: 10 }}
    >
      {/* Top arrow */}
      {arrowSide === 'top' && (
        <div style={{
          position: 'absolute', top: -7,
          left: Math.max(16, Math.min(arrowOffset - 7, TIP_W - 32)),
          width: 14, height: 7, overflow: 'hidden',
        }}>
          <div style={{ width: 14, height: 14, background: 'white', borderRadius: 3, transform: 'rotate(45deg) translateY(7px)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
        </div>
      )}

      <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-primary-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="px-5 pt-4 pb-5">
          {/* Icon + title */}
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-[22px]">{step.icon}</span>
            <p className="text-[14px] font-extrabold text-gray-900 leading-snug">{step.title}</p>
          </div>

          {/* Body */}
          <p className="text-[11px] text-gray-500 leading-relaxed mb-4">{step.body}</p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={onPrev}
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
              )}
              <p className="text-[10px] text-gray-300 font-semibold ml-0.5">{stepIdx + 1}/{total}</p>
            </div>

            <div className="flex items-center gap-2">
              {!isLast && !isFirst && (
                <button
                  onClick={onSkip}
                  className="text-[11px] text-gray-400 font-semibold px-2 py-1 rounded-lg hover:text-gray-600 transition-colors"
                >
                  Skip tour
                </button>
              )}
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary-600 px-4 py-2 rounded-xl hover:bg-primary-700 active:scale-95 transition-all"
              >
                {isLast ? <><span>Done</span> <Heart size={11} /></> : <><span>Next</span> <ChevronRight size={13} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom arrow */}
      {arrowSide === 'bottom' && (
        <div style={{
          position: 'absolute', bottom: -7,
          left: Math.max(16, Math.min(arrowOffset - 7, TIP_W - 32)),
          width: 14, height: 7, overflow: 'hidden', transform: 'rotate(180deg)',
        }}>
          <div style={{ width: 14, height: 14, background: 'white', borderRadius: 3, transform: 'rotate(45deg) translateY(7px)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
        </div>
      )}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingTour({ onDone }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [stepIdx, setStepIdx]   = useState(0)
  const [rect,    setRect]      = useState(null)
  const [dims,    setDims]      = useState({ ww: window.innerWidth, wh: window.innerHeight })
  const [ready,   setReady]     = useState(false)   // element found after navigation
  const rafRef    = useRef(null)
  const prevRoute = useRef(null)

  const step = STEPS[stepIdx]

  // Navigate when step route changes
  useEffect(() => {
    if (step.route && step.route !== location.pathname) {
      navigate(step.route)
    }
  }, [stepIdx]) // eslint-disable-line

  // Open/close profile panel via custom event when step requires it
  useEffect(() => {
    if (step.openProfile) {
      window.dispatchEvent(new CustomEvent('kaapu:tour-profile', { detail: { open: true, page: step.profilePage || null } }))
    } else if (step.closeProfile) {
      window.dispatchEvent(new CustomEvent('kaapu:tour-profile', { detail: { open: false } }))
    }
    // Reset ready state on step change so we wait for the new element
    setReady(false)
    setRect(null)
  }, [stepIdx]) // eslint-disable-line

  // Measure target element — polls until found (handles post-navigation render delay)
  const measure = useCallback(() => {
    if (!step.target) { setRect(null); setReady(true); return }
    const el = document.querySelector(step.target)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    // Ignore elements with zero size (not yet laid out)
    if (r.width === 0 && r.height === 0) return
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom })
    setReady(true)
  }, [step.target])

  // Continuous RAF measurement
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

  // Viewport resize
  useLayoutEffect(() => {
    const onResize = () => setDims({ ww: window.innerWidth, wh: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function goNext() {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(i => i + 1)
    } else {
      finish()
    }
  }

  function goPrev() {
    if (stepIdx > 0) setStepIdx(i => i - 1)
  }

  function finish() {
    // Close profile if open
    window.dispatchEvent(new CustomEvent('kaapu:tour-profile', { detail: { open: false } }))
    // Navigate home
    navigate('/')
    localStorage.setItem(TOUR_KEY, '1')
    onDone?.()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]" style={{ pointerEvents: 'none' }}>

      {/* Dim overlay */}
      <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id + '-mask'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {ready && (
              <SpotlightMask rect={rect} ww={dims.ww} wh={dims.wh} />
            )}
            {!ready && (
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.72)' }} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* X to skip */}
      <button
        onClick={finish}
        className="absolute z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        style={{
          pointerEvents: 'auto',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 16,
        }}
        aria-label="Skip tour"
      >
        <X size={14} />
      </button>

      {/* Step counter chip */}
      <div
        className="absolute z-20 text-[10px] font-bold text-white/60 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full"
        style={{
          pointerEvents: 'none',
          top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {stepIdx + 1} / {STEPS.length}
      </div>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {ready && (
          <div key={step.id} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <Tooltip
                step={step}
                rect={rect}
                stepIdx={stepIdx}
                total={STEPS.length}
                ww={dims.ww}
                wh={dims.wh}
                onNext={goNext}
                onPrev={goPrev}
                onSkip={finish}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading indicator while waiting for element post-navigation */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
}
