// send-welcome-email — Supabase Edge Function
// Sends a welcome email to new Kaapu users via Resend.
//
// Required secrets:  RESEND_API_KEY
// Optional secrets:  FROM_EMAIL, REPLY_TO

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'Kaapu <onboarding@resend.dev>'
const REPLY_TO       = Deno.env.get('REPLY_TO')   || ''

function buildHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Welcome to Kaapu AI</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0">

        <tr>
          <td style="padding-bottom:36px;">
            <img src="https://kaapu-ai.vercel.app/logo.png" alt="Kaapu AI" height="36" style="display:block;" />
          </td>
        </tr>

        <tr>
          <td style="font-size:15px;color:#111111;line-height:1.8;">

            <p style="margin:0 0 20px;">Hi there,</p>

            <p style="margin:0 0 20px;">Thank you for joining Kaapu AI. The fact that you are here and willing to trust us with something as personal as your health means everything to me.</p>

            <p style="margin:0 0 20px;">I want to be upfront with you — Kaapu is still in beta. You may experience the occasional lag, bug, or rough edge. That is exactly why your presence here matters. You are not just a user; you are helping shape what this becomes.</p>

            <p style="margin:0 0 8px;font-weight:bold;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">So what is Kaapu?</p>

            <p style="margin:0 0 20px;">Kaapu AI is a Voice AI platform built for people living with chronic conditions. It builds a continuous picture of your health through daily logging — your mood, your pain, your symptoms — and converts that into real-time emergency intelligence when you need it most.</p>

            <p style="margin:0 0 20px;">If something goes wrong and you cannot speak, one button calls and texts your emergency contacts with your full health history and live location instantly. No talking required. No setup at the moment. Just one tap.</p>

            <p style="margin:0 0 20px;">In Tamil, my mother tongue, <em>Kaapu</em> means to protect and guard. That is exactly what I am trying to build.</p>

            <p style="margin:0 0 20px;">If you ever have questions, run into issues, or just want to share feedback, please do not hesitate to reach out. I read every message personally.</p>

            <p style="margin:0 0 20px;">You can reach me at <a href="mailto:varun3445@gmail.com" style="color:#111111;">varun3445@gmail.com</a> or find me as @varunsrivathsan on The Dots app.</p>

            <p style="margin:0 0 32px;">Thank you for being here. It means more than you know.</p>

            <p style="margin:0 0 4px;">Varun Srivathsan</p>
            <p style="margin:0 0 40px;color:#666666;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Kaapu AI &nbsp;·&nbsp; <a href="https://kaapu-ai.vercel.app" style="color:#666666;">kaapu-ai.vercel.app</a></p>

          </td>
        </tr>

        <tr>
          <td style="border-top:1px solid #e5e5e5;padding-top:24px;">
            <p style="margin:0;font-size:11px;color:#999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;">
              You're receiving this because you signed up for Kaapu AI early access. If this wasn't you, you can safely ignore this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
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
    const { email, name } = await req.json()
    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Missing email or name' }), { status: 400 })
    }

    const payload: Record<string, unknown> = {
      from:    FROM_EMAIL,
      to:      [email],
      subject: 'Welcome to Kaapu AI',
      html:    buildHtml(name),
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
