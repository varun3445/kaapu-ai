/**
 * Web Audio API utilities for the emergency system.
 *
 * KEY DESIGN: one shared AudioContext for ALL sounds including the alarm siren.
 * Creating a new AudioContext outside a user gesture gets immediately suspended
 * on mobile (Android WebView, iOS Safari). The shared context is warmed once
 * during the user's FAB tap (warmAudio) and kept alive by the countdown ticks,
 * so startAlarm() — called when the countdown reaches zero — can reuse it
 * without needing another gesture.
 */

// ── Shared context ────────────────────────────────────────────────────────────
let _shared = null

function ctx() {
  if (!_shared || _shared.state === 'closed') {
    _shared = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (_shared.state === 'suspended') {
    _shared.resume().catch(() => {})
  }
  return _shared
}

/**
 * Call synchronously inside a user-gesture handler (e.g. onClick) to
 * pre-create and resume the AudioContext while the browser still considers
 * the call stack to be within a user interaction.
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

// ── Alarm siren ───────────────────────────────────────────────────────────────
let _activeStopFn = null

/**
 * Two-tone ambulance siren. Runs until stopActiveAlarm() is called.
 * Uses the SHARED AudioContext (already unlocked by warmAudio + countdown ticks)
 * so it plays immediately even when called from a setTimeout/interval callback
 * with no active user gesture.
 */
export function startAlarm() {
  // Kill any existing alarm first
  _activeStopFn?.()

  let stopped = false

  try {
    // Reuse the shared context — it was warmed during the FAB tap and kept alive
    // by the countdown ticks. Do NOT create a new context here; that would get
    // suspended on mobile because we're outside a user-gesture call stack.
    const alarmCtx = ctx()
    if (alarmCtx.state === 'suspended') alarmCtx.resume().catch(() => {})

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
    // Do NOT close the shared context — other sounds still need it.
    // Just set the stopped flag so the cycle halts.
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
