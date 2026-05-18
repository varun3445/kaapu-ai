// send-welcome-email — Supabase Edge Function
// Sends a welcome email to a new Kaapu user via Resend.
//
// Required secrets:
//   RESEND_API_KEY — re_...  (from resend.com)
//
// Optional secrets:
//   FROM_EMAIL     — defaults to "Kaapu <hello@kaapu.app>"
//                    Use "Kaapu <onboarding@resend.dev>" while testing
//                    (Resend's shared domain, works without DNS setup)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') || 'Kaapu <onboarding@resend.dev>'

function buildHtml(name: string): string {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to Kaapu</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);padding:36px 40px 32px;text-align:center;">
            <div style="font-size:32px;margin-bottom:10px;">🩺</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Welcome to Kaapu</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Your family's health, always within reach</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1f2937;font-weight:600;">Hi ${firstName} 👋</p>
            <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6;">
              Thanks for joining Kaapu — we're glad you're here. You've just taken the first step towards keeping your family's health organised and in one place.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
              Here's what you can do right now:
            </p>

            <!-- Feature list -->
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ['📋', 'Log symptoms', 'Track how you feel day to day and spot patterns early.'],
                ['✅', 'Daily check-ins', 'Quick mood & wellbeing check-ins to stay on top of your health.'],
                ['💊', 'Conditions & meds', 'Keep your conditions and medications in one secure place.'],
                ['🚨', 'Emergency alerts', 'One tap sends your location and health info to your emergency contacts.'],
              ].map(([icon, title, desc]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:22px;width:40px;vertical-align:top;padding-top:2px;">${icon}</td>
                      <td style="padding-left:12px;">
                        <p style="margin:0;font-size:13px;font-weight:700;color:#1f2937;">${title}</p>
                        <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${desc}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join('')}
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td align="center">
                  <a href="https://kaapu-ai.vercel.app"
                    style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.2px;">
                    Open Kaapu →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
              You're receiving this because you just signed up for Kaapu.<br/>
              If this wasn't you, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              © ${new Date().getFullYear()} Kaapu · Built with ❤️ for families
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `Welcome to Kaapu, ${name.split(' ')[0]} 👋`,
        html:    buildHtml(name),
      }),
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
