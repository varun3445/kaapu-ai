import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase, supabaseReady } from '../supabase'
import { startAlarm, stopActiveAlarm } from '../utils/audio'

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

// localStorage — only for UI prefs (skinColor, active member selection)
const LS = { skinColor: 'ht_skin_color', currentMember: 'ht_current_member' }
const lsLoad = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb } catch { return fb } }
const lsSave = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (_) {} }

// ── Emergency summary ─────────────────────────────────────────────────────────
function buildEmergencySummary({ member, conditions, medications, symptoms, checkIns, riskProfile, userNote }) {
  const lines = []
  const agePart    = member.age  ? `, ${member.age}yo` : ''
  const genderPart = member.gender && member.gender !== 'other' ? ` ${member.gender}` : ''
  lines.push(`Patient: ${member.name}${agePart}${genderPart}`)
  if (conditions.length)  lines.push(`Chronic conditions: ${conditions.map(c => c.name).join(', ')}`)
  if (medications.length) lines.push(`Current medications: ${medications.map(m => `${m.name} ${m.dosage}`).join(', ')}`)
  const hrs72 = symptoms.filter(s => Date.now() - new Date(s.timestamp).getTime() < 72 * 3600000)
  const high  = hrs72.filter(s => s.severity >= 7)
  if (high.length)  lines.push(`⚠️ HIGH (72h): ${high.map(s => `${s.bodyLabel} ${s.type} ${s.severity}/10`).join(' | ')}`)
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

// ── Context ───────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  // ── Loading & mode ────────────────────────────────────────────────────────
  const [appLoading,  setAppLoading]  = useState(false)
  const [isDemoMode,  setIsDemoMode]  = useState(false)
  const isDemoRef = useRef(false)

  // ── Auth state ────────────────────────────────────────────────────────────
  const [currentUser,   setCurrentUser]   = useState(null)
  const [currentMember, setCurrentMember] = useState(null)

  // ── Data state ────────────────────────────────────────────────────────────
  const [members,         setMembers]         = useState([])
  const [families,        setFamilies]        = useState([])
  const [symptoms,        setSymptoms]        = useState([])
  const [checkIns,        setCheckIns]        = useState([])
  const [documents,       setDocuments]       = useState([])
  const [doctorPatients,  setDoctorPatients]  = useState([])
  const [conditions,      setConditions]      = useState([])
  const [medications,     setMedications]     = useState([])
  const [riskProfiles,    setRiskProfiles]    = useState([])
  const [emergencyEvents, setEmergencyEvents] = useState([])
  const [familyRequests,  setFamilyRequests]  = useState([])
  const [notifications,   setNotifications]   = useState([])
  const [notifCentreOpen, setNotifCentreOpen] = useState(false)
  const [activeEmergency, setActiveEmergency] = useState(null)
  const [skinColor,       setSkinColorState]  = useState(() => lsLoad(LS.skinColor, '#C49272'))

  // Push notification registration ref (prevent duplicate registrations)
  const pushRegisteredRef = useRef(false)

  // Real-time channel refs
  const channelMembersRef        = useRef(null)
  const channelRequestsRef       = useRef(null)
  const channelEmergencyRef      = useRef(null)
  const channelConnectedEmgRefs  = useRef([]) // one channel per linked family
  const channelSymptomsRef       = useRef(null)
  const channelCheckInsRef       = useRef(null)
  const channelDocumentsRef      = useRef(null)

  // ── Persist UI prefs ──────────────────────────────────────────────────────
  useEffect(() => { lsSave(LS.skinColor, skinColor) }, [skinColor])
  useEffect(() => { if (currentMember) lsSave(LS.currentMember, currentMember) }, [currentMember])

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
        }
      } else if (event === 'SIGNED_OUT') {
        if (!isDemoRef.current) _clearState()
      }
    })

    return () => {
      subscription.unsubscribe()
      _removeChannels()
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
      const newUser  = { id: uid, email: authUser.email, name, role: 'user', familyId, uid: uid9, age: null, gender: 'other' }
      await _sbq(Promise.all([
        supabase.from('users').insert(newUser),
        supabase.from('families').insert({ id: familyId, name: `${name}'s Family` }),
        supabase.from('members').insert({
          id: `mem-${uid}`, familyId, userId: uid, name,
          age: null, gender: 'other', relationship: 'Self',
          avatar: name.slice(0, 2).toUpperCase(), avatarColor: '#6366f1',
        }),
      ]))
      userRow = newUser
    }

    const userData = { ...userRow }
    // Set user immediately so the app can render — data loads below
    setCurrentUser(userData)
    isDemoRef.current = false
    setIsDemoMode(false)

    // Register for push notifications (iOS, Android, Web — best-effort, never blocks load)
    _registerPush(uid).catch(console.error)

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

    // Restore current member selection
    const savedMem = lsLoad(LS.currentMember, null)
    const restored = allMems.find(m => m.id === savedMem?.id) || allMems[0] || null
    setCurrentMember(restored)
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
    if (channelDocumentsRef.current) { supabase?.removeChannel(channelDocumentsRef.current); channelDocumentsRef.current = null }
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
          options: { emailRedirectTo: siteUrl },
        }),
        deadline,
      ])
      if (authErr) {
        if (authErr.message.toLowerCase().includes('already')) return { error: 'Email already in use.' }
        return { error: authErr.message }
      }
      if (!authData?.user) return { error: 'Sign up failed. Please try again.' }

      const uid      = authData.user.id
      const familyId = `fam-${uid}`
      const uid9     = generateUID()

      const userProfile = {
        id: uid, email: data.email, name: data.name,
        role: data.role || 'user', familyId, uid: uid9,
        age: parseInt(data.age) || null, gender: data.gender || 'other',
        ...(data.consentGivenAt ? { consentGivenAt: data.consentGivenAt } : {}),
      }

      const writes = [
        supabase.from('users').insert(userProfile),
        supabase.from('families').insert({ id: familyId, name: data.familyName || `${data.name}'s Family` }),
      ]
      if (data.role !== 'doctor') {
        writes.push(supabase.from('members').insert({
          id: `mem-${uid}`, familyId, userId: uid, name: data.name,
          age: parseInt(data.age) || null, gender: data.gender || 'other',
          relationship: 'Self', avatar: data.name.slice(0, 2).toUpperCase(), avatarColor: '#6366f1',
        }))
      }

      await Promise.race([Promise.all(writes), deadline])
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
      // 4. Re-read the user row so currentUser reflects what's actually in DB
      const { data: fresh } = await supabase.from('users').select('*').eq('id', currentUser.id).single()
      if (fresh) setCurrentUser(fresh)
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
      if (s.severity >= 7)
        pushNotif({ id: `alert-${s.id}`, type: 'danger', forUserId: userId, message: `High severity (${s.severity}/10) ${s.categoryLabel} at ${s.bodyLabel}. Consider reaching out to a doctor.` })
      else if (s.severity >= 5)
        pushNotif({ id: `alert-warn-${s.id}`, type: 'warning', forUserId: userId, message: `Moderate ${s.categoryLabel} at ${s.bodyLabel} — monitor closely.` })
    })
  }, [pushNotif])

  useEffect(() => {
    if (currentMember && currentUser)
      checkForAlerts(symptoms.filter(s => s.memberId === currentMember.id), currentUser.id)
  }, [symptoms, currentMember, checkForAlerts])

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

  const switchMember = useCallback((m) => { setCurrentMember(m); lsSave(LS.currentMember, m) }, [])

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

  // ── Symptoms ──────────────────────────────────────────────────────────────
  const addSymptom = useCallback((data) => {
    const s = { id: `sym-${Date.now()}`, memberId: currentMember.id, familyId: currentUser.familyId, timestamp: new Date().toISOString(), resolved: false, ...data }
    setSymptoms(prev => [s, ...prev]); sbInsert('symptoms', s); return s
  }, [currentMember, currentUser, sbInsert])

  const resolveSymptom = useCallback((id) => {
    const resolvedAt = new Date().toISOString()
    setSymptoms(prev => prev.map(s => s.id === id ? { ...s, resolved: true, resolvedAt } : s))
    sbUpdate('symptoms', id, { resolved: true, resolvedAt })
  }, [sbUpdate])

  const deleteSymptom = useCallback((id) => {
    setSymptoms(prev => prev.filter(s => s.id !== id)); sbDelete('symptoms', id)
  }, [sbDelete])

  // ── Check-ins ─────────────────────────────────────────────────────────────
  // targetDate is an optional Date object; defaults to now (today's check-in).
  // When a past date is provided we store noon local time for that date so the
  // calendar-day comparison always lands on the right day regardless of timezone.
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

  // ── Documents ─────────────────────────────────────────────────────────────
  const addDocument = useCallback((data) => {
    const d = { id: `doc-${Date.now()}`, memberId: currentMember.id, familyId: currentUser.familyId, uploadedAt: new Date().toISOString(), ...data }
    setDocuments(prev => [d, ...prev])
    const { fileUrl, ...sbData } = d // blob URLs are device-specific, don't store
    sbInsert('documents', sbData)
    return d
  }, [currentMember, currentUser, sbInsert])

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
        const activeSymptoms    = symptoms.filter(s => s.memberId === currentMember.id && s.status === 'active').map(s => `${s.bodyLabel} (${s.type}, ${s.severity}/10)`)

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
  const myFamilyMembers    = currentUser ? members.filter(m => m.familyId === currentUser.familyId) : []
  const currentSymptoms    = currentMember ? symptoms.filter(s => s.memberId === currentMember.id)    : []
  const currentCheckIns    = currentMember ? checkIns.filter(c => c.memberId === currentMember.id)    : []
  const currentDocuments   = currentMember ? documents.filter(d => d.memberId === currentMember.id)   : []
  const currentConditions  = currentMember ? conditions.filter(c => c.memberId === currentMember.id)  : []
  const currentMedications = currentMember ? medications.filter(m => m.memberId === currentMember.id) : []
  const currentRiskProfile = currentMember ? getRiskProfile(currentMember.id)                         : null
  const setSkinColor       = useCallback((c) => setSkinColorState(c), [])

  return (
    <AppContext.Provider value={{
      appLoading,
      currentUser, login, signup, logout, signInWithOAuth, updateProfile,
      currentMember, myFamilyMembers, members, addMember, removeMember, switchMember,
      familyRequests, sendFamilyRequest, respondFamilyRequest,
      notifCentreOpen, setNotifCentreOpen,
      currentSymptoms, currentCheckIns, currentDocuments,
      symptoms, checkIns, documents, families,
      addSymptom, resolveSymptom, deleteSymptom,
      addCheckIn, addDocument,
      doctorPatients, addDoctorPatient,
      notifications, dismissNotification, pushNotif,
      skinColor, setSkinColor,
      conditions, currentConditions, addCondition, removeCondition,
      medications, currentMedications, addMedication, removeMedication,
      riskProfiles, currentRiskProfile, setRiskProfile, getRiskProfile,
      emergencyEvents, activeEmergency, triggerEmergency, resolveEmergency, generateHealthID,
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
