import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Info, X, MapPin, ExternalLink,
  Heart, Pill, Phone, Clock, ChevronRight,
  CheckCircle, ShieldAlert, Bell, Trash2, Users, UserCheck, UserX, Sparkles,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { useApp } from '../../context/AppContext'

// ── Notification type config ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  emergency: {
    icon:       AlertTriangle,
    accent:     '#ef4444',   // strip + icon colour
    border:     'rgba(239,68,68,0.45)',
    badge:      'bg-rose-100 text-rose-700',
    dot:        'bg-rose-400',
    label:      'Emergency',
    // kept for detail sheet / centre rows
    bar:        'bg-rose-50 border-rose-200',
    text:       'text-rose-800',
    sub:        'text-rose-400',
  },
  danger: {
    icon:       AlertTriangle,
    accent:     '#ef4444',
    border:     'rgba(239,68,68,0.30)',
    badge:      'bg-rose-100 text-rose-700',
    dot:        'bg-rose-400',
    label:      'High Alert',
    bar:        'bg-rose-50 border-rose-200',
    text:       'text-rose-800',
    sub:        'text-rose-400',
  },
  warning: {
    icon:       AlertTriangle,
    accent:     '#f59e0b',
    border:     'rgba(245,158,11,0.35)',
    badge:      'bg-amber-100 text-amber-700',
    dot:        'bg-amber-400',
    label:      'Warning',
    bar:        'bg-amber-50 border-amber-200',
    text:       'text-amber-800',
    sub:        'text-amber-400',
  },
  escalation: {
    icon:       Clock,
    accent:     '#f97316',
    border:     'rgba(249,115,22,0.30)',
    badge:      'bg-orange-100 text-orange-700',
    dot:        'bg-orange-400',
    label:      'Escalation',
    bar:        'bg-orange-50 border-orange-200',
    text:       'text-orange-800',
    sub:        'text-orange-400',
  },
  risk: {
    icon:       ShieldAlert,
    accent:     '#a855f7',
    border:     'rgba(168,85,247,0.28)',
    badge:      'bg-purple-100 text-purple-700',
    dot:        'bg-purple-400',
    label:      'Risk Update',
    bar:        'bg-purple-50 border-purple-200',
    text:       'text-purple-800',
    sub:        'text-purple-400',
  },
  success: {
    icon:       CheckCircle,
    accent:     '#10b981',
    border:     'rgba(16,185,129,0.28)',
    badge:      'bg-emerald-100 text-emerald-700',
    dot:        'bg-emerald-400',
    label:      'Resolved',
    bar:        'bg-emerald-50 border-emerald-200',
    text:       'text-emerald-800',
    sub:        'text-emerald-400',
  },
  info: {
    icon:       Info,
    accent:     '#3b82f6',
    border:     'rgba(59,130,246,0.25)',
    badge:      'bg-blue-100 text-blue-700',
    dot:        'bg-blue-400',
    label:      'Info',
    bar:        'bg-blue-50 border-blue-200',
    text:       'text-blue-800',
    sub:        'text-blue-400',
  },
  familyRequest: {
    icon:       Users,
    accent:     '#6366f1',
    border:     'rgba(99,102,241,0.28)',
    badge:      'bg-indigo-100 text-indigo-700',
    dot:        'bg-indigo-400',
    label:      'Connection Request',
    bar:        'bg-indigo-50 border-indigo-200',
    text:       'text-indigo-800',
    sub:        'text-indigo-400',
  },
  'ai-streak': {
    icon:       Sparkles,
    accent:     '#8b5cf6',
    border:     'rgba(139,92,246,0.3)',
    badge:      'bg-violet-100 text-violet-700',
    dot:        'bg-violet-400',
    label:      'Kaapu Insight',
    bar:        'bg-violet-50 border-violet-200',
    text:       'text-violet-800',
    sub:        'text-violet-400',
  },
  'ai-weekly-insight': {
    icon:       Sparkles,
    accent:     '#7c3aed',
    border:     'rgba(124,58,237,0.3)',
    badge:      'bg-violet-100 text-violet-800',
    dot:        'bg-violet-500',
    label:      'Weekly Insight',
    bar:        'bg-violet-50 border-violet-300',
    text:       'text-violet-900',
    sub:        'text-violet-500',
  },
}

function cfg(type) { return TYPE_CONFIG[type] || TYPE_CONFIG.info }

function tsLabel(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (isToday(d))     return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a')
  return format(d, 'MMM d, h:mm a')
}

// ── Emergency detail sheet ────────────────────────────────────────────────────
function EmergencyDetail({ event }) {
  if (!event) return (
    <div className="text-center py-8 text-sm text-black/75">No emergency event data found.</div>
  )
  const mapsUrl = event.location
    ? `https://www.google.com/maps?q=${event.location.lat},${event.location.lng}`
    : null
  const hid = event.healthId
  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl ${
        event.status === 'resolved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full ${event.status === 'resolved' ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`} />
        <p className={`text-xs font-extrabold uppercase tracking-wide ${event.status === 'resolved' ? 'text-emerald-700' : 'text-rose-700'}`}>
          {event.status === 'resolved' ? 'Resolved' : 'Active Emergency'}
        </p>
        <p className="text-[10px] text-black/75 ml-auto">
          {format(new Date(event.triggeredAt), 'MMM d, h:mm a')}
        </p>
      </div>
      <div className="bg-gray-50 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <MapPin size={14} className={event.location ? 'text-emerald-500' : 'text-black/75'} />
          <div className="flex-1">
            <p className="text-xs font-bold text-black/80">Location at time of alert</p>
            {event.location ? (
              <p className="text-[11px] text-black/75 font-mono mt-0.5">
                {event.location.lat.toFixed(5)}, {event.location.lng.toFixed(5)}
                {' '}· ±{Math.round(event.location.accuracy)}m
              </p>
            ) : (
              <p className="text-[11px] text-black/75">Location not available</p>
            )}
          </div>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-bold text-primary-600 bg-primary-50 px-2.5 py-1.5 rounded-xl">
              <ExternalLink size={11} /> Maps
            </a>
          )}
        </div>
      </div>
      {event.note && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider mb-1">Patient Note</p>
          <p className="text-sm text-amber-800 font-medium">"{event.note}"</p>
        </div>
      )}
      <div className="bg-indigo-50 rounded-2xl px-4 py-3">
        <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider mb-1.5">Health Summary</p>
        <p className="text-xs text-indigo-700 leading-relaxed">{event.summary}</p>
      </div>
      {hid && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-base font-extrabold text-primary-600">
              {hid.name?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-black">{hid.name}</p>
              <p className="text-xs text-black/75">{hid.age}yo · {hid.gender} · {hid.familyName}</p>
              <p className="text-[11px] text-black/75">Blood: {hid.bloodType} · Allergies: {hid.allergies}</p>
            </div>
          </div>
          {hid.conditions?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Heart size={12} className="text-rose-400" />
                <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider">Conditions</p>
              </div>
              {hid.conditions.map((c, i) => (
                <div key={i} className="text-xs text-rose-700 bg-rose-50 rounded-xl px-3 py-1.5 mb-1 font-medium">{c}</div>
              ))}
            </div>
          )}
          {hid.medications?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Pill size={12} className="text-indigo-400" />
                <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider">Medications</p>
              </div>
              {hid.medications.map((m, i) => (
                <div key={i} className="text-xs text-indigo-700 bg-indigo-50 rounded-xl px-3 py-1.5 mb-1 font-medium">{m}</div>
              ))}
            </div>
          )}
          {hid.emergencyContacts?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Phone size={12} className="text-emerald-400" />
                <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider">Emergency Contacts</p>
              </div>
              {hid.emergencyContacts.map((c, i) => (
                <div key={i} className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-1.5 mb-1 font-medium">
                  {c.name} · {c.relationship}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EscalationDetail({ n, members, checkIns, riskProfiles }) {
  const member = n.memberId ? members.find(m => m.id === n.memberId) : null
  const lastCI = n.memberId
    ? checkIns.filter(c => c.memberId === n.memberId).sort((a,b) => new Date(b.date) - new Date(a.date))[0]
    : null
  const rp = riskProfiles?.find(r => r.memberId === n.memberId)
  return (
    <div className="space-y-3">
      {member && (
        <div className="flex items-center gap-3 bg-orange-50 rounded-2xl px-4 py-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold"
            style={{ background: member.avatarColor + '22', color: member.avatarColor }}>
            {member.avatar}
          </div>
          <div>
            <p className="text-sm font-bold text-black">{member.name}</p>
            <p className="text-xs text-black/75">{member.age}yo · {member.relationship}</p>
          </div>
        </div>
      )}
      <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-2">
        <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider">Last Check-in</p>
        {lastCI ? (
          <p className="text-sm font-semibold text-black/80">
            {format(new Date(lastCI.date), 'MMM d, h:mm a')} — {lastCI.feeling}
            {lastCI.notes && <span className="text-black/75 font-normal"> · "{lastCI.notes}"</span>}
          </p>
        ) : (
          <p className="text-sm text-black/75">No check-in recorded</p>
        )}
      </div>
      {rp && (
        <div className="bg-orange-50 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider mb-1">Risk Config</p>
          <p className="text-xs text-orange-700 font-medium capitalize">
            Risk level: {rp.riskLevel} · Escalation window: {rp.escalationMins} min
          </p>
        </div>
      )}
    </div>
  )
}

function FamilyRequestDetail({ n, onClose }) {
  const { familyRequests, respondFamilyRequest } = useApp()
  const req = familyRequests.find(r => r.id === n.requestId)

  if (!req) return (
    <div className="text-center py-8 text-sm text-black/75">Request no longer available.</div>
  )

  if (req.status !== 'pending') return (
    <div className={`rounded-2xl px-4 py-4 text-center ${
      req.status === 'accepted' ? 'bg-emerald-50' : 'bg-gray-50'
    }`}>
      <p className="text-sm font-bold text-black/80">
        {req.status === 'accepted' ? '✅ You accepted this request.' : 'You declined this request.'}
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-base font-extrabold text-indigo-600">
            {req.fromUserName.slice(0,2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-extrabold text-black">{req.fromUserName}</p>
            <p className="text-xs font-mono text-black/75">{req.fromUserUid}</p>
          </div>
        </div>
        <p className="text-xs text-indigo-700 font-medium">
          Wants to add you to their family as{' '}
          <span className="font-extrabold">{req.relationship}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { respondFamilyRequest(req.id, true); onClose() }}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm"
        >
          <UserCheck size={15} /> Accept
        </button>
        <button
          onClick={() => { respondFamilyRequest(req.id, false); onClose() }}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-100 text-black/75 font-semibold text-sm"
        >
          <UserX size={15} /> Decline
        </button>
      </div>
    </div>
  )
}

function GenericDetail({ n }) {
  return (
    <div className="glass-card rounded-2xl px-4 py-4">
      <p className="text-sm text-black/80 leading-relaxed">{n.message}</p>
      {n.timestamp && (
        <p className="text-[10px] text-black/75 mt-2">{format(new Date(n.timestamp), 'MMM d, yyyy h:mm a')}</p>
      )}
    </div>
  )
}

// ── Detail sheet ──────────────────────────────────────────────────────────────
function DetailSheet({ n, onClose }) {
  const { emergencyEvents, members, checkIns, riskProfiles } = useApp()
  const c = cfg(n.type)
  const emergencyEvent = n.eventId
    ? emergencyEvents.find(e => e.id === n.eventId)
    : n.type === 'emergency' ? emergencyEvents[0] : null
  const Icon = c.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md glass-elevated rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '88vh' }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 flex-shrink-0 border-b border-gray-100">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            n.type === 'emergency' ? 'bg-rose-100' :
            n.type === 'danger'    ? 'bg-rose-50'  :
            n.type === 'warning'   ? 'bg-amber-50' :
            n.type === 'escalation'? 'bg-orange-50': 'bg-gray-50'
          }`}>
            <Icon size={18} className={
              n.type === 'emergency' ? 'text-rose-600' :
              n.type === 'danger'    ? 'text-rose-500' :
              n.type === 'warning'   ? 'text-amber-500':
              n.type === 'escalation'? 'text-orange-500':
              n.type === 'success'   ? 'text-emerald-500': 'text-black/75'
            } />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-black">{c.label}</p>
            <p className="text-xs text-black/75 truncate">{n.message.replace(/🚨|⚠️/g, '').trim()}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-8">
          {n.type === 'emergency'      && <EmergencyDetail event={emergencyEvent} />}
          {n.type === 'escalation'     && <EscalationDetail n={n} members={members} checkIns={checkIns} riskProfiles={riskProfiles} />}
          {n.type === 'familyRequest'  && <FamilyRequestDetail n={n} onClose={onClose} />}
          {!['emergency','escalation','familyRequest'].includes(n.type) && <GenericDetail n={n} />}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Swipeable live notification ───────────────────────────────────────────────
function SwipeableNotification({ n, onDismiss, onTap }) {
  const c = cfg(n.type)
  const Icon = c.icon
  const isEmergency = n.type === 'emergency'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0, y: -8 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, x: -320, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      drag="x"
      dragConstraints={{ left: -300, right: 0 }}
      dragElastic={{ left: 0.15, right: 0.02 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -72 || info.velocity.x < -600) onDismiss()
      }}
      whileDrag={{ cursor: 'grabbing' }}
      style={{ touchAction: 'pan-y' }}
    >
      <button
        onClick={onTap}
        className="w-full flex items-center gap-0 rounded-2xl overflow-hidden select-none text-left active:opacity-90 transition-opacity"
        style={isEmergency ? {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          border: '1px solid rgba(220,38,38,0.6)',
          boxShadow: '0 4px 20px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
        } : {
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${c.border}`,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {/* Left accent strip — only for non-emergency */}
        {!isEmergency && (
          <div
            className="w-1 self-stretch flex-shrink-0"
            style={{ background: c.accent, minHeight: 44 }}
          />
        )}

        <div className="flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            {isEmergency && (
              <motion.span
                className="absolute inset-0 rounded-full bg-white/30"
                animate={{ scale: [1, 1.9], opacity: [0.3, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            <Icon
              size={15}
              style={{ color: isEmergency ? 'white' : c.accent }}
              strokeWidth={2.4}
              className="relative"
            />
          </div>

          {/* Message */}
          <p className={`text-xs font-semibold flex-1 leading-snug line-clamp-2 ${isEmergency ? 'text-white' : 'text-black'}`}>
            {n.message}
          </p>

          {/* Tap hint */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span className={`text-[9px] font-bold ${isEmergency ? 'text-white/60' : 'text-black/75'}`}>tap</span>
            <ChevronRight size={11} className={isEmergency ? 'text-white/60' : 'text-black/75'} />
          </div>
        </div>
      </button>
    </motion.div>
  )
}

// ── Notification centre (full list) ──────────────────────────────────────────
function NotifCentre({ dismissed, onTap, onClear, onClearAll, onClose }) {
  const { notifications, currentUser } = useApp()

  // Only show this user's notifications
  const myNotifs  = notifications.filter(n => !n.forUserId || n.forUserId === currentUser?.id)
  const active   = myNotifs.filter(n => !dismissed.has(n.id))
  const archived = myNotifs.filter(n =>  dismissed.has(n.id))

  function NotifRow({ n, faded }) {
    const c = cfg(n.type)
    const Icon = c.icon
    return (
      <div className={`flex items-start gap-3 glass-card rounded-2xl p-3.5 transition-opacity ${
        faded ? 'opacity-40' : ''
      }`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
          n.type === 'emergency' ? 'bg-rose-100' :
          n.type === 'danger'    ? 'bg-rose-50'  :
          n.type === 'warning'   ? 'bg-amber-50' :
          n.type === 'escalation'? 'bg-orange-50':
          n.type === 'success'   ? 'bg-emerald-50': 'bg-gray-50'
        }`}>
          <Icon size={14} className={
            n.type === 'emergency' ? 'text-rose-600' :
            n.type === 'danger'    ? 'text-rose-500' :
            n.type === 'warning'   ? 'text-amber-500':
            n.type === 'escalation'? 'text-orange-500':
            n.type === 'success'   ? 'text-emerald-500': 'text-black/75'
          } />
        </div>
        <button className="flex-1 min-w-0 text-left" onClick={() => onTap(n)}>
          <p className="text-xs font-semibold text-black leading-snug mb-0.5">{n.message.replace(/🚨|⚠️/g, '').trim()}</p>
          <p className="text-[10px] text-black/75">{c.label}{n.timestamp ? ' · ' + tsLabel(n.timestamp) : ''}</p>
        </button>
        <button
          onClick={() => onClear(n.id)}
          className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-rose-50 hover:text-rose-400 transition-colors"
        >
          <X size={11} className="text-black/75" />
        </button>
      </div>
    )
  }

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
        style={{ maxHeight: '85vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-black/6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-black/75" />
            <p className="text-sm font-extrabold text-black">Notifications</p>
            {myNotifs.length > 0 && (
              <span className="text-[10px] font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded-full">
                {myNotifs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {myNotifs.length > 0 && (
              <button
                onClick={onClearAll}
                className="flex items-center gap-1 text-xs font-semibold text-black/75 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={12} /> Clear all
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {myNotifs.length === 0 ? (
            <div className="text-center py-16">
              <Bell size={40} className="mx-auto text-black/20 mb-3" />
              <p className="text-sm font-semibold text-black/75">All clear</p>
              <p className="text-xs text-black/75 mt-1">No notifications yet</p>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider mb-2">New</p>
                  <div className="space-y-2">
                    {active.map(n => <NotifRow key={n.id} n={n} faded={false} />)}
                  </div>
                </div>
              )}
              {archived.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider mb-2">Earlier</p>
                  <div className="space-y-2">
                    {archived.map(n => <NotifRow key={n.id} n={n} faded />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function NotificationBanner() {
  const {
    notifications, dismissNotification,
    notifCentreOpen, setNotifCentreOpen, currentUser,
  } = useApp()

  // Local "swiped away" set — hides from live feed but keeps in centre
  const [dismissed, setDismissed] = useState(() => new Set())
  const [activeNotif, setActiveNotif] = useState(null)

  // Only show notifications that belong to the current user (or unscoped legacy ones)
  const myNotifs  = notifications.filter(n => !n.forUserId || n.forUserId === currentUser?.id)

  // Live feed = not yet swiped
  const liveFeed = myNotifs.filter(n => !dismissed.has(n.id))

  function handleSwipe(id) {
    setDismissed(prev => new Set([...prev, id]))
  }

  function handleClear(id) {
    dismissNotification(id)
    setDismissed(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  function handleClearAll() {
    myNotifs.forEach(n => dismissNotification(n.id))
    setDismissed(new Set())
  }

  function handleCentreClose() {
    setNotifCentreOpen(false)
  }

  function handleTap(n) {
    // AI streak notifications → navigate to AI tab and pre-seed conversation
    if (n.type === 'ai-streak') {
      const { category, bodyArea, days, symptomIds } = n.streakData || {}
      sessionStorage.setItem('kaapu-pending-ai', JSON.stringify({ category, bodyArea, days, symptomIds: symptomIds || [] }))
      window.dispatchEvent(new CustomEvent('kaapu:navigate', { detail: { path: '/ai' } }))
      handleSwipe(n.id)
      return
    }
    // Weekly insight → navigate to AI tab with insight pre-loaded
    if (n.type === 'ai-weekly-insight') {
      const { insight } = n.insightData || {}
      if (insight) {
        sessionStorage.setItem('kaapu-pending-weekly-insight', JSON.stringify({ insight }))
      }
      window.dispatchEvent(new CustomEvent('kaapu:navigate', { detail: { path: '/ai' } }))
      handleSwipe(n.id)
      return
    }
    setActiveNotif(n)
  }

  return (
    <>
      {/* Live feed overlay — floats below header, never pushes content */}
      <div
        className="fixed left-0 right-0 z-40 px-4 pt-2 space-y-1.5 pointer-events-none"
        style={{ top: 68, maxWidth: 512, margin: '0 auto' }}
      >
        <AnimatePresence mode="popLayout">
          {liveFeed.map(n => (
            <div key={n.id} className="pointer-events-auto">
              <SwipeableNotification
                n={n}
                onDismiss={() => handleSwipe(n.id)}
                onTap={() => handleTap(n)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail sheet */}
      <AnimatePresence>
        {activeNotif && (
          <DetailSheet n={activeNotif} onClose={() => setActiveNotif(null)} />
        )}
      </AnimatePresence>

      {/* Notification centre */}
      <AnimatePresence>
        {notifCentreOpen && (
          <NotifCentre
            dismissed={dismissed}
            onTap={n => { setNotifCentreOpen(false); handleTap(n) }}
            onClear={handleClear}
            onClearAll={handleClearAll}
            onClose={handleCentreClose}
          />
        )}
      </AnimatePresence>
    </>
  )
}
