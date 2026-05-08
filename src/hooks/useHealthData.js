// useHealthData — unified health data hook
// iOS    → Apple HealthKit   (via @perfood/capacitor-healthkit)
// Android → Health Connect   (via capacitor-health-connect)
// Web    → not supported, returns isNative: false

import { useState, useCallback, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

// ── Lazy plugin loaders ───────────────────────────────────────────────────────
let _hkPlugin = null
async function getHKPlugin() {
  if (_hkPlugin) return _hkPlugin
  try {
    const mod = await import('@perfood/capacitor-healthkit')
    _hkPlugin = mod.CapacitorHealthkit
    return _hkPlugin
  } catch { return null }
}

let _hcPlugin = null
async function getHCPlugin() {
  if (_hcPlugin) return _hcPlugin
  try {
    const mod = await import('capacitor-health-connect')
    _hcPlugin = mod.HealthConnect
    return _hcPlugin
  } catch { return null }
}

// ── Platform detection ────────────────────────────────────────────────────────
const isNative  = Capacitor.isNativePlatform()
const platform  = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

// ── Shared helpers ────────────────────────────────────────────────────────────
const LS_KEY = 'kaapu_health_connected'

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

function todayISO() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  return { startDate: start.toISOString(), endDate: new Date().toISOString() }
}

function last7DaysISO() {
  const end = new Date()
  const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

// ── HealthKit (iOS) helpers ───────────────────────────────────────────────────
const HK_PERMISSIONS = ['steps', 'heart_rate', 'oxygen_saturation', 'active_energy_burned']

function hkSum(data) {
  if (!data?.resultData?.length) return null
  return Math.round(data.resultData.reduce((a, s) => a + (s.value ?? 0), 0))
}
function hkLatest(data) {
  if (!data?.resultData?.length) return null
  return Math.round(data.resultData[data.resultData.length - 1].value ?? 0)
}

async function fetchHKVitals(hk) {
  const { startDate, endDate } = todayISO()
  const { startDate: s7, endDate: e7 } = last7DaysISO()

  const [stepsR, hrR, spo2R, calR, hr7R] = await Promise.allSettled([
    withTimeout(hk.queryHKitSampleType({ sampleName: 'steps',                startDate, endDate, limit: 0 })),
    withTimeout(hk.queryHKitSampleType({ sampleName: 'heart_rate',           startDate, endDate, limit: 0 })),
    withTimeout(hk.queryHKitSampleType({ sampleName: 'oxygen_saturation',    startDate, endDate, limit: 0 })),
    withTimeout(hk.queryHKitSampleType({ sampleName: 'active_energy_burned', startDate, endDate, limit: 0 })),
    withTimeout(hk.queryHKitSampleType({ sampleName: 'heart_rate',           startDate: s7, endDate: e7, limit: 0 })),
  ])

  const steps     = stepsR.status === 'fulfilled' ? hkSum(stepsR.value)    : null
  const heartRate = hrR.status    === 'fulfilled' ? hkLatest(hrR.value)    : null
  const spo2      = spo2R.status  === 'fulfilled' ? hkLatest(spo2R.value)  : null
  const calories  = calR.status   === 'fulfilled' ? hkSum(calR.value)      : null

  const hrWeek = (() => {
    if (hr7R.status !== 'fulfilled' || !hr7R.value?.resultData?.length) return null
    const byDay = {}
    hr7R.value.resultData.forEach(s => {
      const day = new Date(s.startDate).toLocaleDateString('en-US', { weekday: 'short' })
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(s.value)
    })
    return Object.entries(byDay).map(([day, vals]) => ({
      day,
      value: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length),
    }))
  })()

  return { steps, heartRate, spo2, calories, hrWeek }
}

// ── Health Connect (Android) helpers ─────────────────────────────────────────
const HC_READ_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
]

async function fetchHCVitals(hc) {
  const { startDate, endDate } = todayISO()
  const { startDate: s7, endDate: e7 } = last7DaysISO()

  const timeToday = { operator: 'between', startTime: startDate, endTime: endDate }
  const time7     = { operator: 'between', startTime: s7,        endTime: e7 }

  const [stepsR, hrR, spo2R, calR, hr7R] = await Promise.allSettled([
    withTimeout(hc.readRecords({ type: 'Steps',                  timeRangeFilter: timeToday })),
    withTimeout(hc.readRecords({ type: 'HeartRate',              timeRangeFilter: timeToday })),
    withTimeout(hc.readRecords({ type: 'OxygenSaturation',       timeRangeFilter: timeToday })),
    withTimeout(hc.readRecords({ type: 'ActiveCaloriesBurned',   timeRangeFilter: timeToday })),
    withTimeout(hc.readRecords({ type: 'HeartRate',              timeRangeFilter: time7 })),
  ])

  const steps = stepsR.status === 'fulfilled'
    ? Math.round(stepsR.value?.records?.reduce((a, r) => a + (r.count ?? 0), 0) ?? 0) || null
    : null

  const hrRecords = hrR.status === 'fulfilled' ? hrR.value?.records ?? [] : []
  const hrSamples = hrRecords.flatMap(r => r.samples ?? [])
  const heartRate = hrSamples.length
    ? Math.round(hrSamples[hrSamples.length - 1]?.beatsPerMinute ?? 0)
    : null

  const spo2Records = spo2R.status === 'fulfilled' ? spo2R.value?.records ?? [] : []
  const spo2 = spo2Records.length
    ? Math.round(spo2Records[spo2Records.length - 1]?.percentage ?? 0)
    : null

  const calRecords = calR.status === 'fulfilled' ? calR.value?.records ?? [] : []
  const calories = calRecords.length
    ? Math.round(calRecords.reduce((a, r) => a + (r.energy?.inKilocalories ?? r.energy?.value ?? 0), 0)) || null
    : null

  const hr7Records = hr7R.status === 'fulfilled' ? hr7R.value?.records ?? [] : []
  const hrWeek = (() => {
    const allSamples = hr7Records.flatMap(r => r.samples ?? [])
    if (!allSamples.length) return null
    const byDay = {}
    allSamples.forEach(s => {
      const day = new Date(s.time ?? s.startTime ?? 0).toLocaleDateString('en-US', { weekday: 'short' })
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(s.beatsPerMinute ?? 0)
    })
    return Object.entries(byDay).map(([day, vals]) => ({
      day,
      value: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length),
    }))
  })()

  return { steps, heartRate, spo2, calories, hrWeek }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useHealthData() {
  const [connected, setConnected] = useState(() => isNative && localStorage.getItem(LS_KEY) === 'true')
  const [vitals,    setVitals]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const fetchedRef = useRef(false)

  // ── Fetch vitals ────────────────────────────────────────────────────────
  const fetchVitals = useCallback(async () => {
    if (!isNative) return
    setLoading(true)
    setError(null)
    try {
      if (platform === 'ios') {
        const hk = await getHKPlugin()
        if (!hk) throw new Error('HealthKit plugin unavailable')
        setVitals(await fetchHKVitals(hk))
      } else if (platform === 'android') {
        const hc = await getHCPlugin()
        if (!hc) throw new Error('Health Connect plugin unavailable')
        setVitals(await fetchHCVitals(hc))
      }
    } catch (e) {
      setError(e.message ?? 'Failed to read health data')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Connect ─────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!isNative) return { success: false, reason: 'not-native' }

    if (platform === 'ios') {
      const hk = await getHKPlugin()
      if (!hk) return { success: false, reason: 'plugin-unavailable' }

      try {
        const available = await withTimeout(hk.isAvailable(), 3000)
        if (!available) return { success: false, reason: 'not-available' }
      } catch {
        return { success: false, reason: 'not-available' }
      }

      setLoading(true); setError(null)
      try {
        await withTimeout(hk.requestAuthorization({ all: [], read: HK_PERMISSIONS, write: [] }))
        localStorage.setItem(LS_KEY, 'true')
        setConnected(true)
        await fetchVitals()
        return { success: true }
      } catch (e) {
        const reason = e.message === 'timeout' ? 'Request timed out' : (e.message ?? 'Authorization failed')
        setError(reason); setLoading(false)
        return { success: false, reason }
      }
    }

    if (platform === 'android') {
      const hc = await getHCPlugin()
      if (!hc) return { success: false, reason: 'plugin-unavailable' }

      try {
        const { availability } = await withTimeout(hc.checkAvailability(), 5000)
        if (availability !== 'Available') {
          return { success: false, reason: availability === 'NotInstalled' ? 'not-installed' : 'not-available' }
        }
      } catch {
        return { success: false, reason: 'not-available' }
      }

      setLoading(true); setError(null)
      try {
        await withTimeout(hc.requestHealthPermissions({ read: HC_READ_PERMISSIONS, write: [] }), 30000)
        localStorage.setItem(LS_KEY, 'true')
        setConnected(true)
        await fetchVitals()
        return { success: true }
      } catch (e) {
        const reason = e.message === 'timeout' ? 'Request timed out' : (e.message ?? 'Authorization failed')
        setError(reason); setLoading(false)
        return { success: false, reason }
      }
    }

    return { success: false, reason: 'unsupported-platform' }
  }, [fetchVitals])

  // Auto-fetch on mount if already connected
  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true
      fetchVitals()
    }
  }, [connected]) // eslint-disable-line

  return {
    connected,
    vitals,
    loading,
    error,
    connect,
    refresh: fetchVitals,
    isNative,
    isIOS:     platform === 'ios',
    isAndroid: platform === 'android',
    platform,
  }
}
