import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Camera, ChevronLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'

const COUNTRIES = [
  'United Kingdom', 'United States', 'Canada', 'Ireland', 'Australia', 'New Zealand',
  'India', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway',
  'Denmark', 'Portugal', 'Poland', 'Singapore', 'United Arab Emirates', 'South Africa',
  'Other',
]

export default function Auth() {
  const { login, signup, isPasswordRecovery, resetPassword, updatePassword, checkEmailExists } = useApp()
  const [mode,        setMode]        = useState('login')   // 'login' | 'signup'
  const [signupStep,  setSignupStep]  = useState(1)          // 1 | 2
  const [form,    setForm]    = useState({ name: '', preferredName: '', email: '', password: '', country: '', dob: '', gender: '' })
  const [showPw,      setShowPw]      = useState(false)
  const [consent,     setConsent]     = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [error,       setError]       = useState('')
  const [loading, setLoading] = useState(false)
  const [slowHint, setSlowHint] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [forgotMode, setForgotMode] = useState('idle') // 'idle' | 'form' | 'sent' | 'notFound' | 'error'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordUpdateError, setPasswordUpdateError] = useState('')
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false)
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const avatarInputRef = useRef(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // Step 1 of sign up just collects email/password/consent, then advances —
    // the actual account isn't created until step 2 is submitted.
    if (mode === 'signup' && signupStep === 1) {
      const missing = []
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
      setError('')
      setLoading(true)
      const check = await checkEmailExists(form.email)
      setLoading(false)
      if (check.error) {
        setError('Could not verify email right now. Please try again.')
        return
      }
      if (check.exists) {
        setError('Email already in use, please sign in.')
        return
      }
      setSignupStep(2)
      return
    }

    setLoading(true)
    setError('')
    setSlowHint(false)
    const slowTimer = setTimeout(() => setSlowHint(true), 8000)

    try {
      let result
      if (mode === 'login') {
        result = await login(form.email, form.password)
      } else {
        if (!form.name) {
          setError('Please enter your full name.')
          return
        }
        result = await signup({
          name: form.name,
          preferredName: form.preferredName,
          email: form.email,
          password: form.password,
          country: form.country,
          dob: form.dob,
          gender: form.gender,
          role: 'user',
          avatarFile,
          consentGivenAt: new Date().toISOString(),
        })
      }
      if (result?.needsEmailConfirmation) {
        setConfirmEmail(form.email)
      } else if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      clearTimeout(slowTimer)
      setLoading(false)
      setSlowHint(false)
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setForgotLoading(true)
    const result = await resetPassword(forgotEmail)
    setForgotLoading(false)
    if (result.notFound) { setForgotMode('notFound'); return }
    if (result.error) { setForgotError(result.error); setForgotMode('error'); return }
    setForgotMode('sent')
  }

  async function handleNewPassword(e) {
    e.preventDefault()
    setPasswordUpdateError('')
    if (newPassword !== newPasswordConfirm) { setPasswordUpdateError('Passwords do not match.'); return }
    if (newPassword.length < 6) { setPasswordUpdateError('Password must be at least 6 characters.'); return }
    setPasswordUpdateLoading(true)
    const result = await updatePassword(newPassword)
    setPasswordUpdateLoading(false)
    if (result.error) setPasswordUpdateError(result.error)
  }

  // Demo login shortcuts
  async function demoLogin(e, p) {
    setForm(f => ({ ...f, email: e, password: p }))
    await login(e, p)
  }

  // ── Set new password (user clicked reset link in email) ─────────────────────
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#acd1fb' }}>
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', top: '-10%', left: '-15%', width: '55%', height: '55%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)', filter: 'blur(48px)' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm glass-elevated rounded-3xl p-8">
          <h2 className="text-xl font-extrabold text-black mb-1">Set new password</h2>
          <p className="text-sm text-black/75 mb-6">Choose a password you haven't used before.</p>
          <form onSubmit={handleNewPassword} className="space-y-4">
            <input type="password" placeholder="New password *" value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordUpdateError('') }}
              className="input-field" autoComplete="new-password" />
            <input type="password" placeholder="Confirm new password *" value={newPasswordConfirm}
              onChange={e => { setNewPasswordConfirm(e.target.value); setPasswordUpdateError('') }}
              className="input-field" autoComplete="new-password" />
            {passwordUpdateError && (
              <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <p className="text-xs text-rose-600 font-medium">{passwordUpdateError}</p>
              </div>
            )}
            <button type="submit" disabled={passwordUpdateLoading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 text-white disabled:opacity-60">
              {passwordUpdateLoading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Updating…</span>
                : 'Update password'}
            </button>
          </form>
        </motion.div>
        <style>{`.input-field{width:100%;padding:12px 16px;border:0.75px solid rgba(0,0,0,0.09);border-radius:9999px;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;background:rgba(0,0,0,0.25);color:#000000;backdrop-filter:blur(8px);}.input-field::placeholder{color:rgba(107,114,128,0.7);}.input-field:focus{border-color:rgba(99,102,241,0.45);box-shadow:0 0 0 3px rgba(99,102,241,0.1);background:rgba(255,255,255,0.78);}`}</style>
      </div>
    )
  }

  // ── Forgot password screens ──────────────────────────────────────────────────
  if (forgotMode !== 'idle') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#acd1fb' }}>
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', top: '-10%', left: '-15%', width: '55%', height: '55%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)', filter: 'blur(48px)' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)', filter: 'blur(48px)' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm glass-elevated rounded-3xl p-8">

          {forgotMode === 'form' && (
            <>
              <button onClick={() => setForgotMode('idle')}
                className="text-sm font-semibold text-primary-600 mb-5 block">← Back</button>
              <h2 className="text-xl font-extrabold text-black mb-1">Reset password</h2>
              <p className="text-sm text-black/75 mb-6">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input type="email" placeholder="Email address *" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="input-field" autoComplete="email" />
                <button type="submit" disabled={forgotLoading}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 text-white disabled:opacity-60">
                  {forgotLoading
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Checking…</span>
                    : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          {forgotMode === 'sent' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(99,102,241,0.12)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 7l10 7 10-7"/>
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-black mb-2">Check your email</h2>
              <p className="text-sm text-black/75 mb-1">We sent a reset link to</p>
              <p className="text-sm font-semibold text-black mb-5">{forgotEmail}</p>
              <p className="text-xs text-black/75 mb-6">Click the link in the email to set a new password. Check your spam folder if you don't see it.</p>
              <button onClick={() => { setForgotMode('idle'); setForgotEmail('') }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 text-white">
                Back to Sign In
              </button>
            </div>
          )}

          {forgotMode === 'notFound' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-black mb-2">Account not found</h2>
              <p className="text-sm text-black/75 mb-6">
                We couldn't find an account for <span className="font-semibold text-black/80">{forgotEmail}</span>. Double-check the email or create a new account.
              </p>
              <button onClick={() => { setForgotMode('idle'); setForgotEmail(''); setMode('signup') }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 text-white mb-3">
                Create an account
              </button>
              <button onClick={() => setForgotMode('form')}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-black/75">
                Try a different email
              </button>
            </div>
          )}

          {forgotMode === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-black mb-2">Couldn't send reset email</h2>
              <p className="text-sm text-black/75 mb-6">
                {forgotError.toLowerCase().includes('rate limit')
                  ? "We've hit the limit on how many reset emails can be sent right now. Please wait a bit and try again."
                  : forgotError}
              </p>
              <button onClick={() => setForgotMode('form')}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 text-white">
                Try again
              </button>
            </div>
          )}
        </motion.div>
        <style>{`.input-field{width:100%;padding:12px 16px;border:0.75px solid rgba(0,0,0,0.09);border-radius:9999px;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;background:rgba(0,0,0,0.25);color:#000000;backdrop-filter:blur(8px);}.input-field::placeholder{color:rgba(107,114,128,0.7);}.input-field:focus{border-color:rgba(99,102,241,0.45);box-shadow:0 0 0 3px rgba(99,102,241,0.1);background:rgba(255,255,255,0.78);}`}</style>
      </div>
    )
  }

  if (confirmEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#acd1fb' }}>
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', top: '-10%', left: '-15%', width: '55%', height: '55%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)', filter: 'blur(48px)' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)', filter: 'blur(48px)' }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm glass-elevated rounded-3xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(99,102,241,0.12)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3"/>
              <path d="M2 7l10 7 10-7"/>
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-black mb-2">Check your email</h2>
          <p className="text-sm text-black/75 leading-relaxed mb-1">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-black mb-5">{confirmEmail}</p>
          <p className="text-xs text-black/75 leading-relaxed mb-6">
            Click the link in the email to activate your account. Check your spam folder if you don't see it.
          </p>
          <button
            onClick={() => { setConfirmEmail(''); setMode('login'); setForm(f => ({ ...f, email: confirmEmail, password: '' })) }}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary-600 text-white"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    )
  }

  const showTabs = !(mode === 'signup' && signupStep === 2)

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: '#acd1fb' }}>
      {/* Hero header — fixed 128px from top, same on every screen */}
      <div className="flex flex-col items-center pt-28 pb-6 px-6">
        <div className="flex items-center gap-2 justify-center">
          <img src="/logo.png" alt="Kaapu" className="w-14 h-14 object-contain" style={{ mixBlendMode: 'multiply' }} />
          <h1 className="text-2xl font-extrabold text-black">Kaapu</h1>
        </div>
        <p className="text-sm text-black/75 mt-1 text-center max-w-xs">
          When you can't speak, Kaapu will.
        </p>
      </div>

      {/* Sheet */}
      <div className="relative bg-white/75 rounded-t-3xl flex-1 flex flex-col items-center justify-center gap-9 p-6 w-full max-w-lg mx-auto">

        {mode === 'signup' && signupStep === 2 && (
          <button
            type="button"
            onClick={() => { setSignupStep(1); setError('') }}
            aria-label="Back"
            className="absolute left-4 top-4 w-9 h-9 rounded-full flex items-center justify-center text-black/75 hover:text-black transition-colors"
            style={{ background: 'rgba(0,0,0,0.08)' }}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {showTabs && (
          <div className="flex rounded-full p-1 w-full" style={{ background: 'rgba(0,0,0,0.25)' }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setSignupStep(1); setError(''); setConsent(false) }}
                className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all ${
                  mode === m ? 'text-black' : 'text-black/75'
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
        )}

        <AnimatePresence mode="wait">
          <motion.form
            key={`${mode}-${signupStep}`}
            initial={{ opacity: 0, x: mode === 'signup' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="w-full flex flex-col items-center gap-9"
          >
            {/* ── Sign in, or step 1 of sign up ───────────────────────────── */}
            {!(mode === 'signup' && signupStep === 2) && (
              <div className="w-full flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className="input-field"
                  autoComplete="email"
                />

                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Password"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    className="input-field pr-12"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-black/75 hover:text-black/75 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button type="button" onClick={() => { setForgotEmail(form.email); setForgotMode('form') }}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 py-1">
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && signupStep === 1 && (
              <label className="w-full flex items-start gap-2.5 cursor-pointer group">
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
                <span className="text-[11px] text-black leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    className="text-primary-600 font-bold underline underline-offset-2 hover:text-primary-700 py-1 -my-1"
                    onClick={e => { e.stopPropagation(); setShowPrivacy(true) }}
                  >
                    Privacy Policy
                  </button>
                  {' '}and consent to my health data being processed by Kaapu AI Limited.
                </span>
              </label>
            )}

            {/* ── Step 2 of sign up: profile details ──────────────────────── */}
            {mode === 'signup' && signupStep === 2 && (
              <div className="w-full flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative rounded-full flex-shrink-0 hover:opacity-90 transition-opacity"
                  aria-label="Add a profile photo"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.15)', border: '0.25px solid rgba(0,0,0,0.25)', boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.15)' }}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xl font-bold text-black/40">{(form.name || form.email || '?').slice(0, 1).toUpperCase()}</span>}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Camera size={11} className="text-primary-600" />
                  </span>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />

                <div className="w-full flex flex-col gap-8">
                  <div className="w-full flex flex-col gap-4">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      className="input-field"
                    />
                    <input
                      type="text"
                      placeholder="Preferred name"
                      value={form.preferredName}
                      onChange={e => set('preferredName', e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-4">
                    <select value={form.country} onChange={e => set('country', e.target.value)} className="input-field">
                      <option value="" disabled>Country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      type="date"
                      placeholder="Date of birth"
                      value={form.dob}
                      onChange={e => set('dob', e.target.value)}
                      className="input-field"
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input-field">
                      <option value="" disabled>Sex registered at birth</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <p className="text-xs text-rose-600 font-medium">{error}</p>
                {error.includes('sign up') && (
                  <button type="button" onClick={() => { setMode('signup'); setSignupStep(1); setError('') }}
                    className="text-xs font-bold text-primary-600 mt-1 underline underline-offset-2">
                    Create an account →
                  </button>
                )}
              </motion.div>
            )}

            {slowHint && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[11px] text-center text-amber-600 font-medium">
                ⏳ Server is waking up — almost there…
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full font-bold text-sm text-white transition-all disabled:opacity-60"
              style={{ background: '#4f46e5', boxShadow: '0px 1px 1px rgba(0,0,0,0.05)' }}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Loading…</span>
                : mode === 'login' ? 'Sign In' : signupStep === 1 ? 'Sign Up' : 'Continue'
              }
            </button>

            {mode === 'login' && (
              <p className="text-center text-[11px] font-bold text-primary-600 underline underline-offset-2">
                <button type="button" onClick={() => setShowPrivacy(true)}>
                  Privacy Policy
                </button>
              </p>
            )}
          </motion.form>
        </AnimatePresence>
      </div>

      {/* Privacy Policy overlay */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: '#acd1fb' }}
          >
            <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-black/8">
              <button
                onClick={() => setShowPrivacy(false)}
                className="text-sm font-semibold text-primary-600"
              >
                ← Back
              </button>
              <h2 className="text-base font-bold text-black">Privacy Policy</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 text-sm text-black/80 max-w-lg mx-auto w-full">
              <p className="text-xs text-black/75">Last updated: April 2026</p>

              <section>
                <h3 className="font-bold text-black mb-1">1. Who we are</h3>
                <p>Kaapu is a family health tracking application. We take privacy seriously, especially because we handle sensitive health data.</p>
              </section>

              <section>
                <h3 className="font-bold text-black mb-1">2. What data we collect</h3>
                <p>We collect your name, email address, age, gender, and the health symptoms you log — including body location, severity, and notes. We also collect your home location if you provide it.</p>
              </section>

              <section>
                <h3 className="font-bold text-black mb-1">3. Why we collect it</h3>
                <p>Your data is used solely to provide the health tracking service: displaying your symptom history, enabling family health management, and (optionally) sharing with your doctor.</p>
              </section>

              <section>
                <h3 className="font-bold text-black mb-1">4. Legal basis (GDPR Article 9)</h3>
                <p>Health data is a special category under GDPR. We process it on the basis of your <strong>explicit consent</strong>, which you give when you create an account. You may withdraw consent at any time by deleting your account.</p>
              </section>

              <section>
                <h3 className="font-bold text-black mb-1">5. How we store it</h3>
                <p>Data is stored securely in Supabase (EU region) with row-level security. Only you and family members you invite can access your data.</p>
              </section>

              <section>
                <h3 className="font-bold text-black mb-1">6. Your rights</h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Access & portability</strong> — download all your data as JSON from the Account page.</li>
                  <li><strong>Erasure</strong> — delete your account and all associated data from the Account page.</li>
                  <li><strong>Rectification</strong> — update your profile at any time.</li>
                  <li><strong>Withdraw consent</strong> — stop using the app and delete your account.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-black mb-1">7. Data sharing</h3>
                <p>We do not sell or share your data with third parties. Doctors you connect with can only see data you explicitly share.</p>
              </section>

              <section>
                <h3 className="font-bold text-black mb-1">8. Contact</h3>
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
          border-radius: 9999px;
          font-size: 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          background: rgba(0,0,0,0.25);
          color: #000000;
          backdrop-filter: blur(8px);
        }
        .input-field::placeholder {
          color: rgba(107,114,128,0.7);
        }
        .input-field:focus {
          border-color: rgba(99,102,241,0.45);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
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
