import { useState, useEffect } from 'react'
import { Bell, X, Users, UserCheck, UserX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import ProfilePanel from '../Profile/ProfilePanel'
import { Avatar } from '../Family/FamilySwitcher'

// ── People panel ──────────────────────────────────────────────────────────────
function PeoplePanel({ open, onClose }) {
  const {
    myFamilyMembers, currentMember, currentUser,
    familyRequests, respondFamilyRequest,
  } = useApp()

  const incoming = familyRequests.filter(
    r => r.toUserId === currentUser?.id && r.status === 'pending'
  )

  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md glass-elevated rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-black/6 flex-shrink-0">
          <div>
            <p className="text-sm font-extrabold text-gray-800">Family &amp; Friends</p>
            <p className="text-xs text-gray-400">
              {myFamilyMembers.length} member{myFamilyMembers.length !== 1 ? 's' : ''}
              {incoming.length > 0 && ` · ${incoming.length} request${incoming.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Pending connection requests ── */}
          {incoming.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-black">{incoming.length}</span>
                Connection Requests
              </p>
              <div className="space-y-2">
                {incoming.map(r => (
                  <div key={r.id} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-extrabold text-indigo-600 flex-shrink-0">
                        {r.fromUserName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{r.fromUserName}</p>
                        <p className="text-[10px] font-mono text-gray-400">{r.fromUserUid}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                          Wants to connect as <span className="font-extrabold">{r.relationship}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondFamilyRequest(r.id, true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                      >
                        <UserCheck size={12} /> Accept
                      </button>
                      <button
                        onClick={() => respondFamilyRequest(r.id, false)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-500 text-xs font-semibold"
                      >
                        <UserX size={12} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Current members ── */}
          <div>
            {incoming.length > 0 && (
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Members</p>
            )}
            <div className="space-y-2">
              {myFamilyMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 glass-card rounded-2xl p-3.5">
                  <Avatar member={m} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.relationship}{m.age ? ` · ${m.age}yo` : ''}</p>
                  </div>
                  {m.id === currentMember?.id && (
                    <span className="text-[10px] font-semibold text-primary-500 bg-primary-50 px-2 py-1 rounded-full">You</span>
                  )}
                </div>
              ))}
              {myFamilyMembers.length === 0 && !incoming.length && (
                <div className="text-center py-8 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No members yet</p>
                  <p className="text-xs mt-1">Go to Family → Manage to add people</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────
export default function Header() {
  const {
    currentMember, notifications, notifCentreOpen, setNotifCentreOpen,
    familyRequests, currentUser,
  } = useApp()
  const [panelOpen,  setPanelOpen]  = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)

  // Tour can open/close the profile panel
  useEffect(() => {
    const handler = (e) => setPanelOpen(e.detail?.open ?? false)
    window.addEventListener('kaapu:tour-profile', handler)
    return () => window.removeEventListener('kaapu:tour-profile', handler)
  }, [])

  const unread         = notifications.filter(n => !n.forUserId || n.forUserId === currentUser?.id).length
  const pendingReqCount = familyRequests.filter(
    r => r.toUserId === currentUser?.id && r.status === 'pending'
  ).length

  return (
    <>
      <header className="glass border-b border-gray-100 px-4 pb-3 z-40 relative" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Profile avatar — opens settings panel */}
          <button data-tour="header-profile" onClick={() => setPanelOpen(true)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            {currentMember && (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ background: currentMember.avatarColor || '#6366f1' }}
              >
                {currentMember.avatar}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs text-gray-400 font-medium leading-none mb-0.5">Hello,</p>
              <p className="text-sm font-bold text-gray-800 leading-none">
                {currentMember?.name?.split(' ')[0] || 'Profile'}
              </p>
            </div>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifCentreOpen(true)}
                aria-label="Notifications"
                className="w-11 h-11 rounded-full glass-card flex items-center justify-center text-gray-500 hover:text-primary-600 transition-colors"
              >
                <Bell size={17} />
              </button>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>

            {/* People / Family button */}
            <div className="relative">
              <button
                onClick={() => setPeopleOpen(true)}
                className="w-11 h-11 rounded-full glass-card flex items-center justify-center text-gray-500 hover:text-primary-600 transition-colors"
                aria-label="Family & Friends"
              >
                <Users size={16} />
              </button>
              {pendingReqCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingReqCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <ProfilePanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      <AnimatePresence>
        {peopleOpen && <PeoplePanel open={peopleOpen} onClose={() => setPeopleOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
