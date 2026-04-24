/**
 * Web Audio API utilities for the emergency system.
 *
 * KEY DESIGN: one shared AudioContext for all short sounds (tick, beep, cancel).
 * Creating a fresh context per-tick causes browsers to hit their concurrent-context
 * limit and silently suspend new ones after ~5 s. The shared context is created
 * once on first use and resumed if the browser suspends it (mobile policy).
 *
 * The alarm siren gets its own context so we can close it cleanly on stop().
 */

// ── Shared context (short sounds) ────────────────────────────────────────────
let _shared = null

function ctx() {
  if (!_shared || _shared.state === 'closed') {
    _shared = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Mobile browsers suspend the context until a user gesture resumes it
  if (_shared.state === 'suspended') {
    _shared.resume().catch(() => {})
  }
  return _shared
}

/**
 * Call this synchronously inside a user-gesture handler (e.g. onClick) to
 * pre-create and resume the AudioContext while the browser still considers
 * the call stack to be within a user interaction. Safari in particular refuses
 * to resume a context that was created outside a gesture.
 */
export function warmAudio() {
  try {
    const c = ctx()
    if (c.state === 'suspended') c.resume().catch(() => {})
  } catch (_) {}
}

// ── Short sound helpers ───────────────────────────────────────────────────────

/** Short click/tick — countdown beep */
export function playTick() {
  try {
    const c    = ctx()
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(c.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.25, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + 0.09)
  } catch (_) {}
}

/** Triple burst — final warning before alert fires */
export function playFinalBeep() {
  try {
    const c = ctx()
    ;[0, 0.15, 0.30].forEach(offset => {
      const osc  = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.frequency.value = 660
      osc.type = 'square'
      gain.gain.setValueAtTime(0, c.currentTime + offset)
      gain.gain.linearRampToValueAtTime(0.3, c.currentTime + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + 0.12)
      osc.start(c.currentTime + offset)
      osc.stop(c.currentTime + offset + 0.14)
    })
  } catch (_) {}
}

/** Ascending three-note tone — safe / cancel / resolved */
export function playCancel() {
  try {
    const c = ctx()
    ;[523, 659, 784].forEach((freq, i) => {
      const osc  = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t = c.currentTime + i * 0.11
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.20, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.start(t); osc.stop(t + 0.20)
    })
  } catch (_) {}
}

// ── Alarm siren (own context) ────────────────────────────────────────────────
let _activeStopFn = null

/**
 * Two-tone ambulance siren. Runs until stop() is called.
 * Registers itself globally so stopActiveAlarm() works from any component.
 * Returns a stop() function.
 */
export function startAlarm() {
  // Kill any existing alarm first
  _activeStopFn?.()

  let stopped   = false
  let alarmCtx  = null

  try {
    alarmCtx = new (window.AudioContext || window.webkitAudioContext)()

    function cycle(t) {
      if (stopped) return

      // High tone (960 Hz sawtooth)
      const o1 = alarmCtx.createOscillator()
      const g1 = alarmCtx.createGain()
      o1.connect(g1); g1.connect(alarmCtx.destination)
      o1.frequency.value = 960; o1.type = 'sawtooth'
      g1.gain.setValueAtTime(0, t)
      g1.gain.linearRampToValueAtTime(0.35, t + 0.05)
      g1.gain.setValueAtTime(0.35, t + 0.45)
      g1.gain.linearRampToValueAtTime(0, t + 0.5)
      o1.start(t); o1.stop(t + 0.5)

      // Low tone (750 Hz sawtooth)
      const o2 = alarmCtx.createOscillator()
      const g2 = alarmCtx.createGain()
      o2.connect(g2); g2.connect(alarmCtx.destination)
      o2.frequency.value = 750; o2.type = 'sawtooth'
      g2.gain.setValueAtTime(0, t + 0.5)
      g2.gain.linearRampToValueAtTime(0.35, t + 0.55)
      g2.gain.setValueAtTime(0.35, t + 0.95)
      g2.gain.linearRampToValueAtTime(0, t + 1.0)
      o2.start(t + 0.5); o2.stop(t + 1.0)

      setTimeout(() => { if (!stopped) cycle(alarmCtx.currentTime) }, 850)
    }

    cycle(alarmCtx.currentTime)
  } catch (_) {}

  function stop() {
    stopped = true
    try { alarmCtx?.close() } catch (_) {}
    alarmCtx = null
    if (_activeStopFn === stop) _activeStopFn = null
  }

  _activeStopFn = stop
  return stop
}

/**
 * Stop the currently playing alarm from any component.
 * Safe to call when no alarm is active.
 */
export function stopActiveAlarm() {
  _activeStopFn?.()
  _activeStopFn = null
}
