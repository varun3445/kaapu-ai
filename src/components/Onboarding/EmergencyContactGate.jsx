import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, ShieldAlert, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const REL_OPTIONS = ['Partner', 'Parent', 'Sibling', 'Friend', 'Doctor', 'Other']

export default function EmergencyContactGate() {
  const { updateProfile, currentUser } = useApp()

  const [name,         setName]         = useState('')
  const [phone,        setPhone]        = useState('')
  const [relationship, setRelationship] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Please enter a name.'); return }
    setSaving(true)
    setError('')
    const existing = (currentUser?.emergencyContacts || []).filter(c => c.name?.trim())
    await updateProfile({
      emergencyContacts: [
        { name: name.trim(), phone: phone.trim(), relationship },
        ...existing,
      ],
    })
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-5"
      style={{ background: '#eeeae6' }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position:'absolute', top:'-10%', left:'-15%', width:'55%', height:'55%', borderRadius:'50%', background:'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)', filter:'blur(48px)' }} />
        <div style={{ position:'absolute', bottom:'5%', right:'-10%', width:'40%', height:'40%', borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter:'blur(48px)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-500 flex items-center justify-center shadow-lg">
            <ShieldAlert size={30} className="text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-extrabold text-black mb-1">Add an emergency contact</h1>
          <p className="text-sm text-black/75 leading-relaxed">
            Before you continue, add at least one person Kaapu can alert if you press the SOS button. This is required.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 space-y-3 shadow-lg" style={{ border: '0.75px solid rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center">
              <Phone size={13} className="text-rose-500" />
            </div>
            <p className="text-xs font-bold text-black/80">Primary Contact <span className="text-rose-500">*</span></p>
          </div>

          {/* Name */}
          <div>
            <input
              type="text"
              placeholder="Full name *"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-black focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.7)',
                border: error ? '1.5px solid #f87171' : '0.75px solid rgba(0,0,0,0.10)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
              }}
            />
            {error && <p className="text-[11px] text-rose-500 font-semibold mt-1.5">{error}</p>}
          </div>

          {/* Phone */}
          <input
            type="tel"
            placeholder="Phone e.g. +447911123456"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-black focus:outline-none transition-all"
            style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)' }}
          />

          {/* Relationship */}
          <div className="relative">
            <select
              value={relationship}
              onChange={e => setRelationship(e.target.value)}
              className="w-full pl-3 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all appearance-none"
              style={{ background:'rgba(255,255,255,0.7)', border:'0.75px solid rgba(0,0,0,0.10)', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.04)', color: relationship ? '#1f2937' : '#9ca3af' }}
            >
              <option value="">Relationship…</option>
              {REL_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/75 pointer-events-none" />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-3.5 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: saving ? '#9ca3af' : '#ef4444', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
          ) : (
            <><Phone size={15} /> Save &amp; Continue</>
          )}
        </button>

        <p className="text-center text-[10px] text-black/75 mt-3 px-2">
          You can add more contacts or edit this any time in Profile → Emergency Contacts.
        </p>
      </div>
    </motion.div>
  )
}
