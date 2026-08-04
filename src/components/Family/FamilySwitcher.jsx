import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function Avatar({ member, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  if (member?.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member?.name || 'Profile photo'}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: member?.avatarColor || '#6366f1' }}
    >
      {member?.avatar || '?'}
    </div>
  )
}

// Compact variant used in Header alongside profile button
export default function FamilySwitcher({ current, members, onSwitch, compact = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-black/75 hover:text-primary-600 transition-colors"
          title="Switch family member"
        >
          <Users size={16} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity:0, y:-8, scale:0.95 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-8, scale:0.95 }}
              transition={{ duration:0.15 }}
              className="absolute top-full right-0 mt-2 w-52 glass-elevated rounded-2xl border-0 overflow-hidden z-50"
            >
              <div className="p-2">
                <p className="text-[10px] uppercase tracking-wider text-black/75 font-semibold px-3 pt-2 pb-1">Switch Profile</p>
                {members.map(m => (
                  <button key={m.id} onClick={() => { onSwitch(m); setOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                      current?.id === m.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}>
                    <Avatar member={m} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-black">{m.name}</p>
                      <p className="text-[10px] text-black/75">{m.relationship} · {m.age}yo</p>
                    </div>
                    {current?.id === m.id && <div className="ml-auto w-2 h-2 rounded-full bg-primary-500" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full variant (kept for backwards compat)
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        {current && <Avatar member={current} />}
        <div className="text-left">
          <p className="text-xs text-black/75 font-medium leading-none mb-0.5">Hello,</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold text-black leading-none">{current?.name?.split(' ')[0] || 'Select'}</p>
            <ChevronDown size={14} className={`text-black/75 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:-8, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-8, scale:0.95 }} transition={{ duration:0.15 }}
            className="absolute top-full left-0 mt-2 w-56 glass-elevated rounded-2xl border-0 overflow-hidden z-50">
            <div className="p-2">
              {members.map(m => (
                <button key={m.id} onClick={() => { onSwitch(m); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    current?.id === m.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}>
                  <Avatar member={m} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-black">{m.name}</p>
                    <p className="text-xs text-black/75">{m.relationship} · {m.age}yo</p>
                  </div>
                  {current?.id === m.id && <div className="ml-auto w-2 h-2 rounded-full bg-primary-500" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
