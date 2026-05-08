import { useState, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

let HealthKit = null
async function getPlugin() {
  if (HealthKit) return HealthKit
  if (!Capacitor.isNativePlatform()) return null
  try {
    const mod = await import('@perfood/capacitor-healthkit')
    HealthKit = mod.CapacitorHealthkit
    return HealthKit
  } catch {
    return null
  }
}

const READ_PERMISSIONS = ['steps', 'heart_rate', 'oxygen_saturation', 'active_energy_burned']
const LS_KEY = 'kaapu_healthkit_connected'
const TIMEOUT_MS = 12000

// Wrap a promise with a timeout
function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ])
}

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return { startDate: start.toISOString(), endDate: new Date().toISOString() }
}

function last7DaysRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

function sumSamples(data) {
  if (!data?.resultData?.length) return null
  return Math.round(data.resultData.reduce((acc, s) => acc + (s.value ?? 0), 0))
}

function latestSample(data) {
  if (!data?.resultData?.length) return null
  return Math.round(data.resultData[data.resultData.length - 1].value ?? 0)
}

export function useHealthKit() {
  const isIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

  const [connected, setConnected] = useState(() => isIOS && localStorage.getItem(LS_KEY) === 'true')
  const [vitals,    setVitals]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const fetchVitals = useCallback(async () => {
    if (!isIOS) return
    const hk = await getPlugin()
    if (!hk) return

    setLoading(true)
    setError(null)
    try {
      const { startDate, endDate } = todayRange()
      const { startDate: s7, endDate: e7 } = last7DaysRange()

      const [stepsRes, hrRes, spo2Res, calRes, hr7Res] = await Promise.allSettled([
        withTimeout(hk.queryHKitSampleType({ sampleName: 'steps',                startDate, endDate, limit: 0 })),
        withTimeout(hk.queryHKitSampleType({ sampleName: 'heart_rate',           startDate, endDate, limit: 0 })),
        withTimeout(hk.queryHKitSampleType({ sampleName: 'oxygen_saturation',    startDate, endDate, limit: 0 })),
        withTimeout(hk.queryHKitSampleType({ sampleName: 'active_energy_burned', startDate, endDate, limit: 0 })),
        withTimeout(hk.queryHKitSampleType({ sampleName: 'heart_rate',           startDate: s7, endDate: e7, limit: 0 })),
      ])

      const steps     = stepsRes.status  === 'fulfilled' ? sumSamples(stepsRes.value)    : null
      const heartRate = hrRes.status     === 'fulfilled' ? latestSample(hrRes.value)     : null
      const spo2      = spo2Res.status   === 'fulfilled' ? latestSample(spo2Res.value)   : null
      const calories  = calRes.status    === 'fulfilled' ? sumSamples(calRes.value)      : null

      const hrWeek = (() => {
        if (hr7Res.status !== 'fulfilled' || !hr7Res.value?.resultData?.length) return null
        const byDay = {}
        hr7Res.value.resultData.forEach(s => {
          const day = new Date(s.startDate).toLocaleDateString('en-US', { weekday: 'short' })
          if (!byDay[day]) byDay[day] = []
          byDay[day].push(s.value)
        })
        return Object.entries(byDay).map(([day, vals]) => ({
          day,
          value: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length),
        }))
      })()

      setVitals({ steps, heartRate, spo2, calories, hrWeek })
    } catch (e) {
      setError(e.message ?? 'Failed to read health data')
    } finally {
      setLoading(false)
    }
  }, [isIOS])

  const connect = useCallback(async () => {
    if (!isIOS) return { success: false, reason: 'not-ios' }
    const hk = await getPlugin()
    if (!hk) return { success: false, reason: 'plugin-unavailable' }

    // Check availability first (not supported on simulator)
    try {
      const available = await withTimeout(hk.isAvailable(), 3000)
      if (!available) {
        return { success: false, reason: 'not-available' }
      }
    } catch {
      // isAvailable timed out or threw — likely simulator, treat as unavailable
      return { success: false, reason: 'not-available' }
    }

    setLoading(true)
    setError(null)
    try {
      await withTimeout(hk.requestAuthorization({ all: [], read: READ_PERMISSIONS, write: [] }))
      localStorage.setItem(LS_KEY, 'true')
      setConnected(true)
      await fetchVitals()
      return { success: true }
    } catch (e) {
      const reason = e.message === 'timeout' ? 'Request timed out' : (e.message ?? 'Authorization failed')
      setError(reason)
      setLoading(false)
      return { success: false, reason }
    }
  }, [isIOS, fetchVitals])

  // Auto-fetch on mount if already connected
  useEffect(() => {
    if (connected) fetchVitals()
  }, [connected]) // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, vitals, loading, error, connect, refresh: fetchVitals, isIOS }
}
