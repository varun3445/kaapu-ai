// med-reminders — called by pg_cron every minute
// Finds medications whose scheduled time matches now (to the minute),
// then sends a push notification to the member's device(s).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY     = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY    = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT        = Deno.env.get('VAPID_SUBJECT') || ''
const FCM_PROJECT_ID       = Deno.env.get('FCM_PROJECT_ID') || ''
const FCM_CLIENT_EMAIL     = Deno.env.get('FCM_CLIENT_EMAIL') || ''
const FCM_PRIVATE_KEY      = Deno.env.get('FCM_PRIVATE_KEY') || ''
const APNS_KEY_ID          = Deno.env.get('APNS_KEY_ID') || ''
const APNS_TEAM_ID         = Deno.env.get('APNS_TEAM_ID') || ''
const APNS_BUNDLE_ID       = Deno.env.get('APNS_BUNDLE_ID') || ''
const APNS_PRIVATE_KEY     = Deno.env.get('APNS_PRIVATE_KEY') || ''

// Day-of-week map: JS getDay() → our 3-letter abbreviations
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── APNs ─────────────────────────────────────────────────────────────────────
async function signJWT(header: object, payload: object, pemKey: string, alg: EcdsaParams | RsaPssParams) {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const signingInput = `${enc(header)}.${enc(payload)}`
  const pemBody = pemKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBytes.buffer, alg, false, ['sign'])
  const sig = await crypto.subtle.sign(alg, cryptoKey, new TextEncoder().encode(signingInput))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${signingInput}.${sigB64}`
}

async function sendAPNs(token: string, title: string, body: string) {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID || !APNS_PRIVATE_KEY) throw new Error('APNs not configured')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await signJWT(
    { alg: 'ES256', kid: APNS_KEY_ID },
    { iss: APNS_TEAM_ID, iat: now },
    APNS_PRIVATE_KEY,
    { name: 'ECDSA', hash: 'SHA-256', namedCurve: 'P-256' } as EcdsaParams,
  )
  const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: 'POST',
    headers: { authorization: `bearer ${jwt}`, 'apns-topic': APNS_BUNDLE_ID, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json' },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: 'default', badge: 1 } }),
  })
  if (!res.ok) throw new Error(`APNs ${res.status}: ${await res.text()}`)
}

// ── FCM ───────────────────────────────────────────────────────────────────────
async function getFCMToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const enc = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: FCM_CLIENT_EMAIL, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const signingInput = `${enc(header)}.${enc(payload)}`
  const pem = FCM_PRIVATE_KEY.replace(/\\n/g, '\n')
  const pemBody = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBytes.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const jwt = `${signingInput}.${sigB64}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const { access_token } = await res.json()
  return access_token
}

async function sendFCM(token: string, title: string, body: string) {
  if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) throw new Error('FCM not configured')
  const accessToken = await getFCMToken()
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: { title, body }, android: { priority: 'high', notification: { channel_id: 'medications', sound: 'default' } } } }),
  })
  if (!res.ok) throw new Error(`FCM ${res.status}: ${await res.text()}`)
}

// ── Web Push ─────────────────────────────────────────────────────────────────
async function sendWebPush(subscriptionJson: string, title: string, body: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) throw new Error('VAPID not configured')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const subscription = JSON.parse(subscriptionJson)
  await webpush.sendNotification(subscription, JSON.stringify({ title, body, data: { type: 'medication' } }), { TTL: 3600 })
}

// ── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Current time in HH:MM (24h) and day abbreviation
  const now     = new Date()
  const hhmm    = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
  const todayAbbr = DAY_NAMES[now.getUTCDay()]

  console.log(`[med-reminders] Checking at ${hhmm} UTC (${todayAbbr})`)

  try {
    // Fetch all medications that have times set (timezone-aware filtering happens below)
    const { data: meds, error } = await sb
      .from('medications')
      .select('id, name, dosage, memberId, days, times')
      .not('times', 'is', null)

    if (error) throw error
    const dueMeds = (meds || []).filter((m: any) => m.times?.length > 0)

    if (dueMeds.length === 0) {
      return new Response(JSON.stringify({ checked: hhmm, due: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Get member → userId mapping
    const memberIds = [...new Set(dueMeds.map((m: any) => m.memberId))]
    const { data: members } = await sb
      .from('members')
      .select('id, userId, name')
      .in('id', memberIds)

    const memberMap = new Map((members || []).map((m: any) => [m.id, m]))

    // Get users (for timezone) and device tokens
    const userIds = [...new Set((members || []).map((m: any) => m.userId).filter(Boolean))]
    const [{ data: users }, { data: tokens }] = await Promise.all([
      sb.from('users').select('id, timezone').in('id', userIds),
      sb.from('deviceTokens').select('userId, token, platform').in('userId', userIds),
    ])

    const userMap = new Map((users || []).map((u: any) => [u.id, u]))
    const tokensByUser = new Map<string, any[]>()
    for (const t of (tokens || [])) {
      if (!tokensByUser.has(t.userId)) tokensByUser.set(t.userId, [])
      tokensByUser.get(t.userId)!.push(t)
    }

    // Helper: get HH:MM in a given IANA timezone
    function localHHMM(tz: string): string {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
        }).formatToParts(now)
        const h = parts.find(p => p.type === 'hour')?.value   ?? '00'
        const m = parts.find(p => p.type === 'minute')?.value ?? '00'
        return `${h}:${m}`
      } catch {
        return hhmm // fallback to UTC
      }
    }

    // Helper: get day abbreviation in a given IANA timezone
    function localDay(tz: string): string {
      try {
        const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(now)
        return day.slice(0, 3) // "Mon", "Tue", etc.
      } catch {
        return todayAbbr
      }
    }

    let sent = 0
    for (const med of dueMeds) {
      const member  = memberMap.get(med.memberId)
      if (!member?.userId) continue

      const user     = userMap.get(member.userId)
      const tz       = user?.timezone || 'UTC'
      const localTime = localHHMM(tz)
      const localDayAbbr = localDay(tz)

      // Re-check time match in the user's local timezone
      if (!med.times?.includes(localTime)) continue
      if (med.days?.length > 0 && !med.days.includes(localDayAbbr)) continue

      const userTokens = tokensByUser.get(member.userId) || []
      if (userTokens.length === 0) continue

      const title = `💊 Medication Reminder`
      const body  = med.dosage
        ? `Time to take ${med.name} — ${med.dosage}`
        : `Time to take ${med.name}`

      const results = await Promise.allSettled(
        userTokens.map(async (t) => {
          if (t.platform === 'ios')     return sendAPNs(t.token, title, body)
          if (t.platform === 'android') return sendFCM(t.token, title, body)
          if (t.platform === 'web')     return sendWebPush(t.token, title, body)
        })
      )

      const ok = results.filter(r => r.status === 'fulfilled').length
      sent += ok
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[med-reminders] ${userTokens[i]?.platform} failed:`, (r as any).reason?.message)
      })

      console.log(`[med-reminders] ${med.name} → ${member.name} — sent ${ok}/${userTokens.length}`)
    }

    return new Response(
      JSON.stringify({ checked: hhmm, day: todayAbbr, due: dueMeds.length, sent }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[med-reminders] error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
