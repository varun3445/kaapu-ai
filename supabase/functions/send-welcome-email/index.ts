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
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL')  || 'Kaapu <onboarding@resend.dev>'
const REPLY_TO       = Deno.env.get('REPLY_TO')    || ''

// ─────────────────────────────────────────────────────────────────────────────
// ✏️  CUSTOMISE YOUR EMAIL HERE
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_CONFIG = {
  // Subject line — {firstName} is replaced automatically
  subject: `Welcome to Kaapu, {firstName} 👋`,

  // Opening lines
  greeting: `Thanks for joining Kaapu — we're really glad you're here.`,
  subGreeting: `You've taken the first step towards keeping your family's health organised and in one place. Here's what you can do right now:`,

  // Feature list — edit, reorder, add or remove rows freely
  features: [
    { icon: '📋', title: 'Log symptoms',       desc: 'Track how you feel day to day and spot patterns early.' },
    { icon: '✅', title: 'Daily check-ins',     desc: 'Quick mood & wellbeing check-ins to stay on top of your health.' },
    { icon: '💊', title: 'Conditions & meds',  desc: 'Keep your conditions and medications in one secure place.' },
    { icon: '🚨', title: 'Emergency alerts',   desc: 'One tap sends your location and health info to your emergency contacts.' },
  ],

  // Call-to-action button
  ctaLabel: 'Open Kaapu →',
  ctaUrl:   'https://kaapu-ai.vercel.app',

  // Closing personal note (shown below the CTA) — keep it short, or set to '' to hide
  closingNote: `This is still an early version — if anything feels off or you have feedback, just reply to this email. I read every one.`,

  // Footer
  footerText: `© ${new Date().getFullYear()} Kaapu · Built with ❤️ for families`,
}

// ─────────────────────────────────────────────────────────────────────────────

function buildHtml(name: string): string {
  const firstName = name.split(' ')[0]
  const cfg = EMAIL_CONFIG
  const subject  = cfg.subject.replace('{firstName}', firstName)

  const featureRows = cfg.features.map(f => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:22px;width:40px;vertical-align:top;padding-top:2px;">${f.icon}</td>
          <td style="padding-left:12px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#1f2937;">${f.title}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${f.desc}</p>
          </td>
        </tr></table>
      </td>
    </tr>`).join('')

  const closingBlock = cfg.closingNote ? `
    <div style="margin-top:24px;background:#f0f4ff;border-radius:12px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">${cfg.closingNote}</p>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${subject}</title>
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
            <p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.6;">${cfg.greeting}</p>
            <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">${cfg.subGreeting}</p>

            <!-- Feature list -->
            <table width="100%" cellpadding="0" cellspacing="0">${featureRows}</table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr><td align="center">
                <a href="${cfg.ctaUrl}"
                  style="display:inline-block;background:linear-gradient(135deg,#6366f1,#818cf8);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.2px;">
                  ${cfg.ctaLabel}
                </a>
              </td></tr>
            </table>

            ${closingBlock}

            <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;">
              You're receiving this because you just signed up for Kaapu.<br/>
              If this wasn't you, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">${cfg.footerText}</p>
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

    const firstName = name.split(' ')[0]
    const subject   = EMAIL_CONFIG.subject.replace('{firstName}', firstName)

    const payload: Record<string, unknown> = {
      from:    FROM_EMAIL,
      to:      [email],
      subject,
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
