// make-emergency-call — Supabase Edge Function
// Calls all emergency contacts via Twilio when an emergency is triggered.
// Twilio fetches the TwiML from the emergency-twiml edge function.
//
// Required secrets:
//   TWILIO_ACCOUNT_SID  — AC...
//   TWILIO_AUTH_TOKEN   — ...
//   TWILIO_FROM_NUMBER  — +447588232189

const ACCOUNT_SID  = Deno.env.get('TWILIO_ACCOUNT_SID')!
const AUTH_TOKEN   = Deno.env.get('TWILIO_AUTH_TOKEN')!
const FROM_NUMBER  = Deno.env.get('TWILIO_FROM_NUMBER')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

const CALLS_URL = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Calls.json`

// Normalise to E.164. Assumes UK (+44) if no country code present.
function normalizePhone(raw: string): string {
  let n = raw.replace(/[\s\-().]/g, '')
  if (n.startsWith('00')) return '+' + n.slice(2)
  if (n.startsWith('+')) {
    if (n.startsWith('+440')) return '+44' + n.slice(4)
    return n
  }
  if (n.startsWith('0'))  return '+44' + n.slice(1)
  return '+44' + n
}

// URL of our TwiML endpoint — same Supabase project, different function
function twimlUrl(memberName: string, note: string | null): string {
  const base = `${SUPABASE_URL}/functions/v1/emergency-twiml`
  const params = new URLSearchParams({ name: memberName })
  if (note) params.set('note', note)
  return `${base}?${params.toString()}`
}

async function makeCall(to: string, twiml: string) {
  to = normalizePhone(to)
  const params = new URLSearchParams({ To: to, From: FROM_NUMBER, Url: twiml })
  const res = await fetch(CALLS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Twilio Call ${res.status}: ${err.message}`)
  }
  return res.json()
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
    const { memberName, note, emergencyContacts } = await req.json()

    if (!memberName || !emergencyContacts?.length) {
      return new Response(JSON.stringify({ error: 'Missing memberName or emergencyContacts' }), { status: 400 })
    }

    const contacts = (emergencyContacts as { name: string; phone: string; relationship: string }[])
      .filter(c => c.phone?.trim())
      .slice(0, 3)

    if (!contacts.length) {
      return new Response(JSON.stringify({ called: 0, message: 'No phone numbers found in emergency contacts' }), { status: 200 })
    }

    const twiml = twimlUrl(memberName, note || null)

    const results = await Promise.allSettled(
      contacts.map(c => makeCall(c.phone.trim(), twiml))
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Call to ${contacts[i].name}]`, r.reason?.message)
      }
    })

    return new Response(
      JSON.stringify({ called: succeeded, total: contacts.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[make-emergency-call]', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
