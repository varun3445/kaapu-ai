import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Heart, Users, Stethoscope } from 'lucide-react'
import { useApp } from '../context/AppContext'

const ROLES = [
  { id: 'user',   label: 'Individual', icon: Users,        desc: 'Track health for your family' },
  { id: 'doctor', label: 'Doctor',     icon: Stethoscope,  desc: 'Monitor your patients', disabled: true },
]

// ── SVG logos ────────────────────────────────────────────────────────────────
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}


export default function Auth() {
  const { login, signup, signInWithOAuth } = useApp()
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup'
  const [role,    setRole]    = useState('user')
  const [form,    setForm]    = useState({ name: '', familyName: '', email: '', password: '', age: '', gender: 'female' })
  const [showPw,      setShowPw]      = useState(false)
  const [consent,     setConsent]     = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [error,       setError]       = useState('')
  const [loading, setLoading] = useState(false)
  const [slowHint, setSlowHint] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSlowHint(false)
    const slowTimer = setTimeout(() => setSlowHint(true), 8000)

    try {
      let result
      if (mode === 'login') {
        result = await login(form.email, form.password)
      } else {
        const missing = []
        if (!form.name) missing.push('name')
        if (!form.email) missing.push('email')
        if (!form.password) missing.push('password')
        if (missing.length > 0) {
          setError(`Please fill in: ${missing.join(', ')}.`)
          return
        }
        if (!consent) {
          setError('Please accept the Privacy Policy to create an account.')
          return
        }
        result = await signup({
          name: form.name,
          familyName: form.familyName ? `${form.name} ${form.familyName}` : `${form.name}'s Family`,
          email: form.email,
          password: form.password,
          age: parseInt(form.age) || 30,
          gender: form.gender,
          role,
          consentGivenAt: new Date().toISOString(),
        })
      }
      if (result?.error) setError(result.error)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      clearTimeout(slowTimer)
      setLoading(false)
      setSlowHint(false)
    }
  }

  // Demo login shortcuts
  async function demoLogin(e, p) {
    setForm(f => ({ ...f, email: e, password: p }))
    await login(e, p)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#eeeae6' }}>
      {/* Ambient gradient blobs — same as AppLayout */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '-10%', left: '-15%',
          width: '55%', height: '55%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', right: '-10%',
          width: '45%', height: '45%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '20%',
          width: '40%', height: '40%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-5%', right: '25%',
          width: '35%', height: '35%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }} />
      </div>

      {/* Hero header */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <img src="/logo.png" alt="Kaapu" className="w-28 h-28 object-contain" style={{ mixBlendMode: 'multiply' }} />
        <h1 className="text-2xl font-extrabold text-gray-900">Kaapu</h1>
        <p className="text-sm text-gray-500 mt-1 text-center">
          Because when you can't speak, someone still needs to.
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center px-4">
        <motion.div
          layout
          className="w-full max-w-sm glass-elevated rounded-3xl p-6"
        >
          {/* Tabs */}
          <div className="flex rounded-2xl p-1 mb-6" style={{ background: 'rgba(0,0,0,0.06)' }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setConsent(false) }}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${
                  mode === m ? 'text-gray-900' : 'text-gray-500'
                }`}
                style={mode === m ? {
                  background: 'rgba(255,255,255,0.85)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                } : {}}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* ── OAuth buttons ── */}
          <div className="flex flex-col gap-2 mb-5">
            <button
              type="button"
              onClick={async () => {
                setLoading(true); setError('')
                const r = await signInWithOAuth('google')
                if (r?.error) { setError(r.error); setLoading(false) }
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-semibold text-gray-700 transition-all hover:bg-black/5 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.7)', border: '0.75px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <GoogleLogo />
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
            <span className="text-[11px] text-gray-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'signup' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <>
                  {/* Role selector */}
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => {
                      const Icon = r.icon
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => !r.disabled && setRole(r.id)}
                          disabled={r.disabled}
                          className="p-3 rounded-2xl border-2 text-left transition-all"
                          style={r.disabled ? {
                            borderColor: 'rgba(0,0,0,0.05)',
                            background: 'rgba(0,0,0,0.03)',
                            opacity: 0.45,
                            cursor: 'not-allowed',
                          } : role === r.id ? {
                            borderColor: 'rgba(99,102,241,0.5)',
                            background: 'rgba(99,102,241,0.08)',
                          } : {
                            borderColor: 'rgba(0,0,0,0.07)',
                            background: 'rgba(255,255,255,0.45)',
                          }}
                        >
                          <Icon size={18} className={r.disabled ? 'text-gray-300' : role === r.id ? 'text-primary-600' : 'text-gray-400'} />
                          <p className={`text-xs font-bold mt-1 ${r.disabled ? 'text-gray-300' : 'text-gray-800'}`}>{r.label}</p>
                          <p className={`text-[10px] leading-tight mt-0.5 ${r.disabled ? 'text-gray-300' : 'text-gray-400'}`}>{r.disabled ? 'Coming soon' : r.desc}</p>
                        </button>
                      )
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="Full name *"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className="input-field"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Age" value={form.age}
                      onChange={e => set('age', e.target.value)} className="input-field" min={1} max={120} />
                    <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input-field">
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}

              <input
                type="email"
                placeholder="Email address *"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="input-field"
                autoComplete="email"
              />

              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password *"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="input-field pr-12"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {mode === 'signup' && (
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => { setConsent(e.target.checked); setError('') }}
                      className="sr-only"
                    />
                    <div
                      className="w-4 h-4 rounded-[5px] border-2 flex items-center justify-center transition-all"
                      style={consent ? {
                        background: 'rgba(99,102,241,1)',
                        borderColor: 'rgba(99,102,241,1)',
                      } : {
                        background: 'rgba(255,255,255,0.6)',
                        borderColor: 'rgba(0,0,0,0.18)',
                      }}
                    >
                      {consent && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-500 leading-relaxed">
                    I agree to the{' '}
                    <button
                      type="button"
                      className="text-primary-600 font-semibold underline underline-offset-2 hover:text-primary-700 py-1 -my-1"
                      onClick={e => { e.stopPropagation(); setShowPrivacy(true) }}
                    >
                      Privacy Policy
                    </button>
                    {' '}and consent to my health data being processed by Kaapu.
                  </span>
                </label>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <p className="text-xs text-rose-600 font-medium">{error}</p>
                  {error.includes('sign up') && (
                    <button type="button" onClick={() => { setMode('signup'); setError('') }}
                      className="text-xs font-bold text-primary-600 mt-1 underline underline-offset-2">
                      Create an account →
                    </button>
                  )}
                </motion.div>
              )}

              {slowHint && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[11px] text-center text-amber-600 font-medium -mb-1">
                  ⏳ Server is waking up — almost there…
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 hover:bg-primary-700 text-white transition-all disabled:opacity-60 shadow-sm"
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Loading…</span>
                  : mode === 'login' ? 'Sign In' : 'Create Account'
                }
              </button>
            </motion.form>
          </AnimatePresence>

        </motion.div>
      </div>

      {/* Privacy Policy overlay */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: '#eeeae6' }}
          >
            <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-black/8">
              <button
                onClick={() => setShowPrivacy(false)}
                className="text-sm font-semibold text-primary-600"
              >
                ← Back
              </button>
              <h2 className="text-base font-bold text-gray-900">Privacy Policy</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 text-sm text-gray-700 max-w-lg mx-auto w-full">
              <p className="text-xs text-gray-400">Last updated: April 2026</p>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">1. Who we are</h3>
                <p>Kaapu is a family health tracking application. We take privacy seriously, especially because we handle sensitive health data.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">2. What data we collect</h3>
                <p>We collect your name, email address, age, gender, and the health symptoms you log — including body location, severity, and notes. We also collect your home location if you provide it.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">3. Why we collect it</h3>
                <p>Your data is used solely to provide the health tracking service: displaying your symptom history, enabling family health management, and (optionally) sharing with your doctor.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">4. Legal basis (GDPR Article 9)</h3>
                <p>Health data is a special category under GDPR. We process it on the basis of your <strong>explicit consent</strong>, which you give when you create an account. You may withdraw consent at any time by deleting your account.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">5. How we store it</h3>
                <p>Data is stored securely in Supabase (EU region) with row-level security. Only you and family members you invite can access your data.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">6. Your rights</h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Access & portability</strong> — download all your data as JSON from the Account page.</li>
                  <li><strong>Erasure</strong> — delete your account and all associated data from the Account page.</li>
                  <li><strong>Rectification</strong> — update your profile at any time.</li>
                  <li><strong>Withdraw consent</strong> — stop using the app and delete your account.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">7. Data sharing</h3>
                <p>We do not sell or share your data with third parties. Doctors you connect with can only see data you explicitly share.</p>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 mb-1">8. Contact</h3>
                <p>For any privacy questions or requests, contact us at <strong>info@ownflows.com</strong>.</p>
              </section>
            </div>
            <div className="px-5 pb-10 max-w-lg mx-auto w-full">
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 text-white"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline style for input fields — glassmorphic */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 12px 16px;
          border: 0.75px solid rgba(0,0,0,0.09);
          border-radius: 14px;
          font-size: 14px;
          font-family: 'Figtree', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          background: rgba(255,255,255,0.55);
          color: #111827;
          backdrop-filter: blur(8px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .input-field::placeholder {
          color: rgba(107,114,128,0.7);
        }
        .input-field:focus {
          border-color: rgba(99,102,241,0.45);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.95);
          background: rgba(255,255,255,0.78);
        }
        select.input-field {
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
