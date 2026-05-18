// send-welcome-email — Supabase Edge Function
// Sends a welcome email to a new Kaapu user via Resend.
//
// Required secrets:
//   RESEND_API_KEY — re_...  (from resend.com → API Keys)
//
// Optional secrets (set via: npx supabase secrets set KEY=value):
//   FROM_EMAIL  — sender address, e.g. "Kaapu <hello@yourdomain.com>"
//                 Defaults to Resend's shared test domain (no DNS setup needed)
//   REPLY_TO    — where user replies land, e.g. "varun@yourdomain.com"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'Kaapu <onboarding@resend.dev>'
const REPLY_TO       = Deno.env.get('REPLY_TO')   || ''

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
    const { email, name } = await req.json()
    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Missing email or name' }), { status: 400 })
    }

    const payload: Record<string, unknown> = {
      from:        FROM_EMAIL,
      to:          [email],
      template_id: 'kaapu-ai-beta-welcome',
      variables:   { firstName: name.split(' ')[0] },
    }
    if (REPLY_TO) payload.reply_to = REPLY_TO

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Resend ${res.status}: ${err.message || JSON.stringify(err)}`)
    }

    const data = await res.json()
    console.info('[send-welcome-email] sent to', email, '| id:', data.id)
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[send-welcome-email]', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
