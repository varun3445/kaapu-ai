// send-emergency-push — Supabase Edge Function
// Routes emergency push notifications to the right service per platform:
//   iOS     → APNs (JWT auth with .p8 key)
//   Android → FCM Legacy HTTP API
//   Web     → Web Push Protocol (VAPID)
//
// Required secrets (set via `supabase secrets set`):
//   APNS_KEY_ID        — 10-char key ID from Apple Developer portal
//   APNS_TEAM_ID       — 10-char team ID
//   APNS_BUNDLE_ID     — e.g. com.kaapu.app
//   APNS_PRIVATE_KEY   — contents of the .p8 file
//   FCM_SERVER_KEY     — Firebase project → Project Settings → Cloud Messaging → Server key
//   VAPID_PUBLIC_KEY   — base64url VAPID public key
//   VAPID_PRIVATE_KEY  — base64url VAPID private key
//   VAPID_SUBJECT      — mailto: or https: URL, e.g. mailto:you@example.com

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APNS_KEY_ID          = Deno.env.get('APNS_KEY_ID') || ''
const APNS_TEAM_ID         = Deno.env.get('APNS_TEAM_ID') || ''
const APNS_BUNDLE_ID       = Deno.env.get('APNS_BUNDLE_ID') || ''
const APNS_PRIVATE_KEY     = Deno.env.get('APNS_PRIVATE_KEY') || ''
const FCM_PROJECT_ID       = Deno.env.get('FCM_PROJECT_ID') || ''       // e.g. kaapu-ai
const FCM_CLIENT_EMAIL     = Deno.env.get('FCM_CLIENT_EMAIL') || ''     // service account email
const FCM_PRIVATE_KEY      = Deno.env.get('FCM_PRIVATE_KEY') || ''      // service account private key
const VAPID_PUBLIC_KEY     = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY    = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT        = Deno.env.get('VAPID_SUBJECT') || ''

// ── Shared JWT helper ─────────────────────────────────────────────────────────
async function signJWT(header: object, payload: object, pemKey: string, alg: EcdsaParams | RsaPssParams) {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const signingInput = `${enc(header)}.${enc(payload)}`

  const pemBody = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBytes.buffer, alg, false, ['sign'])
  const sig       = await crypto.subtle.sign(alg, cryptoKey, new TextEncoder().encode(signingInput))
  const sigB64    = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${signingInput}.${sigB64}`
}

// ── APNs (iOS) ────────────────────────────────────────────────────────────────
async function buildAPNsJWT() {
  const now = Math.floor(Date.now() / 1000)
  return signJWT(
    { alg: 'ES256', kid: APNS_KEY_ID },
    { iss: APNS_TEAM_ID, iat: now },
    APNS_PRIVATE_KEY,
    { name: 'ECDSA', hash: 'SHA-256', namedCurve: 'P-256' } as EcdsaParams,
  )
}

async function sendAPNs(token: string, title: string, body: string, data: Record<string, unknown> = {}) {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID || !APNS_PRIVATE_KEY) {
    throw new Error('APNs not configured')
  }
  const jwt = await buildAPNsJWT()
  const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: 'default', badge: 1 }, ...data }),
  })
  if (!res.ok) throw new Error(`APNs ${res.status}: ${await res.text()}`)
}

// ── FCM v1 (Android) ──────────────────────────────────────────────────────────
let _fcmAccessToken = ''
let _fcmTokenExpiry = 0

async function getFCMAccessToken(): Promise<string> {
  if (_fcmAccessToken && Date.now() < _fcmTokenExpiry) return _fcmAccessToken

  // Build a service-account JWT (RS256) to exchange for an OAuth2 access token
  const now = Math.floor(Date.now() / 1000)
  const header  = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss:   FCM_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const signingInput = `${enc(header)}.${enc(payload)}`

  // Import RSA private key from service account JSON (PEM format)
  const pem      = FCM_PRIVATE_KEY.replace(/\\n/g, '\n')
  const pemBody  = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  )

  const sig    = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const jwt    = `${signingInput}.${sigB64}`

  // Exchange JWT for OAuth2 access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) throw new Error(`FCM OAuth ${res.status}: ${await res.text()}`)

  const { access_token, expires_in } = await res.json()
  _fcmAccessToken = access_token
  _fcmTokenExpiry = Date.now() + (expires_in - 60) * 1000
  return _fcmAccessToken
}

async function sendFCM(token: string, title: string, body: string, data: Record<string, unknown> = {}) {
  if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) throw new Error('FCM not configured')

  const accessToken = await getFCMAccessToken()
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: { channel_id: 'emergency', sound: 'default' },
          },
          data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])),
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`FCM v1 ${res.status}: ${await res.text()}`)
}

// ── Web Push (VAPID) via web-push npm package ────────────────────────────────
// Using the battle-tested web-push library which handles VAPID JWT signing
// and payload encryption (ECDH + HKDF + AES-GCM) correctly.
import webpush from 'npm:web-push@3.6.7'

async function sendWebPush(subscriptionJson: string, title: string, body: string, data: Record<string, unknown> = {}) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error('Web Push (VAPID) not configured')
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  const subscription = JSON.parse(subscriptionJson)
  const payload      = JSON.stringify({ title, body, data })

  try {
    await webpush.sendNotification(subscription, payload, { TTL: 86400 })
  } catch (e: any) {
    if (e.statusCode === 410 || e.statusCode === 404) throw new Error('SUBSCRIPTION_EXPIRED')
    throw new Error(`WebPush ${e.statusCode}: ${e.body}`)
  }
}

// ── Edge Function handler ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { familyId, memberName, note, location, eventId } = await req.json()
    if (!familyId || !memberName || !eventId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: rows, error } = await sb.rpc('get_push_tokens_for_family', { target_family_id: familyId })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No device tokens found' }), { status: 200 })
    }

    const title   = `🚨 Emergency: ${memberName}`
    const body    = note
      ? `${memberName}: "${note}"`
      : `${memberName} needs help — tap to see details`
    const extra   = { eventId, location: location || null, type: 'emergency' }

    const results = await Promise.allSettled(
      rows.map(async (r: { token: string; platform: string }) => {
        if (r.platform === 'ios')     return sendAPNs(r.token, title, body, extra)
        if (r.platform === 'android') return sendFCM(r.token, title, body, extra)
        if (r.platform === 'web')     return sendWebPush(r.token, title, body, extra)
        throw new Error(`Unknown platform: ${r.platform}`)
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[push ${rows[i]?.platform}]`, r.reason?.message)
    })

    return new Response(
      JSON.stringify({ sent: succeeded, total: rows.length }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[send-emergency-push]', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
