import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings2, X, Check, Clock, UserCheck, UserX, Ruler, Weight, MapPin, User } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { useApp } from '../context/AppContext'
import { SYMPTOM_CATEGORIES, FEELING_CONFIG } from '../data/mockData'
import { Avatar } from '../components/Family/FamilySwitcher'
import { supabase, supabaseReady } from '../supabase'
import { severityLabel, SEVERITY_HIGH_THRESHOLD, SEVERITY_MID_THRESHOLD } from '../utils/severity'
import { getConditionIcon } from '../components/Conditions/conditionIcons'
import medPillFilledIcon from '../assets/icons/med-pill.svg'

// ── Shared helper ─────────────────────────────────────────────────────────────
function formatUID(val) {
  const d = val.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
}

const RELATIONSHIPS = ['Partner','Spouse','Child','Parent','Sibling','Grandparent','Carer','Friend','Other']

// ── Member badge (plain — no X) ───────────────────────────────────────────────
function MemberBadge({ member, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border-2 transition-all flex-shrink-0 ${
        active ? 'border-primary-500 bg-primary-50' : 'border-black/8 bg-white/60 backdrop-blur hover:border-black/14'
      }`}
    >
      <Avatar member={member} size="sm" />
      <div className="text-left">
        <p className={`text-xs font-bold leading-none ${active ? 'text-primary-700' : 'text-black/80'}`}>
          {member.name.split(' ')[0]}
        </p>
        <p className="text-[10px] text-black/75 mt-0.5">{member.relationship}</p>
      </div>
    </button>
  )
}

// ── Manage sheet ──────────────────────────────────────────────────────────────
function ManageSheet({ onClose }) {
  const {
    myFamilyMembers, removeMember, currentMember,
    sendFamilyRequest, familyRequests, currentUser,
    respondFamilyRequest,
  } = useApp()

  const [uid,          setUid]          = useState('')
  const [relationship, setRelationship] = useState('Partner')
  const [result,       setResult]       = useState(null) // { ok, error, name }
  const [confirmRm,    setConfirmRm]    = useState(null)
  const [tab,          setTab]          = useState('members') // 'members' | 'add'

  // Requests sent BY current user (outgoing) — hide disconnected ones
  const outgoing = familyRequests.filter(
    r => r.fromUserId === currentUser?.id && r.status !== 'disconnected'
  )

  // Requests received BY current user (incoming) — pending only, not disconnected
  const incoming = familyRequests.filter(
    r => r.toUserId === currentUser?.id && r.status === 'pending'
  )

  async function handleSend() {
    if (uid.length < 11) return
    const res = await sendFamilyRequest(uid, relationship)
    setResult(res)
    if (res?.ok) setUid('')
  }

  function handleRemove(id) {
    if (confirmRm === id) {
      removeMember(id)
      setConfirmRm(null)
    } else {
      setConfirmRm(id)
    }
  }

  function statusPill(status) {
    if (status === 'pending')  return <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Pending</span>
    if (status === 'accepted') return <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Accepted</span>
    return <span className="text-[9px] font-bold text-black/75 bg-gray-100 px-1.5 py-0.5 rounded-full">Declined</span>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md glass-elevated rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-black/6 flex-shrink-0">
          <p className="text-sm font-extrabold text-black">Manage Family</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mx-5 my-3 gap-1 flex-shrink-0">
          {[['members', 'Members'], ['add', 'Add by ID']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setResult(null) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                tab === id ? 'bg-white text-black shadow-sm' : 'text-black/75 hover:text-black/75'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* ── Members tab ── */}
          {tab === 'members' && (
            <div className="space-y-4">
              {/* Incoming requests */}
              {incoming.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider mb-2">Connection Requests</p>
                  <div className="space-y-2">
                    {incoming.map(r => (
                      <div key={r.id} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-xs font-extrabold text-indigo-600 flex-shrink-0">
                            {r.fromUserName.slice(0,2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-black">{r.fromUserName}</p>
                            <p className="text-[10px] text-black/75 font-mono">{r.fromUserUid}</p>
                            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                              Wants to add you as: <span className="font-extrabold">{r.relationship}</span>
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
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-black/75 text-xs font-semibold"
                          >
                            <UserX size={12} /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current members */}
              <div>
                <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider mb-2">Current Members</p>
                <div className="space-y-2">
                  {myFamilyMembers.map(m => {
                    const isSelf = m.id === currentMember?.id || m.relationship === 'Self'
                    return (
                      <div key={m.id} className="flex items-center gap-3 glass-card rounded-2xl p-3">
                        <Avatar member={m} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-black">{m.name}</p>
                          <p className="text-xs text-black/75">{m.relationship}{m.age ? ` · ${m.age}yo` : m.age === null || m.age === undefined ? '' : ''}</p>
                        </div>
                        {isSelf ? (
                          <span className="text-[10px] font-semibold text-primary-500 bg-primary-50 px-2 py-1 rounded-full">You</span>
                        ) : confirmRm === m.id ? (
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-rose-500 font-bold">Remove?</p>
                            <button onClick={() => handleRemove(m.id)}
                              className="text-[10px] font-bold text-white bg-rose-500 px-2 py-1 rounded-lg">Yes</button>
                            <button onClick={() => setConfirmRm(null)}
                              className="text-[10px] font-bold text-black/75 bg-gray-200 px-2 py-1 rounded-lg">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRm(m.id)}
                            className="text-[10px] font-semibold text-rose-400 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-xl hover:bg-rose-100 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Outgoing requests */}
              {outgoing.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-black/75 uppercase tracking-wider mb-2">Sent Requests</p>
                  <div className="space-y-2">
                    {outgoing.map(r => (
                      <div key={r.id} className="flex items-center gap-3 glass-card rounded-2xl p-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-xs font-extrabold text-black/75 flex-shrink-0">
                          {r.toUserName.slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-black">{r.toUserName}</p>
                          <p className="text-[10px] text-black/75">{r.relationship} · {format(new Date(r.timestamp), 'MMM d')}</p>
                        </div>
                        {statusPill(r.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Add by ID tab ── */}
          {tab === 'add' && (
            <div className="space-y-5 pt-1">
              {/* Explainer */}
              <div className="glass-card rounded-2xl px-4 py-3 bg-indigo-50/60">
                <p className="text-xs font-bold text-indigo-700 mb-1">How it works</p>
                <p className="text-[11px] text-indigo-500 leading-relaxed">
                  Ask the person to open their profile and share their 9-digit Health ID (e.g.{' '}
                  <span className="font-mono font-bold">847.392.015</span>). Enter it below,
                  choose their relationship to you, then send the request. They'll receive a
                  notification and can accept or decline.
                </p>
              </div>

              {/* UID input */}
              <div>
                <label className="text-xs font-semibold text-black/75 block mb-1.5">Their Health ID</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="xxx.xxx.xxx"
                  value={uid}
                  onChange={e => setUid(formatUID(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono tracking-widest focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-center"
                  maxLength={11}
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="text-xs font-semibold text-black/75 block mb-1">This person is my…</label>
                <p className="text-[10px] text-black/75 mb-2">e.g. selecting "Parent" means they are your parent</p>
                <div className="flex flex-wrap gap-1.5">
                  {RELATIONSHIPS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRelationship(r)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border-2 transition-all ${
                        relationship === r
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-100 text-black/75 hover:border-gray-200'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>

              {/* Result message */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-xl px-4 py-3 text-xs font-semibold ${
                      result.ok
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}
                  >
                    {result.ok
                      ? `✅ Request sent to ${result.targetName}! They'll receive a notification.`
                      : `❌ ${result.error}`}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={uid.length < 11}
                className="w-full py-3.5 rounded-2xl bg-primary-600 text-white font-extrabold text-sm disabled:opacity-40 transition-opacity"
              >
                Send Connection Request
              </button>

            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Health tracking sub-components ────────────────────────────────────────────
function symptomDurationLabel(symptom) {
  if (!symptom.resolved) {
    // Show actual start date instead of stale user-entered text like "Just started"
    if (symptom.timestamp) {
      const start = new Date(symptom.timestamp)
      return isToday(start) ? 'Started today' : `Since ${format(start, 'MMM d')}`
    }
    return 'Active'
  }
  if (!symptom.resolvedAt) return 'Resolved'
  const start = new Date(symptom.timestamp);  start.setHours(0,0,0,0)
  const end   = new Date(symptom.resolvedAt); end.setHours(0,0,0,0)
  const days  = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  if (days <= 1) return 'Lasted less than a day'
  return `Lasted ${days} day${days !== 1 ? 's' : ''}`
}

function SymptomRow({ symptom }) {
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === symptom.category)
  const sev = symptom.severity
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <span className="text-base">{cat?.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-black">{symptom.bodyLabel}</p>
          {symptom.resolved && (
            <span className="text-[9px] bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full">Resolved</span>
          )}
        </div>
        <p className="text-[10px] text-black/75">
          {symptom.type} · {symptomDurationLabel(symptom)} · {isToday(new Date(symptom.timestamp)) ? 'Today' : format(new Date(symptom.timestamp), 'MMM d')}
        </p>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
        sev >= SEVERITY_HIGH_THRESHOLD ? 'bg-rose-100 text-rose-600' : sev >= SEVERITY_MID_THRESHOLD ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
      }`}>{severityLabel(sev)}</span>
    </div>
  )
}

function MoodRow({ checkIn }) {
  const cfg = FEELING_CONFIG[checkIn.feeling]
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <span className="text-xl">{cfg.emoji}</span>
      <div className="flex-1">
        <p className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
        {checkIn.notes && <p className="text-[10px] text-black/75 mt-0.5">{checkIn.notes}</p>}
      </div>
      <p className="text-[10px] text-black/75">{isToday(new Date(checkIn.date)) ? 'Today' : format(new Date(checkIn.date), 'MMM d')}</p>
    </div>
  )
}

function MemberProfile({ member, symptoms: localSymptoms, checkIns: localCheckIns }) {
  const { conditions: allConditions, medications: allMedications, currentUser } = useApp()
  // Show height/weight only if viewing the current user's own member record
  const isSelf = member.userId === currentUser?.id
  const [tab,            setTab]            = useState('overview')
  const [remoteSymptoms, setRemoteSymptoms] = useState(null) // null = not yet fetched
  const [remoteCheckIns, setRemoteCheckIns] = useState(null)
  const [loadingRemote,  setLoadingRemote]  = useState(false)

  // If this member belongs to a connected account (has linkedFamilyId + userId),
  // fetch their data from Supabase instead of relying on local state (which only
  // has data for the current user's own family).
  useEffect(() => {
    setTab('overview')
    setRemoteSymptoms(null)
    setRemoteCheckIns(null)

    if (!supabaseReady || !supabase) return
    if (!member.linkedFamilyId || !member.userId) return

    let cancelled = false
    setLoadingRemote(true)

    async function fetchRemote() {
      try {
        // 1. Find the member's self-record via SECURITY DEFINER RPC
        // (direct table query blocked by RLS — members policy is own-family only)
        const { data: selfMembers, error: memErr } = await supabase.rpc(
          'get_connected_member',
          { target_family_id: member.linkedFamilyId, target_user_id: member.userId }
        )
        if (memErr) console.error('[get_connected_member]', memErr.message)
        const selfMember = selfMembers?.[0]
        if (!selfMember || cancelled) return

        // 2. Fetch symptoms and check-ins via SECURITY DEFINER RPCs
        // (direct table queries blocked by RLS — own-family-only policies)
        const [sympRes, ciRes] = await Promise.all([
          supabase.rpc('get_connected_symptoms', {
            target_family_id: member.linkedFamilyId,
            target_member_id: selfMember.id,
          }),
          supabase.rpc('get_connected_checkins', {
            target_family_id: member.linkedFamilyId,
            target_member_id: selfMember.id,
          }),
        ])
        if (sympRes.error) console.error('[get_connected_symptoms]', sympRes.error.message)
        if (ciRes.error)   console.error('[get_connected_checkins]',  ciRes.error.message)

        if (cancelled) return
        setRemoteSymptoms(sympRes.data || [])
        setRemoteCheckIns((ciRes.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)))
      } catch (err) {
        console.error('[fetchRemote connected]', err)
        if (!cancelled) { setRemoteSymptoms([]); setRemoteCheckIns([]) }
      } finally {
        if (!cancelled) setLoadingRemote(false)
      }
    }

    fetchRemote()
    return () => { cancelled = true }
  }, [member.id, member.linkedFamilyId, member.userId])

  // Use remote data for connected accounts; fall back to local for self / demo
  const symptoms  = remoteSymptoms ?? localSymptoms
  const checkIns  = remoteCheckIns ?? localCheckIns

  const active   = symptoms.filter(s => !s.resolved)
  const resolved = symptoms.filter(s => s.resolved)
  const highSev  = active.filter(s => s.severity >= SEVERITY_HIGH_THRESHOLD)

  // Conditions & medications for this member (local family only; connected members don't share this data)
  const memberConditions  = allConditions.filter(c => c.memberId === member.id)
  const memberMedications = allMedications.filter(m => m.memberId === member.id)
    .filter((m, i, arr) =>
      arr.findIndex(x => x.name.toLowerCase().replace(/[^a-z0-9]/g, '') === m.name.toLowerCase().replace(/[^a-z0-9]/g, '')) === i
    )

  const [sortField,   setSortField]   = useState('date')
  const [sortDir,     setSortDir]     = useState('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const SORT_OPTIONS = [
    { id: 'date',     label: 'Date' },
    { id: 'name',     label: 'Name' },
    { id: 'severity', label: 'Severity' },
  ]

  function pickSort(field) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
    setShowSortMenu(false)
  }

  const sortedSymptoms = [...active, ...resolved].sort((a, b) => {
    let cmp = 0
    if (sortField === 'date')     cmp = new Date(a.timestamp) - new Date(b.timestamp)
    if (sortField === 'name')     cmp = (a.bodyLabel || '').localeCompare(b.bodyLabel || '')
    if (sortField === 'severity') cmp = a.severity - b.severity
    return sortDir === 'desc' ? -cmp : cmp
  })

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'symptoms', label: `Symptoms (${symptoms.length})` },
  ]

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar member={member} size="lg" />
          <div>
            <p className="font-extrabold text-black">{member.name}</p>
            <p className="text-xs text-black/75">
              {[
                member.relationship !== 'Self' ? member.relationship : null,
                member.age > 0 ? `${member.age}yo` : null,
                member.gender && member.gender !== 'other' ? member.gender : null,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Bio chips */}
        <div className="flex flex-wrap gap-2">
          {member.age > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-black/75 px-2.5 py-1 rounded-full">
              <User size={11} /> {member.age} yrs
            </span>
          )}
          {member.gender && member.gender !== 'other' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-black/75 px-2.5 py-1 rounded-full capitalize">
              <User size={11} /> {member.gender}
            </span>
          )}
          {member.relationship && member.relationship !== 'Self' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary-50 text-primary-600 px-2.5 py-1 rounded-full">
              {member.relationship}
            </span>
          )}
          {isSelf && currentUser?.heightCm && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full">
              <Ruler size={11} />
              {currentUser.units === 'imperial'
                ? `${Math.floor(currentUser.heightCm / 30.48)}ft ${Math.round((currentUser.heightCm / 2.54) % 12)}in`
                : `${currentUser.heightCm} cm`}
            </span>
          )}
          {isSelf && currentUser?.weightKg && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
              <Weight size={11} />
              {currentUser.units === 'imperial'
                ? `${Math.round(currentUser.weightKg * 2.20462)} lbs`
                : `${currentUser.weightKg} kg`}
            </span>
          )}
          {member.bloodType && member.bloodType !== 'Unknown' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full">
              🩸 {member.bloodType}
            </span>
          )}
          {isSelf && (currentUser?.homeLocation ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-black/75 px-2.5 py-1 rounded-full">
              <MapPin size={11} /> {currentUser.homeLocation}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-black/75 px-2.5 py-1 rounded-full">
              <MapPin size={11} /> Location not set
            </span>
          ))}
          {/* Active symptom count badge */}
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            active.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {active.length > 0 ? `⚠️ ${active.length} active` : '✓ No active symptoms'}
          </span>
        </div>
      </div>

      {highSev.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-start gap-2">
          <span>⚠️</span>
          <p className="text-xs text-rose-700 font-medium">
            {highSev.length} high-severity symptom{highSev.length > 1 ? 's' : ''} logged. Consider following up with {member.name.split(' ')[0]}.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex flex-1 glass-card rounded-2xl p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-black/75'
              }`}>{t.label}</button>
          ))}
        </div>

        {/* Sort button — only visible on Symptoms tab */}
        <AnimatePresence>
          {tab === 'symptoms' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              className="relative flex-shrink-0"
            >
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all ${
                  showSortMenu
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-black/75 border-gray-200'
                }`}
              >
                Sort
                <span className="text-[10px] opacity-70">{sortDir === 'desc' ? '↓' : '↑'}</span>
              </button>

              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden min-w-[130px]"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => pickSort(opt.id)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors ${
                          sortField === opt.id ? 'bg-primary-50 text-primary-700' : 'text-black/75 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                        {sortField === opt.id && (
                          <span className="text-[11px] ml-2">{sortDir === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={loadingRemote ? 'loading' : tab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
          {loadingRemote ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
            </div>
          ) : tab === 'overview' ? (
            <div className="space-y-3">
              {/* Active symptoms only */}
              {active.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-black/75 mb-2">Active Symptoms</p>
                  <div className="space-y-2">{active.map(s => <SymptomRow key={s.id} symptom={s} />)}</div>
                </div>
              ) : (
                <div className="text-center py-8 glass-card rounded-2xl">
                  <p className="text-3xl mb-2">💚</p>
                  <p className="text-sm font-semibold text-black/75">No active symptoms</p>
                  <p className="text-xs text-black/75 mt-1">All looking good right now</p>
                </div>
              )}

              {/* Conditions */}
              {memberConditions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-black/75 mb-2">Conditions</p>
                  <div className="glass-card rounded-2xl divide-y divide-gray-50">
                    {memberConditions.map(c => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(79,70,229,0.1)' }}>
                          <img src={getConditionIcon(c)} alt="" className="w-[18px] h-[18px]" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-black">{c.name}</p>
                          {c.diagnosedDate && (
                            <p className="text-[10px] text-black/75">Since {new Date(c.diagnosedDate).getFullYear()}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          c.severity === 'severe'   ? 'bg-rose-100 text-rose-700' :
                          c.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>{c.severity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {memberMedications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-black/75 mb-2">Medications</p>
                  <div className="glass-card rounded-2xl divide-y divide-gray-50">
                    {memberMedications.map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <img src={medPillFilledIcon} alt="" className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-black truncate">{m.name}</p>
                          <p className="text-[10px] text-black/75">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSymptoms.length === 0 ? (
                <div className="text-center py-10 glass-card rounded-2xl">
                  <p className="text-sm text-black/75">No symptoms logged</p>
                </div>
              ) : (
                sortedSymptoms.map(s => <SymptomRow key={s.id} symptom={s} />)
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Family() {
  const { myFamilyMembers, symptoms, checkIns } = useApp()
  const [activeIdx,   setActiveIdx]   = useState(0)
  const [showManage,  setShowManage]  = useState(false)

  const safeIdx      = Math.min(activeIdx, Math.max(0, myFamilyMembers.length - 1))
  const activeMember = myFamilyMembers[safeIdx]

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div data-tour="family-header">
          <h2 className="text-lg font-extrabold text-black">Connected Accounts</h2>
          <p className="text-xs text-black/75 mt-0.5">{myFamilyMembers.length} member{myFamilyMembers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          data-tour="family-manage-btn"
          onClick={() => setShowManage(true)}
          className="flex items-center gap-1 text-xs font-semibold bg-[rgba(79,70,229,0.1)] text-[#4f46e5] border border-black/10 px-2.5 py-1.5 rounded-full hover:opacity-80 transition-colors"
        >
          <Settings2 size={13} /> Manage
        </button>
      </div>

      {/* Member tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        {myFamilyMembers.map((m, i) => (
          <MemberBadge
            key={m.id}
            member={m}
            active={i === safeIdx}
            onClick={() => setActiveIdx(i)}
          />
        ))}
      </div>

      {/* Selected member profile */}
      <AnimatePresence mode="wait">
        {activeMember && (
          <motion.div key={activeMember.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <MemberProfile
              member={activeMember}
              symptoms={symptoms.filter(s => s.memberId === activeMember.id)}
              checkIns={checkIns.filter(c => c.memberId === activeMember.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManage && <ManageSheet onClose={() => setShowManage(false)} />}
      </AnimatePresence>
    </div>
  )
}
