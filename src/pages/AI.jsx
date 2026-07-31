import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, RefreshCw, ChevronDown, History, X, MessageSquare, AlertTriangle, BookmarkCheck, Loader2, CheckCircle, PlusCircle, Trash2, FileText, Mic, MicOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase, supabaseReady } from '../supabase'
import { useNavigate } from 'react-router-dom'
import { generateGPReport } from '../utils/gpReport'

const MAX_HISTORY = 20

const SUGGESTIONS = [
  'What are my current medications for?',
  'Explain my health conditions in simple terms',
  'What lifestyle changes help with my conditions?',
  'Are there any interactions between my medications?',
  'What symptoms should I watch out for?',
  'How can I improve my sleep quality?',
]

// ── Per-user localStorage fallback key ───────────────────────────────────────
function lsKey(userId) { return `kaapu-chat-history-${userId}` }

// ── Load history list ────────────────────────────────────────────────────────
async function loadHistory(userId) {
  if (supabaseReady && supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('chatSessions')
        .select('id, preview, messages, createdAt')
        .eq('userId', userId)
        .order('updatedAt', { ascending: false })
        .limit(MAX_HISTORY)
      if (!error && data) return data.map(r => ({
        id: r.id,
        timestamp: new Date(r.createdAt).getTime(),
        preview: r.preview,
        messages: r.messages,
      }))
    } catch (_) {}
  }
  try { return JSON.parse(localStorage.getItem(lsKey(userId)) || '[]') } catch { return [] }
}

// ── Load a single session by ID (for re-opening a streak chat) ───────────────
async function loadSessionById(sessionId, userId) {
  if (!sessionId || !userId) return null
  if (supabaseReady && supabase) {
    try {
      const { data, error } = await supabase
        .from('chatSessions')
        .select('messages')
        .eq('id', sessionId)
        .eq('userId', userId)
        .single()
      if (!error && data?.messages?.length) return data.messages
    } catch (_) {}
  }
  // localStorage fallback
  try {
    const sessions = JSON.parse(localStorage.getItem(lsKey(userId)) || '[]')
    const found = sessions.find(s => s.id === sessionId)
    return found?.messages || null
  } catch { return null }
}

// ── Upsert session by ID (auto-save after every AI reply) ───────────────────
async function upsertSession(sessionId, messages, userId) {
  if (!sessionId || messages.length < 1 || !userId) return
  const firstMsg = messages.find(m => m.role === 'user') || messages[0]
  const preview  = (firstMsg?.content || '').slice(0, 120)
  const now      = new Date().toISOString()
  const rows     = messages.map(({ role, content, timestamp }) => ({ role, content, timestamp }))

  if (supabaseReady && supabase) {
    try {
      await supabase.from('chatSessions').upsert(
        { id: sessionId, userId, preview, messages: rows, updatedAt: now, createdAt: now },
        { onConflict: 'id' }
      )
      return
    } catch (_) {}
  }
  // localStorage fallback
  try {
    const sessions = JSON.parse(localStorage.getItem(lsKey(userId)) || '[]')
    const idx      = sessions.findIndex(s => s.id === sessionId)
    const entry    = { id: sessionId, timestamp: Date.now(), preview, messages }
    const updated  = idx >= 0
      ? [entry, ...sessions.filter((_, i) => i !== idx)]
      : [entry, ...sessions]
    localStorage.setItem(lsKey(userId), JSON.stringify(updated.slice(0, MAX_HISTORY)))
  } catch (_) {}
}

// ── Save a brand-new session (no pre-existing ID) ────────────────────────────
async function saveSession(messages, userId) {
  if (messages.length < 2 || !userId) return
  const id = `chat-${userId}-${Date.now()}`
  await upsertSession(id, messages, userId)
  return id
}

// ── Delete a session by ID ───────────────────────────────────────────────────
async function deleteSession(sessionId, userId) {
  if (!sessionId || !userId) return
  if (supabaseReady && supabase) {
    try { await supabase.from('chatSessions').delete().eq('id', sessionId).eq('userId', userId) } catch (_) {}
  }
  // Also remove from localStorage fallback
  try {
    const sessions = JSON.parse(localStorage.getItem(lsKey(userId)) || '[]')
    localStorage.setItem(lsKey(userId), JSON.stringify(sessions.filter(s => s.id !== sessionId)))
  } catch (_) {}
}

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
        <Sparkles size={13} className="text-primary-500" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mb-0.5">
          <Sparkles size={13} className="text-primary-500" />
        </div>
      )}
      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
        }`}>
          {isUser ? msg.content : (
            <span>
              {msg.content.split('\n').map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-300 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

// ── Action chip shown below an AI message ────────────────────────────────────
function ActionChip({ action, onResolve, onLog, onGpReport, gpReportLoading, done }) {
  if (!action || done) return null
  if (action === 'resolve') return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={onResolve}
      className="flex items-center gap-1.5 ml-9 mt-1 mb-2 px-3 py-1.5 rounded-2xl text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm"
    >
      <CheckCircle size={12} /> Mark as resolved
    </motion.button>
  )
  if (action === 'log') return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={onLog}
      className="flex items-center gap-1.5 ml-9 mt-1 mb-2 px-3 py-1.5 rounded-2xl text-[11px] font-semibold bg-primary-50 border border-primary-200 text-primary-700 shadow-sm"
    >
      <PlusCircle size={12} /> Log new symptom
    </motion.button>
  )
  if (action === 'gp-report') return (
    <motion.button
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={onGpReport}
      disabled={gpReportLoading}
      className="flex items-center gap-1.5 ml-9 mt-1 mb-2 px-3 py-1.5 rounded-2xl text-[11px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm disabled:opacity-60"
    >
      {gpReportLoading
        ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
        : <><FileText size={12} /> Download GP visit report</>
      }
    </motion.button>
  )
  return null
}

// ── History sheet (modal) ────────────────────────────────────────────────────
function HistorySheet({ onClose, onRestore, userId }) {
  const [sessions,    setSessions]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [confirmId,   setConfirmId]   = useState(null) // session pending delete confirm

  useEffect(() => {
    loadHistory(userId)
      .then(s => { setSessions(s); setLoading(false) })
      .catch(() => { setSessions([]); setLoading(false) })
  }, [userId])

  function handleDelete(e, sessionId) {
    e.stopPropagation()
    if (confirmId === sessionId) {
      // Second tap — confirmed, delete
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      deleteSession(sessionId, userId)
      setConfirmId(null)
    } else {
      // First tap — ask for confirm
      setConfirmId(sessionId)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center px-5"
      onClick={e => { if (e.target === e.currentTarget) { setConfirmId(null); onClose() } }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setConfirmId(null); onClose() }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-sm rounded-3xl bg-white overflow-hidden shadow-xl"
        style={{ maxHeight: '75vh' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-extrabold text-gray-800">Chat History</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 60px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <MessageSquare size={28} className="text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-400">No past chats yet</p>
              <p className="text-xs text-gray-300 mt-1">Your conversations will appear here</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {sessions.map(session => {
                const isConfirming = confirmId === session.id
                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.18 }}
                    className="border-b border-gray-50 last:border-0"
                  >
                    {/* Normal row */}
                    <div className={`flex items-center gap-2 px-4 py-3 transition-colors ${isConfirming ? 'bg-rose-50' : 'hover:bg-gray-50'}`}>
                      <button
                        className="flex-1 min-w-0 text-left"
                        onClick={() => { setConfirmId(null); onRestore(session.messages, session.id); onClose() }}
                      >
                        <p className={`text-xs font-semibold truncate mb-0.5 ${isConfirming ? 'text-rose-700' : 'text-gray-700'}`}>{session.preview}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(session.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          {' · '}
                          {Math.ceil(session.messages.length / 2)} exchanges
                        </p>
                      </button>
                      <button
                        onClick={e => handleDelete(e, session.id)}
                        className={`shrink-0 p-1.5 rounded-xl transition-colors ${isConfirming ? 'text-rose-400' : 'text-gray-300 hover:text-rose-400'}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Confirmation banner — slides in below the row */}
                    <AnimatePresence>
                      {isConfirming && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 mb-3 mt-1 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                            <p className="text-[11px] font-semibold text-rose-700 mb-0.5">Delete this conversation?</p>
                            <p className="text-[10px] text-rose-400 mb-3 leading-relaxed">This can't be undone. Kaapu will permanently forget this chat and it won't influence future responses.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={e => handleDelete(e, session.id)}
                                className="flex-1 py-1.5 rounded-xl bg-rose-500 text-white text-[11px] font-bold"
                              >
                                Yes, delete it
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmId(null) }}
                                className="flex-1 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-500 text-[11px] font-semibold"
                              >
                                Keep it
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onSuggest }) {
  return (
    <div data-tour="ai-page" className="flex flex-col items-center px-4 pt-6 pb-4 max-w-lg mx-auto w-full">
      <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <Sparkles size={26} className="text-primary-500" />
      </div>
      <h2 className="text-base font-extrabold text-gray-800 mb-1">Ask Kaapu</h2>
      <p className="text-xs text-gray-400 text-center mb-6 max-w-xs leading-relaxed">
        Your personal health assistant. Ask about your conditions, medications, symptoms, or general wellness.
      </p>
      <div className="w-full grid grid-cols-2 gap-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggest(s)}
            className="text-left bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-[11px] font-medium text-gray-600 leading-tight shadow-sm hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main AI page ─────────────────────────────────────────────────────────────
export default function AI() {
  const { currentUser, currentMember, conditions, medications, symptoms, updateSymptom, resolveSymptom } = useApp()
  const userId   = currentUser?.id
  const navigate = useNavigate()
  const [messages,             setMessages]             = useState([])
  const [input,                setInput]                = useState('')
  const [loading,              setLoading]              = useState(false)
  const [error,                setError]                = useState(null)
  const [atBottom,             setAtBottom]             = useState(true)
  const [showHistory,          setShowHistory]          = useState(false)
  const [activeStreakIds,      setActiveStreakIds]       = useState([])
  const [pendingStreak,        setPendingStreak]        = useState(null)
  const [pendingWeeklyInsight, setPendingWeeklyInsight] = useState(null)
  const [savingNotes,          setSavingNotes]          = useState(false)
  const [notesSaved,           setNotesSaved]           = useState(false)
  const [actionDoneIdx,        setActionDoneIdx]        = useState(new Set()) // message indices whose action chip is done
  const [gpReportLoading,      setGpReportLoading]      = useState(false)
  const [isRecording,          setIsRecording]          = useState(false)
  const [voiceMode,            setVoiceMode]            = useState(false)
  const [isSpeaking,           setIsSpeaking]           = useState(false)
  const [continuousVoiceActive, setContinuousVoiceActive] = useState(false)
  const currentSessionId  = useRef(null) // stable ID for the Supabase chat history row
  const agentSessionIdRef = useRef(null) // stable ID for the Managed Agent session
  const bottomRef  = useRef(null)
  const scrollRef  = useRef(null)
  const inputRef   = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  const hasMessages = messages.length > 0

  // Check sessionStorage for pending streak notification on mount
  useEffect(() => {
    const pending = sessionStorage.getItem('kaapu-pending-ai')
    if (!pending) return
    sessionStorage.removeItem('kaapu-pending-ai')
    try {
      const parsed = JSON.parse(pending)
      if (parsed?.category) setPendingStreak(parsed)
    } catch (_) {}
  }, [])

  // Check sessionStorage for pending weekly insight on mount
  useEffect(() => {
    const pending = sessionStorage.getItem('kaapu-pending-weekly-insight')
    if (!pending) return
    sessionStorage.removeItem('kaapu-pending-weekly-insight')
    try {
      const parsed = JSON.parse(pending)
      if (parsed?.insight) setPendingWeeklyInsight(parsed)
    } catch (_) {}
  }, [])

  // Auto-start listening after AI finishes speaking (Siri-like behavior)
  useEffect(() => {
    if (voiceMode && continuousVoiceActive && !isSpeaking && !isRecording && !loading) {
      const timer = setTimeout(() => {
        if (continuousVoiceActive) startListening()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isSpeaking, continuousVoiceActive, voiceMode, isRecording, loading])

  // Append AI-suggested cause notes onto the relevant symptom(s) so they show
  // up under "Notes" in the GP report — see [[note:id:text]] in kaapu-chat.
  // Skips text already present so re-mentioning the same cause in a later
  // turn (or the agent re-emitting a marker) doesn't duplicate the line.
  function applyNoteUpdates(noteUpdates) {
    if (!noteUpdates?.length) return
    noteUpdates.forEach(({ symptomId, text }) => {
      if (!symptomId || !text) return
      const sym = symptoms.find(s => s.id === symptomId)
      if (!sym) return
      if (sym.notes && sym.notes.includes(text)) return
      const existing = sym.notes ? sym.notes + '\n' : ''
      updateSymptom(symptomId, { notes: existing + text })
    })
  }

  async function handleGpReport(msgIdx) {
    if (gpReportLoading) return
    setGpReportLoading(true)
    try {
      await generateGPReport({ currentUser, currentMember, symptoms, conditions, medications })
      setActionDoneIdx(prev => new Set([...prev, msgIdx]))
    } finally {
      setGpReportLoading(false)
    }
  }

  // ── Action chip handlers ──────────────────────────────────────────────────
  function handleResolve(msgIdx) {
    // Resolve all active streak symptom IDs, or fall back to any active symptoms
    const toResolve = activeStreakIds.length
      ? activeStreakIds
      : symptoms.filter(s => s.memberId === currentMember?.id && !s.resolved).map(s => s.id)
    toResolve.forEach(id => resolveSymptom(id))
    setActionDoneIdx(prev => new Set([...prev, msgIdx]))
    // Follow up in chat
    sendMessage('I just marked it as resolved.')
  }

  function handleLogNew(msgIdx) {
    setActionDoneIdx(prev => new Set([...prev, msgIdx]))
    navigate('/body-map')
  }

  // Save session when navigating away or starting a new chat
  async function saveAndClear() {
    if (currentSessionId.current) {
      await upsertSession(currentSessionId.current, messages, userId)
    } else {
      await saveSession(messages, userId)
    }
    currentSessionId.current  = null
    agentSessionIdRef.current = null
    setMessages([])
    setError(null)
    setInput('')
    setActiveStreakIds([])
    setNotesSaved(false)
    setActionDoneIdx(new Set())
  }

  const buildContext = useCallback(() => {
    if (!currentMember) return null
    const memberSymptoms = symptoms.filter(s => s.memberId === currentMember.id)
    const ninetyDaysAgo  = Date.now() - 90 * 24 * 3600000
    return {
      memberName:     currentMember.name,
      conditions:     conditions.filter(c => c.memberId === currentMember.id),
      medications:    medications.filter(m => m.memberId === currentMember.id),
      activeSymptoms: memberSymptoms
        .filter(s => !s.resolved)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      symptomHistory: memberSymptoms
        .filter(s => new Date(s.timestamp).getTime() > ninetyDaysAgo)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(s => ({
          date:        new Date(s.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          category:    s.categoryLabel,
          type:        s.type,
          bodyArea:    s.bodyLabel,
          severity:    s.severity,
          duration:    s.duration || null,
          resolved:    s.resolved,
          resolvedDate: s.resolvedAt ? new Date(s.resolvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null,
          notes:       s.notes || null,
        })),
    }
  }, [currentMember, conditions, medications, symptoms])

  // When currentMember is ready and we have a pending streak, restore or start conversation
  useEffect(() => {
    if (!pendingStreak || !currentMember || !userId || loading) return
    const { category, bodyArea, days, symptomIds, sessionId } = pendingStreak
    setPendingStreak(null)
    setActiveStreakIds(symptomIds || [])

    if (sessionId) {
      // Try to restore the existing session for this streak notification
      loadSessionById(sessionId, userId).then(existingMsgs => {
        if (existingMsgs?.length) {
          // Session exists — restore it
          currentSessionId.current = sessionId
          setMessages(existingMsgs)
        } else {
          // New session — start proactive conversation
          currentSessionId.current = sessionId
          sendSilent(`I've been experiencing ${category} at my ${bodyArea} for ${days} days in a row.`, sessionId)
        }
      })
    } else {
      sendSilent(`I've been experiencing ${category} at my ${bodyArea} for ${days} days in a row.`)
    }
  }, [pendingStreak, currentMember, userId]) // eslint-disable-line

  // When weekly insight is pending and member is ready, inject it as an assistant message
  useEffect(() => {
    if (!pendingWeeklyInsight || !currentMember || !userId || loading) return
    const { insight } = pendingWeeklyInsight
    setPendingWeeklyInsight(null)

    const insightMsg = {
      role:    'assistant',
      content: `✨ **Your Weekly Kaapu Insight**\n\n${insight}`,
    }
    const notifMsg = {
      role:    'user',
      content: '[Weekly insight delivered]',
      hidden:  true, // marker so we can skip it in renders if needed
    }
    // Start a fresh session with the insight as the first assistant message
    const newSessionId = `weekly-${userId}-${new Date().toDateString()}`
    currentSessionId.current = newSessionId
    setMessages([insightMsg])
  }, [pendingWeeklyInsight, currentMember, userId]) // eslint-disable-line

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, atBottom])

  function handleScroll(e) {
    const el = e.currentTarget
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input not supported on this device')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.language = 'en-GB'
    recognition.maxAlternatives = 1

    let hasResult = false
    let silenceTimer = null
    let lastTranscript = ''
    let isProcessing = false

    recognition.onstart = () => {
      setIsRecording(true)
      hasResult = false
      lastTranscript = ''
      isProcessing = false
      if (silenceTimer) clearTimeout(silenceTimer)
    }

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' '
      }
      transcript = transcript.trim()

      if (transcript && event.isFinal) {
        hasResult = true
        isProcessing = true
        setIsRecording(false)
        if (silenceTimer) clearTimeout(silenceTimer)
        recognition.stop()
        sendMessage(transcript)
      } else if (transcript) {
        setInput(transcript)
        lastTranscript = transcript

        if (silenceTimer) clearTimeout(silenceTimer)
        silenceTimer = setTimeout(() => {
          if (lastTranscript && !hasResult && !isProcessing) {
            hasResult = true
            isProcessing = true
            setIsRecording(false)
            recognition.stop()
            sendMessage(lastTranscript)
          }
        }, 2500)
      }
    }

    recognition.onerror = (event) => {
      setIsRecording(false)
      if (silenceTimer) clearTimeout(silenceTimer)
      isProcessing = false
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        console.error('Microphone permission denied or blocked')
      } else if (event.error === 'no-speech') {
        console.error('No speech detected - try speaking louder')
      } else if (event.error === 'network') {
        console.error('Network error in speech recognition')
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
      // Don't restart immediately if we got speech - let the silence timer fire
      if (silenceTimer) {
        // Keep the timer running - don't clear it
      } else if (continuousVoiceActive && !hasResult && !isProcessing) {
        // Only restart if we didn't get any speech at all
        setTimeout(() => {
          if (continuousVoiceActive) startListening()
        }, 300)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (err) {
      console.error('Failed to start recognition:', err)
      setIsRecording(false)
    }
  }

  function toggleVoiceInput() {
    if (continuousVoiceActive) {
      // Stop continuous voice mode
      setContinuousVoiceActive(false)
      if (isRecording) {
        recognitionRef.current?.stop()
        setIsRecording(false)
      }
    } else {
      // Start continuous voice mode
      setContinuousVoiceActive(true)
      startListening()
    }
  }

  async function speakText(text) {
    if (!voiceMode || !supabase) return
    setIsSpeaking(true)
    try {
      const { data, error } = await supabase.functions.invoke('kaapu-tts', {
        body: { text },
      })
      if (error || !data?.audioContent) {
        console.error('TTS error:', error)
        setIsSpeaking(false)
        return
      }

      // Convert base64 to audio buffer
      const binaryString = atob(data.audioContent)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Use Web Audio API for reliable playback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Resume context if suspended (required for some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      try {
        const audioBuffer = await audioContext.decodeAudioData(bytes.buffer)
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)

        source.onended = () => {
          setIsSpeaking(false)
        }

        source.start(0)
      } catch (decodeErr) {
        console.error('Audio decode error:', decodeErr)
        setIsSpeaking(false)
      }
    } catch (err) {
      console.error('speakText error:', err)
      setIsSpeaking(false)
    }
  }

  // Call AI but only show the assistant's response (no user bubble) — used for streak auto-start
  async function sendSilent(content, sessionId) {
    if (!supabase || loading) return
    setError(null)
    setAtBottom(true)
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('kaapu-chat', {
        body: { messages: [{ role: 'user', content }], context: buildContext(), agentSessionId: agentSessionIdRef.current },
      })
      if (fnError || !data?.content) throw new Error('empty')
      if (data.agentSessionId) agentSessionIdRef.current = data.agentSessionId
      applyNoteUpdates(data.noteUpdates)
      const aiMsg = { role: 'assistant', content: data.content, timestamp: Date.now(), action: data.action || null }
      const nextMessages = [aiMsg]
      setMessages(nextMessages)
      // Auto-save immediately so tapping the notification again restores this
      const sid = sessionId || currentSessionId.current
      if (sid) upsertSession(sid, nextMessages, userId)
    } catch (_) {
      // fail silently — user can still type
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function sendMessage(text) {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    setError(null)
    const userMsg    = { role: 'user', content, timestamp: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setAtBottom(true)
    setLoading(true)
    try {
      if (!supabaseReady || !supabase) throw new Error('not_ready')
      const apiMessages = newMessages.map(({ role, content }) => ({ role, content }))
      const { data, error: fnError } = await supabase.functions.invoke('kaapu-chat', {
        body: { messages: apiMessages, context: buildContext(), agentSessionId: agentSessionIdRef.current },
      })
      if (fnError || !data?.content) throw new Error(fnError?.message || 'empty_response')
      if (data.agentSessionId) agentSessionIdRef.current = data.agentSessionId
      applyNoteUpdates(data.noteUpdates)
      const aiMsg = { role: 'assistant', content: data.content, timestamp: Date.now(), action: data.action || null }
      const finalMessages = [...newMessages, aiMsg]
      setMessages(finalMessages)
      // Speak response if in voice mode
      if (voiceMode) {
        setTimeout(() => speakText(data.content), 100)
      }
      // Auto-save after every AI reply — upsert keeps it in the same session row
      if (!currentSessionId.current) currentSessionId.current = `chat-${userId}-${Date.now()}`
      upsertSession(currentSessionId.current, finalMessages, userId)
    } catch (err) {
      console.error('kaapu-chat error:', err)
      setError('Something went wrong. Please try again.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // Summarise conversation and save to symptom notes
  async function handleSaveInsight() {
    if (!activeStreakIds.length || savingNotes || !supabaseReady || !supabase) return
    setSavingNotes(true)
    try {
      const summaryPrompt = 'Please summarise the key health insight from our conversation in exactly 2 concise sentences. Focus on what was reported and any patterns or observations. No formatting — plain text only.'
      const apiMessages = [
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: 'user', content: summaryPrompt },
      ]
      const { data, error: fnError } = await supabase.functions.invoke('kaapu-chat', {
        body: { messages: apiMessages, context: buildContext(), agentSessionId: agentSessionIdRef.current },
      })
      if (fnError || !data?.content) throw new Error('summary_failed')
      const summary = data.content.trim()
      const savedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      const noteText = `[Kaapu insight — ${savedAt}] ${summary}`
      // Save to all related symptoms
      activeStreakIds.forEach(id => {
        const sym = symptoms.find(s => s.id === id)
        const existing = sym?.notes ? sym.notes + '\n' : ''
        updateSymptom(id, { notes: existing + noteText })
      })
      setNotesSaved(true)
    } catch (err) {
      console.error('[save insight]', err)
    } finally {
      setSavingNotes(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage() }
  }

  // Show the "Save insight" button when: streak conversation active + enough exchanges + not yet saved
  const showSaveInsight = activeStreakIds.length > 0 && messages.length >= 4 && !notesSaved

  // Fixed input bottom — at bottom:0, padding-bottom lifts content above nav
  const inputBarStyle = {
    bottom: 0,
    paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
  }

  return (
    <>
      {/* ── Top bar: History + SOS centered, New chat when chatting ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 max-w-lg mx-auto">
        {/* History pill */}
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white/70 border border-gray-100 shadow-sm text-gray-500"
        >
          <History size={15} />
          <span className="text-[11px] font-semibold text-gray-500">History</span>
        </button>

        {/* SOS pill — red gradient + pulse ring, same shape as History */}
        <motion.button
          onClick={() => window.dispatchEvent(new CustomEvent('open-emergency'))}
          className="relative flex items-center gap-1.5 px-3 h-9 rounded-xl overflow-visible"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            className="absolute inset-0 rounded-xl bg-rose-500 -z-10"
            animate={{ scale: [1, 1.18], opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
          <AlertTriangle size={14} className="text-white" strokeWidth={2.5} />
          <span className="text-[11px] font-bold text-white">SOS</span>
        </motion.button>

        {/* Voice Mode toggle */}
        <button
          onClick={() => setVoiceMode(!voiceMode)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border shadow-sm transition-colors ${
            voiceMode
              ? 'bg-primary-50 border-primary-200 text-primary-600'
              : 'bg-white/70 border-gray-100 text-gray-500'
          }`}
        >
          {voiceMode ? <Mic size={15} /> : <MicOff size={15} />}
          <span className="text-[11px] font-semibold">{voiceMode ? 'Voice' : 'Text'}</span>
        </button>
      </div>

      {/* ── Content: static empty state OR scrollable messages ── */}
      {!hasMessages && !loading ? (
        // Static — doesn't scroll
        <EmptyState onSuggest={sendMessage} />
      ) : (
        // Scrollable messages only
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto px-4 pt-2 max-w-lg mx-auto w-full"
          style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px) + 4rem)' }}
        >
          <div className="flex justify-end mb-2">
            <button
              onClick={saveAndClear}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 bg-white border border-gray-100 px-2.5 py-1.5 rounded-xl shadow-sm"
            >
              <RefreshCw size={11} />
              New chat
            </button>
          </div>
          {messages.map((msg, i) => (
            <div key={i}>
              <MessageBubble msg={msg} />
              {msg.role === 'assistant' && msg.action && (
                <ActionChip
                  action={msg.action}
                  done={actionDoneIdx.has(i)}
                  onResolve={() => handleResolve(i)}
                  onLog={() => handleLogNew(i)}
                  onGpReport={() => handleGpReport(i)}
                  gpReportLoading={gpReportLoading}
                />
              )}
            </div>
          ))}
          {loading && <TypingIndicator />}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
              <p className="text-xs text-red-400 font-medium">{error}</p>
            </motion.div>
          )}

          {/* ── Save Kaapu's insight to notes ── */}
          <AnimatePresence>
            {showSaveInsight && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex justify-center mb-4"
              >
                <button
                  onClick={handleSaveInsight}
                  disabled={savingNotes}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-semibold bg-violet-50 border border-violet-200 text-violet-700 shadow-sm disabled:opacity-60 transition-opacity"
                >
                  {savingNotes
                    ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                    : <><BookmarkCheck size={13} /> Save Kaapu's insight to notes</>
                  }
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes saved confirmation */}
          <AnimatePresence>
            {notesSaved && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-center mb-4"
              >
                <p className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  ✓ Insight saved to symptom notes
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Scroll to bottom ── */}
      <AnimatePresence>
        {!atBottom && hasMessages && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setAtBottom(true) }}
            className="fixed w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center z-10"
            style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px) + 4.5rem)', right: '1rem' }}
          >
            <ChevronDown size={16} className="text-gray-500" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Fixed input bar — portalled to body to escape page-enter transform ── */}
      {createPortal(
        <div
          className="fixed left-0 right-0 bg-white border-t border-gray-100 px-4 pt-2.5 z-30"
          style={inputBarStyle}
        >
          <p className="text-center text-[10px] text-gray-400 mb-1.5 max-w-lg mx-auto leading-tight">
            AI-generated response — always check with your GP before acting on it.
          </p>
          <div className="flex items-center gap-2 max-w-lg mx-auto">
            {voiceMode ? (
              /* Voice Mode */
              <>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <button
                    onClick={toggleVoiceInput}
                    disabled={loading || isSpeaking}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-red-500 scale-110 shadow-lg'
                        : isSpeaking
                        ? 'bg-primary-400 animate-pulse'
                        : 'bg-primary-600 hover:bg-primary-700'
                    } disabled:opacity-60`}
                  >
                    {isRecording ? (
                      <MicOff size={24} className="text-white" />
                    ) : (
                      <Mic size={24} className="text-white" />
                    )}
                  </button>
                  {isRecording && (
                    <p className="text-[10px] text-red-500 font-semibold mt-2 animate-pulse">Recording...</p>
                  )}
                  {isSpeaking && (
                    <p className="text-[10px] text-primary-500 font-semibold mt-2">Speaking...</p>
                  )}
                </div>
              </>
            ) : (
              /* Text Mode */
              <>
                <div data-tour="ai-chat-input" className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 flex items-center focus-within:border-primary-400 focus-within:bg-white transition-colors" style={{ height: '2.5rem' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your health…"
                    className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none placeholder-gray-300"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                >
                  <Send size={14} className="text-white" />
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── History sheet ── */}
      <AnimatePresence>
        {showHistory && (
          <HistorySheet
            userId={userId}
            onClose={() => setShowHistory(false)}
            onRestore={(msgs, sessionId) => {
              // Save current session before switching
              if (currentSessionId.current) upsertSession(currentSessionId.current, messages, userId)
              else saveSession(messages, userId)
              currentSessionId.current = sessionId || null
              setMessages(msgs); setError(null); setActiveStreakIds([]); setNotesSaved(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
