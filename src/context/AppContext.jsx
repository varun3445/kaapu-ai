import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase, supabaseReady } from '../supabase'
import { startAlarm, stopActiveAlarm } from '../utils/audio'
import { severityLabel, SEVERITY_HIGH_THRESHOLD, SEVERITY_MID_THRESHOLD } from '../utils/severity'

// ── Push Notifications (lazy — native iOS + Android via Capacitor) ────────────
let _pushPlugin = null
async function getPushPlugin() {
  if (_pushPlugin) return _pushPlugin
  if (!Capacitor.isNativePlatform()) return null
  try {
    const mod = await import('@capacitor/push-notifications')
    _pushPlugin = mod.PushNotifications
    return _pushPlugin
  } catch {
    return null
  }
}

// Web Push VAPID public key (set VITE_VAPID_PUBLIC_KEY in .env)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
import {
  DEMO_FAMILY, DEMO_MEMBERS, DEMO_SYMPTOMS, DEMO_CHECKINS,
  DEMO_DOCUMENTS, DEMO_CONDITIONS, DEMO_MEDICATIONS, DEMO_RISK_PROFILES,
  DEMO_USERS, DEMO_FAMILY_REQUESTS,
} from '../data/mockData'

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateUID() {
  const n = (Math.floor(Math.random() * 900000000) + 100000000).toString()
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}`
}

// localStorage — UI prefs only (member switching was removed)
const LS = { skinColor: 'ht_skin_color' }
// Clear any stale member selection left over from before the switcher was removed
try { localStorage.removeItem('ht_current_member') } catch (_) {}
const lsLoad = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb } catch { return fb } }
const lsSave = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (_) {} }

// ── Streak notification deduplication ────────────────────────────────────────
const STREAK_LS = 'kaapu-streak-notified'
function _getStreakSet() {
  try { return new Set(JSON.parse(localStorage.getItem(STREAK_LS) || '[]')) } catch { return new Set() }
}
function _markStreak(key) {
  const s = _getStreakSet(); s.add(key)
  try { localStorage.setItem(STREAK_LS, JSON.stringify([...s].slice(-200))) } catch (_) {}
}

// How many consecutive days a symptom's duration field implies
const DURATION_STREAK_DAYS = {
  'Just started': 0, 'A few hours': 0, '1 day': 1,
  '2–3 days': 3, '1 week': 7, '2+ weeks': 14, 'Ongoing': 14,
}

// ── Emergency summary ─────────────────────────────────────────────────────────
function buildEmergencySummary({ member, conditions, medications, symptoms, checkIns, riskProfile, userNote }) {
  const lines = []
  const agePart    = member.age  ? `, ${member.age}yo` : ''
  const genderPart = member.gender && member.gender !== 'other' ? ` ${member.gender}` : ''
  lines.push(`Patient: ${member.name}${agePart}${genderPart}`)
  if (conditions.length)  lines.push(`Chronic conditions: ${conditions.map(c => c.name).join(', ')}`)
  if (medications.length) lines.push(`Current medications: ${medications.map(m => `${m.name} ${m.dosage}`).join(', ')}`)
  const hrs72 = symptoms.filter(s => Date.now() - new Date(s.timestamp).getTime() < 72 * 3600000)
  const high  = hrs72.filter(s => s.severity >= SEVERITY_HIGH_THRESHOLD)
  if (high.length)  lines.push(`⚠️ HIGH (72h): ${high.map(s => `${s.bodyLabel} ${s.type} (${severityLabel(s.severity)})`).join(' | ')}`)
  if (hrs72.length) lines.push(`Recent: ${hrs72.map(s => `${s.type} at ${s.bodyLabel}`).join(', ')}`)
  const lastCI = checkIns[0]
  lines.push(lastCI
    ? `Last check-in: ${lastCI.feeling} on ${new Date(lastCI.date).toLocaleDateString()}`
    : 'Last check-in: not recorded')
  if (riskProfile?.riskLevel === 'high' || riskProfile?.riskLevel === 'critical')
    lines.push(`Risk: ${riskProfile.riskLevel.toUpperCase()} (doctor-assigned)`)
  if (userNote) lines.push(`Note: "${userNote}"`)
  return lines.join(' · ')
}

const RELATIONSHIP_INVERSE = {
  'Parent':'Child','Child':'Parent','Grandparent':'Grandchild','Grandchild':'Grandparent',
  'Partner':'Partner','Spouse':'Spouse','Sibling':'Sibling',
  'Carer':'Ward','Ward':'Carer','Friend':'Friend','Other':'Other',
}

// ── Mood calculation from active symptoms ─────────────────────────────────────
// Severity tiers (1-6 scale): minor 1-2 (1pt), moderate 3-4 (2pts), severe 5-6 (4pts)
// Score thresholds: 0=great, 1=good, 2-3=okay, 4-5=bad, 6+=terrible
export function calculateMoodFromSymptoms(activeSymptoms) {
  let score = 0
  activeSymptoms.forEach(s => {
    if (s.severity >= SEVERITY_HIGH_THRESHOLD)      score += 4  // severe
    else if (s.severity >= SEVERITY_MID_THRESHOLD) score += 2  // moderate
    else                      score += 1  // minor
  })
  if (score === 0) return 'great'
  if (score === 1) return 'good'
  if (score <= 3)  return 'okay'
  if (score <= 5)  return 'bad'
  return 'terrible'
}

// ── Context ───────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  // ── Demo param: auto-login when ?demo=true is in the URL ──────────────────
  const _demoParam = new URLSearchParams(window.location.search).get('demo') === 'true'
  const _demoUser  = _demoParam ? DEMO_USERS[0] : null
  const _demoMine  = _demoParam ? DEMO_MEMBERS.filter(m => m.familyId === _demoUser.familyId) : []

  // ── Loading & mode ────────────────────────────────────────────────────────
  const [appLoading,  setAppLoading]  = useState(false)
  const [isDemoMode,  setIsDemoMode]  = useState(_demoParam)
  const isDemoRef = useRef(_demoParam)

  // ── Auth state ────────────────────────────────────────────────────────────
  const [currentUser,   setCurrentUser]   = useState(_demoUser)
  const [currentMember, setCurrentMember] = useState(_demoMine[0] || null)

  // ── Data state ────────────────────────────────────────────────────────────
  const [members,         setMembers]         = useState(_demoParam ? DEMO_MEMBERS : [])
  const [families,        setFamilies]        = useState(_demoParam ? [DEMO_FAMILY] : [])
  const [symptoms,        setSymptoms]        = useState(_demoParam ? DEMO_SYMPTOMS : [])
  const [checkIns,        setCheckIns]        = useState(_demoParam ? DEMO_CHECKINS : [])
  const [documents,       setDocuments]       = useState(_demoParam ? DEMO_DOCUMENTS : [])
  const [doctorPatients,  setDoctorPatients]  = useState([])
  const [conditions,      setConditions]      = useState(_demoParam ? DEMO_CONDITIONS : [])
  const [medications,     setMedications]     = useState(_demoParam ? DEMO_MEDICATIONS : [])
  const [riskProfiles,    setRiskProfiles]    = useState(_demoParam ? DEMO_RISK_PROFILES : [])
  const [emergencyEvents, setEmergencyEvents] = useState([])
  const [familyRequests,  setFamilyRequests]  = useState(_demoParam ? DEMO_FAMILY_REQUESTS.map(r => ({ ...r, toUserId: _demoUser.id, toUserName: _demoUser.name || r.toUserName })) : [])
  const [notifications,   setNotifications]   = useState([])
  const [notifCentreOpen, setNotifCentreOpen] = useState(false)
  const [activeEmergency, setActiveEmergency] = useState(null)
  const [skinColor,       setSkinColorState]  = useState(() => lsLoad(LS.skinColor, '#C49272'))
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  // Push notification registration ref (prevent duplicate registrations)
  const symptomsRef = useRef(symptoms)
  const pushRegisteredRef = useRef(false)

  // Real-time channel refs
  const channelMembersRef        = useRef(null)
  const channelRequestsRef       = useRef(null)
  const channelEmergencyRef      = useRef(null)
  const channelConnectedEmgRefs  = useRef([]) // one channel per linked family
  const channelSymptomsRef       = useRef(null)
  const channelCheckInsRef       = useRef(null)
  const channelDocumentsRef      = useRef(null)
  const channelBroadcastsRef     = useRef(null)

  // ── Persist UI prefs ──────────────────────────────────────────────────────
  useEffect(() => { lsSave(LS.skinColor, skinColor) }, [skinColor])
  useEffect(() => { symptomsRef.current = symptoms }, [symptoms])
  // currentMember is always derived from the auth user — no localStorage persistence needed

  // Keep currentMember in sync when the members array is updated (e.g. after updateProfile)
  useEffect(() => {
    if (!currentMember) return
    const updated = members.find(m => m.id === currentMember.id)
    if (updated && JSON.stringify(updated) !== JSON.stringify(currentMember)) {
      setCurrentMember(updated)
    }
  }, [members]) // eslint-disable-line

  // ── Supabase Auth listener ────────────────────────────────────────────────
  const loadingRef = useRef(false) // guard against concurrent _loadUserData calls

  useEffect(() => {
    if (!supabaseReady) {
      setAppLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
        if (loadingRef.current) return // already loading, skip duplicate
        loadingRef.current = true
        setAppLoading(true)
        try {
          // 25s hard timeout on the entire load sequence
          const loadDeadline = new Promise((_, rej) =>
            setTimeout(() => rej(new Error('load-timeout')), 25000)
          )
          await Promise.race([_loadUserData(session.user.id), loadDeadline])
        } catch (e) {
          console.error('[load]', e.message)
        } finally {
          loadingRef.current = false
          setAppLoading(false)
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      } else if (event === 'SIGNED_OUT') {
        if (!isDemoRef.current) _clearState()
      }
    })

    return () => {
      subscription.unsubscribe()
      _removeChannels()
    }
  }, []) // eslint-disable-line

  // ── Demo auto-login via ?demo=true URL param (for design capture only) ──────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === 'true' && !isDemoRef.current) {
      const demoUser = DEMO_USERS[0]
      isDemoRef.current = true; setIsDemoMode(true)
      setCurrentUser(demoUser)
      setMembers(DEMO_MEMBERS); setFamilies([DEMO_FAMILY])
      setSymptoms(DEMO_SYMPTOMS); setCheckIns(DEMO_CHECKINS)
      setDocuments(DEMO_DOCUMENTS); setConditions(DEMO_CONDITIONS)
      setMedications(DEMO_MEDICATIONS); setRiskProfiles(DEMO_RISK_PROFILES)
      setFamilyRequests(DEMO_FAMILY_REQUESTS.map(r => ({
        ...r, toUserId: demoUser.id, toUserName: demoUser.name || r.toUserName,
      })))
      const mine = DEMO_MEMBERS.filter(m => m.familyId === demoUser.familyId)
      setCurrentMember(mine.find(m => m.userId === demoUser.id) || mine[0] || null)
      setAppLoading(false)
    }
  }, []) // eslint-disable-line

  // helper: run a supabase query with a per-query timeout
  function _sbq(promise, ms = 15000) {
    const t = new Promise((_, rej) => setTimeout(() => rej(new Error('query-timeout')), ms))
    return Promise.race([promise, t])
  }

  // ── Load user data from Supabase ──────────────────────────────────────────
  async function _loadUserData(uid) {
    let { data: userRow } = await _sbq(
      supabase.from('users').select('*').eq('id', uid).single()
    )

    // First OAuth/email login — no profile yet, create one automatically
    if (!userRow) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const name     = authUser.user_metadata?.full_name
                    || authUser.user_metadata?.name
                    || authUser.email?.split('@')[0]
                    || 'User'
      const familyId = `fam-${uid}`
      const uid9     = generateUID()

      // Merge age/gender/role saved during email-confirmation signup
      let pending = {}
      try {
        const raw = sessionStorage.getItem('kaapu_pending_profile')
        if (raw) { pending = JSON.parse(raw); sessionStorage.removeItem('kaapu_pending_profile') }
      } catch (_) {}

      const newUser  = {
        id: uid, email: authUser.email, name, familyId, uid: uid9,
        role: pending.role || 'user',
        age: pending.age || null,
        gender: pending.gender || 'other',
        ...(pending.consentGivenAt ? { consentGivenAt: pending.consentGivenAt } : {}),
      }
      const lastName   = name.split(' ').slice(-1)[0] || name
      await _sbq(Promise.all([
        supabase.from('users').insert(newUser),
        supabase.from('families').insert({ id: familyId, name: `${lastName} Family` }),
        supabase.from('members').insert({
          id: `mem-${uid}`, familyId, userId: uid, name,
          age: pending.age || null, gender: pending.gender || 'other',
          relationship: 'Self', avatar: name.slice(0, 2).toUpperCase(), avatarColor: '#6366f1',
        }),
      ]))
      userRow = newUser
    }

    const userData = { ...userRow }
    // Set user immediately so the app can render — rest of data loads below
    setCurrentUser(userData)
    setAppLoading(false)  // dismiss loading splash; remaining queries run in background
    isDemoRef.current = false
    setIsDemoMode(false)

    // Register for push notifications (iOS, Android, Web — best-effort, never blocks load)
    _registerPush(uid).catch(console.error)

    // Auto-save detected timezone if not already stored
    if (!userData.timezone) {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (detectedTz) {
        supabase?.from('users').update({ timezone: detectedTz }).eq('id', uid).then(() => {
          setCurrentUser(prev => prev ? { ...prev, timezone: detectedTz } : prev)
        })
      }
    }

    const { familyId } = userData

    // Remove old real-time channels
    _removeChannels()

    // Real-time: members
    channelMembersRef.current = supabase
      .channel(`members:${familyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `familyId=eq.${familyId}` },
        (payload) => {
          setMembers(prev => {
            if (payload.eventType === 'INSERT') {
              if (prev.find(m => m.id === payload.new.id)) return prev
              // If this new member has a linkedFamilyId (a cross-family connection was just
              // established WHILE this session is live), subscribe to their emergency channel
              // so we receive alerts from their family in real-time.
              const lfId = payload.new.linkedFamilyId
              if (lfId && lfId !== familyId && supabase) {
                const alreadyLinked = channelConnectedEmgRefs.current.some(
                  ch => ch.topic && ch.topic.includes(lfId)
                )
                if (!alreadyLinked) {
                  const newCh = supabase
                    .channel(`emergency:linked:${lfId}`)
                    .on('postgres_changes',
                      { event: '*', schema: 'public', table: 'emergencyEvents', filter: `familyId=eq.${lfId}` },
                      _handleEmergencyPayload,
                    )
                    .subscribe()
                  channelConnectedEmgRefs.current = [...channelConnectedEmgRefs.current, newCh]
                }
              }
              return [...prev, payload.new]
            }
            if (payload.eventType === 'UPDATE') return prev.map(m => m.id === payload.new.id ? payload.new : m)
            if (payload.eventType === 'DELETE') return prev.filter(m => m.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    // Real-time: family requests
    channelRequestsRef.current = supabase
      .channel(`requests:${uid}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'familyRequests' },
        (payload) => {
          const row = payload.new || payload.old
          if (!row) return
          if (row.fromUserId !== uid && row.toUserId !== uid) return
          setFamilyRequests(prev => {
            if (payload.eventType === 'INSERT') {
              if (prev.find(r => r.id === row.id)) return prev
              // If this request is incoming (we are the recipient), push a notification
              if (row.toUserId === uid) {
                setNotifications(n => {
                  const notifId = `fam-req-${row.id}`
                  if (n.find(x => x.id === notifId)) return n
                  return [{
                    id: notifId, type: 'familyRequest', requestId: row.id,
                    forUserId: uid, timestamp: row.timestamp,
                    message: `${row.fromUserName} (${row.fromUserUid}) wants to connect with you as ${row.relationship}.`,
                  }, ...n].slice(0, 30)
                })
              }
              return [...prev, payload.new]
            }
            if (payload.eventType === 'UPDATE') {
              // If our outgoing request was just accepted, notify + pull the new member
              if (payload.new.status === 'accepted' && payload.new.fromUserId === uid) {
                setNotifications(n => {
                  const notifId = `fam-accept-rt-${payload.new.id}`
                  if (n.find(x => x.id === notifId)) return n
                  return [{
                    id: notifId, type: 'success',
                    timestamp: new Date().toISOString(),
                    message: `✅ ${payload.new.toUserName} accepted your connection request.`,
                  }, ...n].slice(0, 30)
                })
                // The accepter inserted a member record into OUR family in Supabase.
                // Don't rely on the members realtime channel for this — fetch it directly.
                if (supabase) {
                  supabase
                    .from('members')
                    .select('*')
                    .eq('familyId', familyId)
                    .eq('userId', payload.new.toUserId)
                    .single()
                    .then(({ data }) => {
                      if (data) {
                        setMembers(prev =>
                          prev.find(m => m.id === data.id) ? prev : [...prev, data]
                        )
                      }
                    })
                }
              }
              return prev.map(r => r.id === payload.new.id ? payload.new : r)
            }
            if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    // Real-time: symptoms
    channelSymptomsRef.current = supabase
      .channel(`symptoms:${familyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'symptoms', filter: `familyId=eq.${familyId}` },
        (payload) => {
          setSymptoms(prev => {
            if (payload.eventType === 'INSERT') {
              return prev.find(s => s.id === payload.new.id) ? prev : [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') return prev.map(s => s.id === payload.new.id ? payload.new : s)
            if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    // Real-time: check-ins
    channelCheckInsRef.current = supabase
      .channel(`checkIns:${familyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'checkIns', filter: `familyId=eq.${familyId}` },
        (payload) => {
          setCheckIns(prev => {
            if (payload.eventType === 'INSERT') {
              return prev.find(c => c.id === payload.new.id) ? prev : [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') return prev.map(c => c.id === payload.new.id ? payload.new : c)
            if (payload.eventType === 'DELETE') return prev.filter(c => c.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    // Real-time: documents
    channelDocumentsRef.current = supabase
      .channel(`documents:${familyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `familyId=eq.${familyId}` },
        (payload) => {
          setDocuments(prev => {
            if (payload.eventType === 'INSERT') {
              return prev.find(d => d.id === payload.new.id) ? prev : [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') return prev.map(d => d.id === payload.new.id ? payload.new : d)
            if (payload.eventType === 'DELETE') return prev.filter(d => d.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    // Real-time: global broadcasts (admin nudges → in-app notifications for everyone)
    channelBroadcastsRef.current = supabase
      .channel('broadcasts:global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts' },
        (payload) => {
          const b = payload.new
          pushNotif({
            id:        `broadcast-${b.id}`,
            type:      b.type === 'nudge' ? 'info' : (b.type || 'info'),
            message:   b.message,
            timestamp: b.created_at,
          })
        }
      )
      .subscribe()

    // Catch-up broadcasts: fire without blocking the main data load
    const seenKey = `kaapu_broadcasts_seen_${uid}`;
    (async () => {
      const lastSeen = localStorage.getItem(seenKey) || new Date(0).toISOString()
      const { data: missed } = await supabase
        .from('broadcasts')
        .select('*')
        .gt('created_at', lastSeen)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
      if (missed?.length) {
        const b = missed[0]
        pushNotif({
          id:        `broadcast-${b.id}`,
          type:      b.type === 'nudge' ? 'info' : (b.type || 'info'),
          message:   b.message,
          timestamp: b.created_at,
        })
      }
      localStorage.setItem(seenKey, new Date().toISOString())
    })().catch(console.error)

    // ── Step 1: Load members first — needed to know linked (connected) families ──
    const safe    = (res) => (res && !res.error ? res.data || [] : [])
    const safeOne = (res) => (res && !res.error ? res.data : null)

    const membersRes = await _sbq(supabase.from('members').select('*').eq('familyId', familyId)).catch(() => ({}))
    const allMems = safe(membersRes)
    setMembers(allMems)

    // ── Step 2: Wire emergency realtime for own family + all linked families ───
    // When a family connection is accepted, each member record gets a linkedFamilyId
    // pointing to the OTHER user's family. Subscribing to those channels means
    // emergencies triggered by connected users propagate to this session instantly.
    function _handleEmergencyPayload(payload) {
      if (payload.eventType === 'INSERT') {
        const ev = payload.new
        setEmergencyEvents(prev => prev.find(e => e.id === ev.id) ? prev : [ev, ...prev])
        // Use functional update to read current member without stale closure
        setCurrentMember(me => {
          if (!me || ev.memberId !== me.id) {
            // Emergency from someone else (same family or connected family)
            setActiveEmergency(ev)
            // Start the alarm siren so the observer hears it immediately
            try { startAlarm() } catch (_) {}
            setNotifications(n => {
              const id = `emg-rt-${ev.id}`
              if (n.find(x => x.id === id)) return n
              const name = ev.memberName || 'A family member'
              return [{
                id, type: 'emergency', eventId: ev.id,
                timestamp: ev.triggeredAt,
                message: `🚨 EMERGENCY: ${name} needs help!`,
              }, ...n].slice(0, 30)
            })
          }
          return me
        })
      }
      if (payload.eventType === 'UPDATE') {
        const ev = payload.new
        setEmergencyEvents(prev => prev.map(e => e.id === ev.id ? ev : e))
        if (ev.status === 'resolved') {
          setActiveEmergency(prev => {
            if (prev?.id === ev.id) {
              // Stop alarm for the observer when the emergency is resolved
              try { stopActiveAlarm() } catch (_) {}
              return null
            }
            return prev
          })
        }
      }
    }

    // Own family emergency channel
    channelEmergencyRef.current = supabase
      .channel(`emergency:own:${familyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'emergencyEvents', filter: `familyId=eq.${familyId}` },
        _handleEmergencyPayload,
      )
      .subscribe()

    // Connected family emergency channels (one per unique linkedFamilyId)
    const linkedFamilyIds = [...new Set(
      allMems
        .filter(m => m.linkedFamilyId && m.linkedFamilyId !== familyId)
        .map(m => m.linkedFamilyId)
    )]
    channelConnectedEmgRefs.current.forEach(ch => supabase?.removeChannel(ch))
    channelConnectedEmgRefs.current = linkedFamilyIds.map(lfId =>
      supabase
        .channel(`emergency:linked:${lfId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'emergencyEvents', filter: `familyId=eq.${lfId}` },
          _handleEmergencyPayload,
        )
        .subscribe()
    )

    // ── Step 3: Load remaining data in parallel ────────────────────────────────
    const [
      familyRes, sympRes, ciRes, docRes, dpRes,
      condRes, medRes, riskRes, emgRes, reqRes,
    ] = await Promise.all([
      _sbq(supabase.from('families').select('*').eq('id', familyId).single()).catch(() => ({})),
      _sbq(supabase.from('symptoms').select('*').eq('familyId', familyId)).catch(() => ({})),
      _sbq(supabase.from('checkIns').select('*').eq('familyId', familyId)).catch(() => ({})),
      _sbq(supabase.from('documents').select('*').eq('familyId', familyId)).catch(() => ({})),
      _sbq(supabase.from('doctorPatients').select('*').eq('doctorId', uid)).catch(() => ({})),
      _sbq(supabase.from('conditions').select('*').eq('familyId', familyId)).catch(() => ({})),
      _sbq(supabase.from('medications').select('*').eq('familyId', familyId)).catch(() => ({})),
      _sbq(supabase.from('riskProfiles').select('*').eq('familyId', familyId)).catch(() => ({})),
      _sbq(supabase.from('emergencyEvents').select('*').eq('familyId', familyId)).catch(() => ({})),
      _sbq(supabase.from('familyRequests').select('*').or(`fromUserId.eq.${uid},toUserId.eq.${uid}`)).catch(() => ({})),
    ])

    const fam = safeOne(familyRes)
    if (fam) setFamilies([fam])
    setSymptoms(safe(sympRes))
    setCheckIns(safe(ciRes))
    setDocuments(safe(docRes))
    setDoctorPatients(safe(dpRes))
    setConditions(safe(condRes))
    setMedications(safe(medRes))
    setRiskProfiles(safe(riskRes))
    setEmergencyEvents(safe(emgRes))
    setFamilyRequests(safe(reqRes))

    // Always show the logged-in user's own member — no switching allowed
    const ownMember = allMems.find(m => m.userId === uid) || null
    setCurrentMember(ownMember)
  }

  // ── Push notification registration ───────────────────────────────────────
  async function _registerPush(uid) {
    if (pushRegisteredRef.current) return
    pushRegisteredRef.current = true // set early to prevent double-registration

    const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

    // ── Native (iOS + Android via Capacitor) ──────────────────────────────
    if (Capacitor.isNativePlatform()) {
      const PN = await getPushPlugin()
      if (!PN) return

      try {
        const { receive } = await PN.requestPermissions()
        if (receive !== 'granted') return

        await PN.register()

        // Fires when APNs (iOS) or FCM (Android) returns the device token
        PN.addListener('registration', async ({ value: token }) => {
          if (!token || !supabase) return
          const { error } = await supabase.from('deviceTokens').upsert(
            { id: `${uid}-${platform}`, userId: uid, token, platform, updatedAt: new Date().toISOString() },
            { onConflict: 'userId,platform' }
          )
          if (error) console.error(`[push registration ${platform}]`, error.message)
          else console.info(`[push] ${platform} token saved`)
        })

        // Show incoming foreground push as in-app notification
        PN.addListener('pushNotificationReceived', (notification) => {
          const { title, body } = notification
          setNotifications(prev => {
            const id = `push-${Date.now()}`
            return [{ id, type: 'push', message: body || title || 'New notification', timestamp: new Date().toISOString() }, ...prev].slice(0, 30)
          })
        })
      } catch (e) {
        console.error(`[push setup ${platform}]`, e.message)
        pushRegisteredRef.current = false
      }
      return
    }

    // ── Web Push via VAPID ────────────────────────────────────────────────
    if (!VAPID_PUBLIC_KEY) return // not configured
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Ask for notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      if (!supabase) return
      const { error } = await supabase.from('deviceTokens').upsert(
        { id: `${uid}-web`, userId: uid, token: JSON.stringify(subscription), platform: 'web', updatedAt: new Date().toISOString() },
        { onConflict: 'userId,platform' }
      )
      if (error) console.error('[web push registration]', error.message)
      else console.info('[push] web subscription saved')
    } catch (e) {
      console.error('[web push setup]', e.message)
      pushRegisteredRef.current = false
    }
  }

  function _removeChannels() {
    if (channelMembersRef.current)   { supabase?.removeChannel(channelMembersRef.current);   channelMembersRef.current   = null }
    if (channelRequestsRef.current)  { supabase?.removeChannel(channelRequestsRef.current);  channelRequestsRef.current  = null }
    if (channelEmergencyRef.current) { supabase?.removeChannel(channelEmergencyRef.current); channelEmergencyRef.current = null }
    if (channelSymptomsRef.current)  { supabase?.removeChannel(channelSymptomsRef.current);  channelSymptomsRef.current  = null }
    if (channelCheckInsRef.current)  { supabase?.removeChannel(channelCheckInsRef.current);  channelCheckInsRef.current  = null }
    if (channelDocumentsRef.current)   { supabase?.removeChannel(channelDocumentsRef.current);   channelDocumentsRef.current   = null }
    if (channelBroadcastsRef.current)  { supabase?.removeChannel(channelBroadcastsRef.current);  channelBroadcastsRef.current  = null }
    channelConnectedEmgRefs.current.forEach(ch => supabase?.removeChannel(ch))
    channelConnectedEmgRefs.current = []
  }

  function _clearState() {
    setCurrentUser(null); setCurrentMember(null)
    setMembers([]);   setFamilies([]);   setSymptoms([]);    setCheckIns([])
    setDocuments([]); setDoctorPatients([]); setConditions([]); setMedications([])
    setRiskProfiles([]); setEmergencyEvents([]); setFamilyRequests([])
    setNotifications([]); setActiveEmergency(null)
    _removeChannels()
  }

  // ── Supabase write helpers (no-ops in demo mode) ──────────────────────────
  const sbInsert = useCallback(async (table, row) => {
    if (isDemoRef.current || !supabase) return
    const { error } = await supabase.from(table).insert(row)
    if (error) console.error(`[sb insert ${table}]`, error?.message, error?.code, error?.details)
  }, [])

  const sbUpsert = useCallback(async (table, row) => {
    if (isDemoRef.current || !supabase) return
    const { error } = await supabase.from(table).upsert(row)
    if (error) console.error(`[sb upsert ${table}]`, error)
  }, [])

  const sbUpdate = useCallback(async (table, id, data) => {
    if (isDemoRef.current || !supabase) return
    const { error } = await supabase.from(table).update(data).eq('id', id)
    if (error) console.error(`[sb update ${table}]`, error)
  }, [])

  const sbDelete = useCallback(async (table, id) => {
    if (isDemoRef.current || !supabase) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.error(`[sb delete ${table}]`, error)
  }, [])

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    // Demo bypass
    const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password)
    if (demoUser) {
      isDemoRef.current = true; setIsDemoMode(true)
      setCurrentUser(demoUser)
      setMembers(DEMO_MEMBERS); setFamilies([DEMO_FAMILY])
      setSymptoms(DEMO_SYMPTOMS); setCheckIns(DEMO_CHECKINS)
      setDocuments(DEMO_DOCUMENTS); setConditions(DEMO_CONDITIONS)
      setMedications(DEMO_MEDICATIONS); setRiskProfiles(DEMO_RISK_PROFILES)
      setFamilyRequests(DEMO_FAMILY_REQUESTS.map(r => ({
        ...r, toUserId: demoUser.id, toUserName: demoUser.name || r.toUserName,
      })))
      const mine = DEMO_MEMBERS.filter(m => m.familyId === demoUser.familyId)
      if (mine.length) setCurrentMember(mine[0])
      return { ok: true }
    }

    if (!supabase) return { error: 'Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' }

    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000))
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ])
      if (error) {
        const msg = error.message?.toLowerCase() || ''
        if (msg.includes('email not confirmed'))
          return { error: 'Please confirm your email first — check your inbox for a verification link.' }
        if (msg.includes('invalid') || msg.includes('not found') || msg.includes('no user'))
          return { error: 'No account found with that email. Please sign up first.' }
        return { error: error.message || 'Invalid email or password.' }
      }
      return { ok: true }
    } catch (e) {
      return { error: e.message === 'timeout' ? 'Server took too long — it may be waking up. Please try again.' : 'Something went wrong. Please try again.' }
    }
  }, [])

  const signup = useCallback(async (data) => {
    if (!supabase) return { error: 'Supabase not configured.' }

    try {
      const deadline = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))

      const siteUrl = window.location.hostname === 'localhost'
        ? window.location.origin
        : 'https://health-ex.netlify.app'
      const { data: authData, error: authErr } = await Promise.race([
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: siteUrl,
            data: { full_name: (data.name || '').trim() },
          },
        }),
        deadline,
      ])
      if (authErr) {
        if (authErr.message.toLowerCase().includes('already')) return { error: 'Email already in use.' }
        return { error: authErr.message }
      }
      if (!authData?.user) return { error: 'Sign up failed. Please try again.' }

      // Email confirmation is enabled — no session yet. Save profile data
      // so _loadUserData can use it when the user confirms and logs in.
      if (!authData.session) {
        sessionStorage.setItem('kaapu_pending_profile', JSON.stringify({
          age: parseInt(data.age) || null,
          gender: data.gender || 'other',
          role: data.role || 'user',
          consentGivenAt: data.consentGivenAt || null,
        }))
        return { needsEmailConfirmation: true }
      }

      const uid      = authData.user.id
      const familyId = `fam-${uid}`
      const uid9     = generateUID()

      const fullName       = (data.name || '').trim()
      const lastName       = fullName.split(' ').slice(-1)[0] || fullName
      const familyName     = `${lastName} Family`
      const avatarInitials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

      const userProfile = {
        id: uid, email: data.email, name: fullName,
        role: data.role || 'user', familyId, uid: uid9,
        age: parseInt(data.age) || null, gender: data.gender || 'other',
        ...(data.consentGivenAt ? { consentGivenAt: data.consentGivenAt } : {}),
      }

      const memberRecord = {
        id: `mem-${uid}`, familyId, userId: uid, name: fullName,
        age: parseInt(data.age) || null, gender: data.gender || 'other',
        relationship: 'Self', avatar: avatarInitials, avatarColor: '#6366f1',
      }

      // Use upsert so our correct data always wins even if _loadUserData
      // created a row from the email prefix during the auth state change race
      const writes = [
        supabase.from('users').upsert(userProfile),
        supabase.from('families').upsert({ id: familyId, name: familyName }),
      ]
      if (data.role !== 'doctor') {
        writes.push(supabase.from('members').upsert(memberRecord))
      }

      await Promise.race([Promise.all(writes), deadline])

      // Update both user and members state so header + profile reflect correct
      // data immediately, regardless of what _loadUserData wrote during the race
      setCurrentUser(userProfile)
      if (data.role !== 'doctor') {
        setMembers(prev => {
          const id = memberRecord.id
          return prev.some(m => m.id === id)
            ? prev.map(m => m.id === id ? { ...m, ...memberRecord } : m)
            : [...prev, memberRecord]
        })
        setCurrentMember(memberRecord)
      }

      // Fire welcome email — non-blocking, never fails the signup
      supabase.functions
        .invoke('send-welcome-email', { body: { email: data.email, name: fullName } })
        .catch(e => console.warn('[welcome-email]', e.message))

      // Flag for AppLayout: trigger tour once on first app render after signup
      sessionStorage.setItem('kaapu_show_tour', '1')

      return { ok: true }
    } catch (e) {
      return { error: e.message === 'timeout' ? 'Connection timed out — please try again.' : 'Sign up failed. Please try again.' }
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider) => {
    if (!supabase) return { error: 'Supabase not configured.' }
    const redirectTo = window.location.hostname === 'localhost'
      ? window.location.origin
      : 'https://health-ex.netlify.app'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) return { error: error.message }
    return { ok: true }
  }, [])

  const resetPassword = useCallback(async (email) => {
    if (!supabase) return { error: 'Supabase not configured.' }
    const { data } = await supabase.from('users').select('id').eq('email', email.trim().toLowerCase()).maybeSingle()
    if (!data) return { notFound: true }
    const redirectTo = window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) return { error: error.message }
    return { ok: true }
  }, [])

  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) return { error: 'Supabase not configured.' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    setIsPasswordRecovery(false)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    // Clear UI immediately — don't wait for network
    isDemoRef.current = false
    setIsDemoMode(false)
    _clearState()
    // Fire signOut in background (best-effort)
    supabase?.auth.signOut().catch(console.error)
  }, []) // eslint-disable-line

  const updateProfile = useCallback(async (updates) => {
    // 1. Optimistic local update for currentUser
    setCurrentUser(prev => prev ? { ...prev, ...updates } : prev)

    // 2. Mirror name / age / gender down into every member row for this user
    const memberUpdates = {}
    if (updates.name)   { memberUpdates.name = updates.name; memberUpdates.avatar = updates.name.slice(0, 2).toUpperCase() }
    if (updates.age !== undefined)    memberUpdates.age    = parseInt(updates.age) || null
    if (updates.gender) memberUpdates.gender = updates.gender

    if (Object.keys(memberUpdates).length > 0) {
      setMembers(prev => prev.map(m =>
        m.userId === currentUser?.id ? { ...m, ...memberUpdates } : m
      ))
    }

    // 3. Persist to Supabase — users table (all fields) + members table (profile fields)
    if (!isDemoRef.current && currentUser && supabase) {
      await sbUpdate('users', currentUser.id, updates)
      if (Object.keys(memberUpdates).length > 0) {
        await supabase.from('members').update(memberUpdates).eq('userId', currentUser.id)
      }
      // 4. Re-read the user row so currentUser reflects what's actually in DB.
      // Merge updates on top of fresh so a slow/stale read never reverts what we just saved.
      const { data: fresh } = await supabase.from('users').select('*').eq('id', currentUser.id).single()
      if (fresh) setCurrentUser({ ...fresh, ...updates })
    }
  }, [currentUser, sbUpdate])

  // ── Notifications ─────────────────────────────────────────────────────────
  const pushNotif = useCallback((n) => {
    setNotifications(prev => {
      if (prev.find(x => x.id === n.id)) return prev
      return [{ ...n, timestamp: n.timestamp || new Date().toISOString() }, ...prev].slice(0, 30)
    })
  }, [])

  const dismissNotification = useCallback((id) => setNotifications(n => n.filter(x => x.id !== id)), [])

  const checkForAlerts = useCallback((symptomList, userId) => {
    symptomList.filter(s => !s.resolved).forEach(s => {
      if (s.severity >= SEVERITY_HIGH_THRESHOLD)
        pushNotif({ id: `alert-${s.id}`, type: 'danger', forUserId: userId, message: `${severityLabel(s.severity)} ${s.categoryLabel} at ${s.bodyLabel}. Consider reaching out to a doctor.` })
      else if (s.severity >= SEVERITY_MID_THRESHOLD)
        pushNotif({ id: `alert-warn-${s.id}`, type: 'warning', forUserId: userId, message: `Moderate ${s.categoryLabel} at ${s.bodyLabel} — monitor closely.` })
    })
  }, [pushNotif])

  useEffect(() => {
    if (currentMember && currentUser)
      checkForAlerts(symptoms.filter(s => s.memberId === currentMember.id), currentUser.id)
  }, [symptoms, currentMember, checkForAlerts])

  // ── Symptom streak detection → Kaapu AI insight notification ─────────────
  const checkSymptomStreaks = useCallback((symptomList, member) => {
    if (!member) return
    const active = symptomList.filter(s => s.memberId === member.id && !s.resolved)
    if (!active.length) return

    // Group by category + body region
    const groups = {}
    active.forEach(s => {
      const key = `${s.category || s.categoryLabel}|${s.bodyRegion || s.bodyLabel}`
      if (!groups[key]) groups[key] = { sample: s, days: new Set(), ids: [], maxSev: 0, maxDurDays: 0 }
      groups[key].days.add(new Date(s.timestamp).toDateString())
      groups[key].ids.push(s.id)
      groups[key].maxSev = Math.max(groups[key].maxSev, s.severity || 0)
      // Factor in the user-reported duration (e.g. "1 week" = 7 days even if only 1 log entry)
      const durDays = DURATION_STREAK_DAYS[s.duration] ?? 0
      groups[key].maxDurDays = Math.max(groups[key].maxDurDays, durDays)
    })

    Object.entries(groups).forEach(([gKey, { sample, days, ids, maxSev, maxDurDays }]) => {
      if (maxSev <= 3) return

      // Count consecutive logged days
      const sorted = [...days].map(d => new Date(d).getTime()).sort((a, b) => a - b)
      let maxRun = 1, run = 1
      for (let i = 1; i < sorted.length; i++) {
        if ((sorted[i] - sorted[i - 1]) / 86400000 < 1.6) { run++; maxRun = Math.max(maxRun, run) }
        else run = 1
      }

      // Use whichever is larger: consecutive logged days OR user-reported duration
      const effectiveDays = Math.max(maxRun, maxDurDays)
      if (effectiveDays < 2) return

      // Deduplicate per symptom ID — each new log entry fires once, but won't re-fire for the same entry
      const seen = _getStreakSet()
      const newIds = ids.filter(id => !seen.has(`sym:${id}`))
      if (!newIds.length) return
      newIds.forEach(id => _markStreak(`sym:${id}`))

      const notifId  = `streak-${member.id}-${gKey}-${Date.now()}`
      const sessionId = `streak-session-${member.id}-${gKey}` // stable per symptom group
      const dayLabel  = effectiveDays >= 14 ? '2+ weeks' : effectiveDays >= 7 ? '1 week' : `${effectiveDays} days`
      pushNotif({
        id: notifId,
        type: 'ai-streak',
        timestamp: new Date().toISOString(),
        message: `Kaapu noticed you've had ${sample.categoryLabel} (${sample.bodyLabel}) for ${dayLabel}. Tap to discuss.`,
        streakData: {
          category: sample.categoryLabel,
          bodyArea: sample.bodyLabel,
          days: effectiveDays,
          symptomIds: ids,
          sessionId, // stable ID so re-tapping the notif reopens the same chat
        },
      })
    })
  }, [pushNotif])

  useEffect(() => {
    if (currentMember) checkSymptomStreaks(symptoms, currentMember)
  }, [symptoms, currentMember]) // eslint-disable-line

  // Re-push pending family requests as notifications after login
  useEffect(() => {
    if (!currentUser) return
    familyRequests
      .filter(r => r.toUserId === currentUser.id && r.status === 'pending')
      .forEach(r => pushNotif({
        id: `fam-req-${r.id}`, type: 'familyRequest', requestId: r.id,
        forUserId: currentUser.id, timestamp: r.timestamp,
        message: `${r.fromUserName} (${r.fromUserUid}) wants to connect with you as ${r.relationship}.`,
      }))
  }, [currentUser?.id]) // eslint-disable-line

  // ── Weekly AI Insight ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !currentMember || !supabase) return
    if (!currentUser.notifPrefs?.aiInsights) return

    // Check if today matches the user's chosen delivery day
    const DAY_MAP = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const todayDay = DAY_MAP[new Date().getDay()]
    const targetDay = currentUser.insightDay || 'monday'
    if (todayDay !== targetDay) return

    // Deduplicate: only fire once per calendar day
    const dedupeKey = `kaapu-weekly-insight-${currentUser.id}-${new Date().toDateString()}`
    if (localStorage.getItem(dedupeKey)) return

    // Gather 7-day data
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600000
    const memberSymptoms = symptoms.filter(s => s.memberId === currentMember.id)
    const symptoms7d = memberSymptoms
      .filter(s => new Date(s.timestamp).getTime() > sevenDaysAgo)
      .map(s => ({
        categoryLabel: s.categoryLabel,
        bodyLabel:     s.bodyLabel,
        category:      s.category,
        bodyArea:      s.bodyRegion || s.bodyLabel,
        severity:      s.severity,
        resolved:      s.resolved,
      }))

    const memberConditions  = conditions.filter(c => c.memberId === currentMember.id)
    const memberMedications = medications.filter(m => m.memberId === currentMember.id)
    const checkIns7d = checkIns
      .filter(c => c.memberId === currentMember.id && new Date(c.date).getTime() > sevenDaysAgo)
      .map(c => ({ mood: c.mood, energy: c.energy }))

    // Mark as delivered immediately to avoid double-fires
    localStorage.setItem(dedupeKey, '1')

    supabase.functions.invoke('kaapu-weekly-insight', {
      body: {
        healthData: {
          memberName:  currentMember.name,
          conditions:  memberConditions,
          medications: memberMedications,
          symptoms7d,
          checkIns7d,
          activeCount: symptoms7d.filter(s => !s.resolved).length,
        },
      },
    }).then(({ data, error }) => {
      if (error || !data?.insight) return
      const insight = data.insight
      pushNotif({
        id:        `weekly-insight-${currentUser.id}-${new Date().toDateString()}`,
        type:      'ai-weekly-insight',
        timestamp: new Date().toISOString(),
        message:   'Your weekly Kaapu health insight is ready. Tap to read.',
        insightData: { insight, memberName: currentMember.name },
      })
    }).catch(() => {
      // If call fails, remove the dedupe key so it can retry next launch
      localStorage.removeItem(dedupeKey)
    })
  }, [currentUser?.id, currentMember?.id]) // eslint-disable-line

  // ── Escalation check ──────────────────────────────────────────────────────
  const checkEscalation = useCallback(() => {
    if (!currentUser) return
    const familyMemberIds = members.filter(m => m.familyId === currentUser.familyId).map(m => m.id)
    riskProfiles
      .filter(r => familyMemberIds.includes(r.memberId) && r.mandatoryCheckIn && r.riskLevel !== 'normal')
      .forEach(r => {
        const member = members.find(m => m.id === r.memberId)
        if (!member) return
        const todayStr = new Date().toDateString()
        const todayCI  = checkIns.find(c => c.memberId === r.memberId && new Date(c.date).toDateString() === todayStr)
        if (!todayCI) {
          const minsElapsed = (Date.now() - new Date().setHours(8,0,0,0)) / 60000
          if (minsElapsed > r.escalationMins)
            pushNotif({ id: `esc-${r.memberId}-${todayStr}`, type: 'escalation', forUserId: currentUser.id, message: `⚠️ ${member.name} hasn't checked in today (${r.escalationMins} min window exceeded).`, memberId: r.memberId })
        }
      })
  }, [currentUser, members, riskProfiles, checkIns, pushNotif])

  useEffect(() => { checkEscalation() }, [checkIns, currentUser]) // eslint-disable-line

  // ── Members ───────────────────────────────────────────────────────────────
  const addMember = useCallback((data) => {
    const m = { id: `mem-${Date.now()}`, familyId: currentUser.familyId, ...data, avatar: data.name.slice(0,2).toUpperCase(), avatarColor: ['#6366f1','#0891b2','#ec4899','#10b981','#f59e0b'][Math.floor(Math.random()*5)] }
    setMembers(prev => [...prev, m])
    sbInsert('members', m)
    return m
  }, [currentUser, sbInsert])

  const switchMember = useCallback((m) => { setCurrentMember(m) }, [])

  const isAdmin = currentUser?.role === 'admin'

  const sendBroadcast = useCallback(async ({ message, type = 'nudge' }) => {
    if (!supabase) return { error: 'Not configured' }
    const { error } = await supabase.from('broadcasts').insert({ message, type, created_by: currentUser?.id })
    return error ? { error: error.message } : { ok: true }
  }, [currentUser?.id])

  const removeMember = useCallback((id) => {
    const member = members.find(m => m.id === id)

    // Optimistic: remove from local state immediately
    setMembers(prev => prev.filter(m => m.id !== id))
    if (currentMember?.id === id) setCurrentMember(members.filter(m => m.id !== id && m.familyId === currentUser?.familyId)[0] || null)

    if (isDemoRef.current || !supabase) return

    if (member?.linkedFamilyId) {
      // Connected account — use SECURITY DEFINER RPC so both the caller's record
      // AND the mirror record in the other family are deleted atomically.
      // Also marks all matching familyRequests as 'disconnected' so they vanish.
      supabase
        .rpc('remove_family_connection', { p_member_id: id })
        .then(({ error }) => { if (error) console.error('[removeMember rpc]', error) })

      // Also optimistically remove the linked family request from local state
      setFamilyRequests(prev => prev.map(r =>
        ((r.fromUserId === currentUser?.id && r.toUserId === member.userId) ||
         (r.fromUserId === member.userId   && r.toUserId === currentUser?.id))
          ? { ...r, status: 'disconnected' }
          : r
      ))
    } else {
      // Local-only member (no cross-family link) — plain delete
      sbDelete('members', id)
    }
  }, [currentMember, members, currentUser, sbDelete])

  // ── Family requests ───────────────────────────────────────────────────────
  const sendFamilyRequest = useCallback(async (targetUid, relationship) => {
    let targetUser = null

    if (isDemoRef.current) {
      targetUser = DEMO_USERS.find(u => u.uid === targetUid)
    } else if (supabase) {
      // Use SECURITY DEFINER RPC — the users RLS policy only allows reading your
      // own row, so a direct .eq('uid', ...) query returns 0 rows for other users.
      const { data, error } = await supabase.rpc('find_user_by_uid', { target_uid: targetUid })
      if (error) console.error('[find_user_by_uid]', error.message)
      targetUser = data?.[0] || null
    }

    if (!targetUser) return { error: 'No account found with that ID. Please double-check.' }
    if (targetUser.id === currentUser?.id || targetUser.uid === currentUser?.uid) return { error: 'You cannot add yourself.' }

    const alreadyPending = familyRequests.find(r => r.fromUserId === currentUser.id && r.toUserId === targetUser.id && r.status === 'pending')
    if (alreadyPending) return { error: 'A request is already pending with this person.' }

    const req = {
      id: `req-${Date.now()}`,
      fromUserId:   currentUser.id,
      fromUserName: currentMember?.name || currentUser.name,
      fromUserUid:  currentUser.uid,
      fromFamilyId: currentUser.familyId,
      toUserId:     targetUser.id,
      toUserName:   targetUser.name,
      relationship, status: 'pending',
      timestamp: new Date().toISOString(),
    }

    setFamilyRequests(prev => [...prev, req])
    await sbInsert('familyRequests', req)
    pushNotif({ id: `fam-req-${req.id}`, type: 'familyRequest', requestId: req.id, forUserId: targetUser.id, timestamp: req.timestamp, message: `${req.fromUserName} (${req.fromUserUid}) wants to connect with you as ${relationship}.` })

    return { ok: true, targetName: targetUser.name }
  }, [currentUser, currentMember, familyRequests, sbInsert, pushNotif])

  const respondFamilyRequest = useCallback(async (requestId, accept) => {
    const req = familyRequests.find(r => r.id === requestId)
    if (!req) return

    if (accept) {
      if (isDemoRef.current) {
        // Demo mode: build both sides locally
        const colors     = ['#6366f1','#0891b2','#ec4899','#10b981','#f59e0b']
        const inverseRel = RELATIONSHIP_INVERSE[req.relationship] || req.relationship
        const dfu        = DEMO_USERS.find(u => u.id === req.fromUserId)
        const memberForRecipient = {
          id: `mem-${Date.now()}`, familyId: currentUser.familyId, linkedFamilyId: req.fromFamilyId,
          userId: req.fromUserId, name: req.fromUserName, relationship: inverseRel,
          age: dfu?.age || null, gender: dfu?.gender || 'other',
          avatar: req.fromUserName.slice(0,2).toUpperCase(), avatarColor: colors[Math.floor(Math.random()*colors.length)],
        }
        setMembers(prev => prev.find(m => m.id === memberForRecipient.id) ? prev : [...prev, memberForRecipient])
        setFamilyRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' } : r))
      } else if (supabase) {
        // Use SECURITY DEFINER RPC — inserts both member records (own family + sender's
        // family mirror) atomically, then marks the request accepted.
        // Direct inserts would be blocked by members RLS (own-family-only for INSERT).
        const { data: newMember, error } = await supabase.rpc('accept_family_connection', { p_request_id: requestId })
        if (error) {
          console.error('[accept_family_connection]', error.message)
          return
        }
        // Add the new member to local state (realtime will also deliver it, but be fast)
        if (newMember) {
          setMembers(prev => prev.find(m => m.id === newMember.id) ? prev : [...prev, newMember])
        }
        setFamilyRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' } : r))
      }

      pushNotif({ id: `fam-accept-${requestId}`, type: 'success', forUserId: currentUser.id, message: `✅ You're now connected with ${req.fromUserName} as ${req.relationship}.` })
    } else {
      setFamilyRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r))
      await sbUpdate('familyRequests', requestId, { status: 'rejected' })
      pushNotif({ id: `fam-reject-${requestId}`, type: 'info', forUserId: currentUser.id, message: `You declined ${req.fromUserName}'s connection request.` })
    }
    dismissNotification(`fam-req-${requestId}`)
  }, [familyRequests, currentUser, sbUpdate, pushNotif, dismissNotification])

  // ── Check-ins ─────────────────────────────────────────────────────────────
  // targetDate is an optional Date object; defaults to now (today's check-in).
  // When a past date is provided we store noon local time for that date so the
  // calendar-day comparison always lands on the right day regardless of timezone.
  const deleteCheckIn = useCallback((id) => {
    setCheckIns(prev => prev.filter(c => c.id !== id)); sbDelete('checkIns', id)
  }, [sbDelete])

  const addCheckIn = useCallback((data, targetDate) => {
    const target  = targetDate instanceof Date ? targetDate : new Date()
    const dayStr  = target.toDateString()
    // For past dates use noon local time; for today use exact now
    const dateISO = targetDate instanceof Date
      ? new Date(target.getFullYear(), target.getMonth(), target.getDate(), 12, 0, 0).toISOString()
      : new Date().toISOString()
    setCheckIns(prev => {
      // Remove any existing check-ins for the same member on the same calendar day
      const sameDay = prev.filter(c => c.memberId === currentMember.id && new Date(c.date).toDateString() === dayStr)
      sameDay.forEach(c => sbDelete('checkIns', c.id))
      const filtered = prev.filter(c => !(c.memberId === currentMember.id && new Date(c.date).toDateString() === dayStr))
      const ci = { id: `ci-${Date.now()}`, memberId: currentMember.id, familyId: currentUser.familyId, date: dateISO, ...data }
      sbInsert('checkIns', ci)
      return [ci, ...filtered]
    })
  }, [currentMember, currentUser, sbInsert, sbDelete])

  // ── Symptoms ──────────────────────────────────────────────────────────────
  const addSymptom = useCallback((data) => {
    const s = { id: `sym-${Date.now()}`, memberId: currentMember.id, familyId: currentUser.familyId, timestamp: new Date().toISOString(), resolved: false, ...data }
    // Auto-calculate and save today's mood based on new symptom set
    const memberActive = symptomsRef.current.filter(sx => sx.memberId === currentMember.id && !sx.resolved)
    const mood = calculateMoodFromSymptoms([...memberActive, s])
    setSymptoms(prev => [s, ...prev])
    sbInsert('symptoms', s)
    addCheckIn({ feeling: mood })
    return s
  }, [currentMember, currentUser, sbInsert, addCheckIn])

  const updateSymptom = useCallback((id, data) => {
    setSymptoms(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    sbUpdate('symptoms', id, data)
  }, [sbUpdate])

  const resolveSymptom = useCallback((id) => {
    const resolvedAt = new Date().toISOString()
    setSymptoms(prev => prev.map(s => s.id === id ? { ...s, resolved: true, resolvedAt } : s))
    sbUpdate('symptoms', id, { resolved: true, resolvedAt })
    // Recalculate mood without the now-resolved symptom
    const newActive = symptomsRef.current.filter(sx => sx.memberId === currentMember.id && !sx.resolved && sx.id !== id)
    addCheckIn({ feeling: calculateMoodFromSymptoms(newActive) })
  }, [sbUpdate, currentMember, addCheckIn])

  const deleteSymptom = useCallback((id) => {
    setSymptoms(prev => prev.filter(s => s.id !== id)); sbDelete('symptoms', id)
  }, [sbDelete])

  // ── Documents ─────────────────────────────────────────────────────────────
  const addDocument = useCallback(async (data) => {
    const id = `doc-${Date.now()}`
    // Spread data last so caller-provided uploadedAt (document date) takes precedence
    const d = { id, memberId: currentMember.id, familyId: currentUser.familyId, uploadedAt: new Date().toISOString(), ...data }

    // Optimistically add with blob URL so UI is instant
    setDocuments(prev => [d, ...prev])

    // Upload file to Supabase Storage if we have the raw file blob
    if (data.file && supabase && currentUser?.id) {
      try {
        const ext  = data.file.name.split('.').pop()
        const path = `${currentUser.id}/${id}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('health-docs')
          .upload(path, data.file, { contentType: data.file.type, upsert: false })

        if (!upErr) {
          // Get a signed URL valid for 10 years (~315 million seconds)
          const { data: signed } = await supabase.storage
            .from('health-docs')
            .createSignedUrl(path, 315360000)

          const fileUrl    = signed?.signedUrl || d.fileUrl
          const filePath   = path
          // Update local state with the persistent URL
          setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, fileUrl, filePath } : doc))
          // Persist to DB — include fileUrl so it reloads on next session
          const { file: _f, ...rest } = d
          sbInsert('documents', { ...rest, fileUrl, filePath })
          return { ...d, fileUrl, filePath }
        }
      } catch (err) {
        console.warn('[addDocument] storage upload failed', err)
      }
    }

    // Fallback: save without fileUrl if upload failed or no file
    const { file: _f, fileUrl: _u, ...sbData } = d
    sbInsert('documents', sbData)
    return d
  }, [currentMember, currentUser, sbInsert])

  const deleteDocument = useCallback(async (id) => {
    const doc = documents.find(d => d.id === id)
    setDocuments(prev => prev.filter(d => d.id !== id))
    sbDelete('documents', id)
    // Also remove the file from storage if we have the path
    if (doc?.filePath && supabase) {
      supabase.storage.from('health-docs').remove([doc.filePath]).catch(() => {})
    }
  }, [documents, sbDelete])

  // ── Doctor patients ───────────────────────────────────────────────────────
  const addDoctorPatient = useCallback((patientId) => {
    if (doctorPatients.find(r => r.doctorId === currentUser.id && r.patientId === patientId)) return { error: 'Patient already tracked.' }
    const member = members.find(m => m.id === patientId)
    if (!member) return { error: 'Patient ID not found.' }
    const rec = { id: `dp-${Date.now()}`, doctorId: currentUser.id, patientId, addedAt: new Date().toISOString() }
    setDoctorPatients(prev => [...prev, rec]); sbInsert('doctorPatients', rec)
    return { ok: true, member }
  }, [currentUser, doctorPatients, members, sbInsert])

  // ── Conditions ────────────────────────────────────────────────────────────
  const addCondition = useCallback((data) => {
    const c = { id: `cond-${Date.now()}`, memberId: currentMember.id, familyId: currentUser.familyId, ...data }
    setConditions(prev => [...prev, c]); sbInsert('conditions', c); return c
  }, [currentMember, currentUser, sbInsert])

  const removeCondition = useCallback((id) => {
    setConditions(prev => prev.filter(c => c.id !== id)); sbDelete('conditions', id)
  }, [sbDelete])

  // ── Medications ───────────────────────────────────────────────────────────
  const addMedication = useCallback((data) => {
    const m = { id: `med-${Date.now()}`, memberId: currentMember.id, familyId: currentUser.familyId, ...data }
    setMedications(prev => [...prev, m]); sbInsert('medications', m); return m
  }, [currentMember, currentUser, sbInsert])

  const removeMedication = useCallback((id) => {
    setMedications(prev => prev.filter(m => m.id !== id)); sbDelete('medications', id)
  }, [sbDelete])

  // ── Risk profiles ─────────────────────────────────────────────────────────
  const getRiskProfile = useCallback((memberId) =>
    riskProfiles.find(r => r.memberId === memberId) || { riskLevel: 'normal', mandatoryCheckIn: false, escalationMins: 60 },
  [riskProfiles])

  const setRiskProfile = useCallback((memberId, data) => {
    setRiskProfiles(prev => {
      const existing = prev.find(r => r.memberId === memberId)
      const updated  = { memberId, familyId: currentUser?.familyId, id: memberId, ...existing, ...data, updatedAt: new Date().toISOString() }
      sbUpsert('riskProfiles', updated)
      return existing ? prev.map(r => r.memberId === memberId ? updated : r) : [...prev, updated]
    })
    if (data.riskLevel === 'high' || data.riskLevel === 'critical') {
      const member = members.find(m => m.id === memberId)
      pushNotif({ id: `risk-${memberId}-${Date.now()}`, type: 'risk', message: `🔴 ${member?.name} has been marked ${data.riskLevel?.toUpperCase()} risk.` })
    }
  }, [members, currentUser, sbUpsert, pushNotif])

  // ── Health ID ─────────────────────────────────────────────────────────────
  const generateHealthID = useCallback((memberId) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return null
    return {
      name: member.name, age: member.age, gender: member.gender,
      bloodType: member.bloodType || 'Unknown',
      conditions:  conditions.filter(c => c.memberId === memberId).map(c => `${c.name} (${c.icd})`),
      medications: medications.filter(m => m.memberId === memberId).map(m => `${m.name} ${m.dosage} — ${m.frequency}`),
      allergies: member.allergies || 'NKDA',
      emergencyContacts: members.filter(m => m.familyId === member.familyId && m.id !== memberId).map(m => ({ name: m.name, relationship: m.relationship })),
      familyName: families.find(f => f.id === member.familyId)?.name,
      riskLevel: getRiskProfile(memberId).riskLevel,
      generatedAt: new Date().toISOString(),
    }
  }, [members, conditions, medications, families, getRiskProfile])

  // ── Emergency ─────────────────────────────────────────────────────────────
  const triggerEmergency = useCallback(async ({ note = '', location = null } = {}) => {
    if (!currentMember) return
    const summary = buildEmergencySummary({
      member: currentMember,
      conditions:  conditions.filter(c => c.memberId === currentMember.id),
      medications: medications.filter(m => m.memberId === currentMember.id),
      symptoms:    symptoms.filter(s => s.memberId === currentMember.id),
      checkIns:    checkIns.filter(c => c.memberId === currentMember.id),
      riskProfile: getRiskProfile(currentMember.id),
      userNote: note,
    })
    const event = {
      id: `emg-${Date.now()}`, memberId: currentMember.id, familyId: currentUser.familyId,
      memberName: currentMember.name,
      triggeredAt: new Date().toISOString(), type: note ? 'manual' : 'auto',
      status: 'active', summary, location, note, healthId: generateHealthID(currentMember.id),
    }
    setEmergencyEvents(prev => [event, ...prev]); setActiveEmergency(event)
    sbInsert('emergencyEvents', event)
    members.filter(m => m.familyId === currentUser.familyId && m.id !== currentMember.id)
      .forEach(m => pushNotif({ id: `emg-fam-${m.id}-${event.id}`, type: 'emergency', eventId: event.id, message: `🚨 EMERGENCY: ${currentMember.name} has triggered an emergency alert.` }))

    // Fire push notifications, SMS, and calls in parallel via Edge Functions
    if (!isDemoRef.current && supabase) {
      const emergencyContacts = (currentUser?.emergencyContacts || []).filter(c => c.phone?.trim())

      supabase.functions.invoke('send-emergency-push', {
        body: {
          familyId:   currentUser.familyId,
          memberName: currentMember.name,
          note:       note || null,
          location:   location || null,
          eventId:    event.id,
        },
      }).catch(e => console.error('[push send]', e.message))

      if (emergencyContacts.length > 0) {
        const activeConditions  = conditions.filter(c => c.memberId === currentMember.id).map(c => c.name)
        const activeMedications = medications.filter(m => m.memberId === currentMember.id).map(m => m.name + (m.dosage ? ` ${m.dosage}` : ''))
        const activeSymptoms    = symptoms.filter(s => s.memberId === currentMember.id && s.status === 'active').map(s => `${s.bodyLabel} (${s.type}, ${severityLabel(s.severity)})`)

        supabase.functions.invoke('send-emergency-sms', {
          body: {
            memberName:        currentMember.name,
            note:              note || null,
            location:          location || null,
            emergencyContacts,
            conditions:        activeConditions,
            medications:       activeMedications,
            symptoms:          activeSymptoms,
          },
        }).catch(e => console.error('[sms send]', e.message))

        supabase.functions.invoke('make-emergency-call', {
          body: {
            memberName:        currentMember.name,
            note:              note || null,
            emergencyContacts,
          },
        }).catch(e => console.error('[call send]', e.message))
      }
    }

    console.info('[EMERGENCY]', event)
    return event
  }, [currentMember, currentUser, symptoms, conditions, medications, checkIns, members, getRiskProfile, generateHealthID, sbInsert, pushNotif])

  const resolveEmergency = useCallback((id) => {
    const resolved = { status: 'resolved', resolvedAt: new Date().toISOString() }
    setEmergencyEvents(prev => prev.map(e => e.id === id ? { ...e, ...resolved } : e))
    setActiveEmergency(null)
    sbUpdate('emergencyEvents', id, resolved)
    pushNotif({ id: `emg-resolved-${id}`, type: 'success', message: `✅ Emergency for ${currentMember?.name} has been resolved.` })
  }, [currentMember, sbUpdate, pushNotif])

  // ── Derived ───────────────────────────────────────────────────────────────
  const myFamilyMembers = currentUser
    ? members
        .filter(m => m.familyId === currentUser.familyId)
        .sort((a, b) => {
          // Self always first
          if (a.relationship === 'Self') return -1
          if (b.relationship === 'Self') return 1
          // Connections in chronological order by ID
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
        })
    : []
  const currentSymptoms    = currentMember ? symptoms.filter(s => s.memberId === currentMember.id)    : []
  const currentCheckIns    = currentMember ? checkIns.filter(c => c.memberId === currentMember.id)    : []
  const currentDocuments   = currentMember ? documents.filter(d => d.memberId === currentMember.id)   : []
  const currentConditions  = currentMember ? conditions.filter(c => c.memberId === currentMember.id)  : []
  const currentMedications = currentMember ? medications.filter(m => m.memberId === currentMember.id) : []
  const currentRiskProfile = currentMember ? getRiskProfile(currentMember.id)                         : null
  const setSkinColor       = useCallback((c) => setSkinColorState(c), [])

  return (
    <AppContext.Provider value={{
      appLoading, isDemoMode,
      currentUser, login, signup, logout, signInWithOAuth, updateProfile,
      isPasswordRecovery, resetPassword, updatePassword,
      currentMember, myFamilyMembers, members, addMember, removeMember, switchMember,
      familyRequests, sendFamilyRequest, respondFamilyRequest,
      notifCentreOpen, setNotifCentreOpen,
      currentSymptoms, currentCheckIns, currentDocuments,
      symptoms, checkIns, documents, families,
      addSymptom, updateSymptom, resolveSymptom, deleteSymptom,
      addCheckIn, deleteCheckIn, addDocument, deleteDocument,
      doctorPatients, addDoctorPatient,
      notifications, dismissNotification, pushNotif,
      skinColor, setSkinColor,
      conditions, currentConditions, addCondition, removeCondition,
      medications, currentMedications, addMedication, removeMedication,
      riskProfiles, currentRiskProfile, setRiskProfile, getRiskProfile,
      emergencyEvents, activeEmergency, triggerEmergency, resolveEmergency, generateHealthID,
      isAdmin, sendBroadcast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
