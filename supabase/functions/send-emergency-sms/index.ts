// send-emergency-sms — Supabase Edge Function
// Sends emergency SMS alerts to all emergency contacts via Twilio.
//
// Required secrets:
//   TWILIO_ACCOUNT_SID  — AC...
//   TWILIO_AUTH_TOKEN   — ...
//   TWILIO_FROM_NUMBER  — +447588232189

const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!
const FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER')!

const TWILIO_URL = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`

// Normalise to E.164. Assumes UK (+44) if no country code present.
function normalizePhone(raw: string): string {
  let n = raw.replace(/[\s\-().]/g, '')
  if (n.startsWith('00')) return '+' + n.slice(2)   // 0044... → +44...
  if (n.startsWith('+')) {
    // Fix +4407... → +447... (user typed +44 then UK local 07...)
    if (n.startsWith('+440')) return '+44' + n.slice(4)
    return n
  }
  if (n.startsWith('0'))  return '+44' + n.slice(1) // 07... → +447...
  return '+44' + n                                   // bare digits
}

async function sendSMS(to: string, body: string) {
  to = normalizePhone(to)
  const params = new URLSearchParams({ To: to, From: FROM_NUMBER, Body: body })
  const res = await fetch(TWILIO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Twilio SMS ${res.status}: ${err.message}`)
  }
  return res.json()
}

function buildMessage(
  memberName: string,
  note: string | null,
  location: { lat: number; lng: number } | null,
  conditions: string[],
  medications: string[],
  symptoms: string[],
) {
  const lines: string[] = []

  lines.push(`🚨 EMERGENCY — ${memberName} needs help now!`)

  if (note) lines.push(`\n"${note}"`)

  if (location) {
    lines.push(`\n📍 Location: https://maps.google.com/?q=${location.lat},${location.lng}`)
  }

  if (symptoms.length > 0) {
    lines.push(`\n🩺 Symptoms: ${symptoms.join(', ')}`)
  }

  if (conditions.length > 0) {
    lines.push(`⚕️ Conditions: ${conditions.join(', ')}`)
  }

  if (medications.length > 0) {
    lines.push(`💊 Medications: ${medications.join(', ')}`)
  }

  lines.push(`\nOpen Kaapu for the full health summary.`)

  return lines.join('\n')
}

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
    const { memberName, note, location, emergencyContacts, conditions = [], medications = [], symptoms = [] } = await req.json()

    if (!memberName || !emergencyContacts?.length) {
      return new Response(JSON.stringify({ error: 'Missing memberName or emergencyContacts' }), { status: 400 })
    }

    const contacts = (emergencyContacts as { name: string; phone: string; relationship: string }[])
      .filter(c => c.phone?.trim())
      .slice(0, 3)

    if (!contacts.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No phone numbers found in emergency contacts' }), { status: 200 })
    }

    const message = buildMessage(memberName, note || null, location || null, conditions, medications, symptoms)

    const results = await Promise.allSettled(
      contacts.map(c => sendSMS(c.phone.trim(), message))
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[SMS to ${contacts[i].name}]`, r.reason?.message)
      }
    })

    return new Response(
      JSON.stringify({ sent: succeeded, total: contacts.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[send-emergency-sms]', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
