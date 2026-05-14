import { useState, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isYesterday, subMonths, subYears } from 'date-fns'
import {
  CheckCircle, ChevronDown, ChevronUp, FileText, Upload,
  X, Plus, FolderOpen, Pill, Heart, Search,
  ArrowDownUp, Clock, SlidersHorizontal,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase, supabaseReady } from '../supabase'
import {
  SYMPTOM_CATEGORIES, FEELING_CONFIG,
  CHRONIC_CONDITION_PRESETS,
} from '../data/mockData'
import ConditionCard from '../components/Conditions/ConditionCard'

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { id: 'lab',          label: 'Lab Report',     icon: '🧪', color: '#4f46e5' },
  { id: 'prescription', label: 'Prescription',   icon: '💊', color: '#0891b2' },
  { id: 'imaging',      label: 'Imaging / Scan', icon: '🫁', color: '#7c3aed' },
  { id: 'discharge',    label: 'Discharge Note', icon: '🏥', color: '#059669' },
  { id: 'referral',     label: 'Referral',       icon: '📄', color: '#d97706' },
  { id: 'other',        label: 'Other',          icon: '📎', color: '#6b7280' },
]

function dateLabel(d) {
  if (isToday(d))     return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

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
  // Count inclusive calendar days: May 1 → May 3 = 3 days (not 2)
  const start = new Date(symptom.timestamp);  start.setHours(0,0,0,0)
  const end   = new Date(symptom.resolvedAt); end.setHours(0,0,0,0)
  const days  = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  if (days <= 1) return 'Lasted less than a day'
  return `Lasted ${days} day${days !== 1 ? 's' : ''}`
}

function groupByDate(items) {
  const g = {}
  items.forEach(i => {
    const lbl = dateLabel(new Date(i._date))
    if (!g[lbl]) g[lbl] = []
    g[lbl].push(i)
  })
  return Object.entries(g)
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SymptomCard({ item, onResolve, readOnly = false }) {
  const [open, setOpen] = useState(false)
  const cat      = SYMPTOM_CATEGORIES.find(c => c.id === item.category)
  const sev      = item.severity
  const sevColor = sev >= 7 ? '#ef4444' : sev >= 5 ? '#f97316' : '#10b981'
  const isContinuation = item._dayIndex > 0
  return (
    <motion.div layout className={`glass-card rounded-2xl overflow-hidden ${isContinuation ? 'opacity-80' : ''}`}>
      <button className="w-full flex items-center gap-3 p-3.5 text-left" onClick={() => setOpen(o => !o)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: (cat?.color || '#6366f1') + '1a' }}>{cat?.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-bold text-gray-800">{item.bodyLabel}</p>
            {isContinuation && (
              <span className="text-[9px] bg-amber-100 text-amber-600 font-bold px-1.5 py-0.5 rounded-full">
                Day {item._dayIndex + 1}
              </span>
            )}
            {item.resolved && item._isStart && (
              <span className="text-[9px] bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full">Resolved</span>
            )}
            {item.resolved && isContinuation && (
              <span className="text-[9px] bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full">Resolved</span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            {cat?.label} · {item.type}
            {isContinuation && <span className="text-gray-300"> · started {format(new Date(item.timestamp), 'MMM d')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold" style={{ color: sevColor }}>{sev}/10</p>
            <p className="text-[10px] text-gray-300">{symptomDurationLabel(item)}</p>
          </div>
          {open ? <ChevronUp size={13} className="text-gray-300" /> : <ChevronDown size={13} className="text-gray-300" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l:'Severity', v:`${sev}/10`, c: sevColor },
                  { l:'Duration', v: symptomDurationLabel(item), c:'#374151' },
                  { l:'Logged',   v: format(new Date(item.timestamp), 'MMM d'), c:'#374151' },
                ].map(s => (
                  <div key={s.l} className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-400 mb-0.5">{s.l}</p>
                    <p className="text-xs font-bold" style={{ color: s.c }}>{s.v}</p>
                  </div>
                ))}
              </div>
              {item.notes && (
                <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-1">Notes</p>
                  <p className="text-xs text-blue-700">{item.notes}</p>
                </div>
              )}
              {sev >= 7 && !item.resolved && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-rose-600 font-medium">⚠️ You may want to reach out to a doctor for this symptom.</p>
                </div>
              )}
              {!item.resolved && !readOnly && (
                <button onClick={() => onResolve(item.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle size={13} /> Mark as resolved
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CheckInCard({ item }) {
  const cfg = FEELING_CONFIG[item.feeling]
  return (
    <div className="glass-card rounded-2xl p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: cfg.bg }}>{cfg.emoji}</div>
      <div className="flex-1">
        <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
        {item.notes && <p className="text-[11px] text-gray-400 mt-0.5">{item.notes}</p>}
      </div>
      <p className="text-[10px] text-gray-300">{format(new Date(item.date), 'h:mm a')}</p>
    </div>
  )
}

function DocViewer({ doc, onClose }) {
  const type  = DOC_TYPES.find(t => t.id === doc.docType) || DOC_TYPES[5]
  const url   = doc.fileUrl || ''
  const isImg = /\.(jpe?g|png|svg)$/i.test(url) || url.startsWith('blob:') && doc.fileName && /\.(jpe?g|png)$/i.test(doc.fileName)
  const isPdf = /\.pdf$/i.test(url) || url.startsWith('blob:') && doc.fileName?.toLowerCase().endsWith('.pdf')

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-gray-900">
      <div className="bg-gray-900 px-4 pt-5 pb-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <X size={15} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{doc.name}</p>
          <p className="text-[11px] text-gray-400">{type.label} · {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</p>
        </div>
        <span className="text-lg">{type.icon}</span>
      </div>
      <div className="flex-1 overflow-auto bg-gray-100">
        {url ? (
          isImg ? (
            <div className="flex items-start justify-center min-h-full p-3">
              <img src={url} alt={doc.name} className="max-w-full rounded-xl shadow-xl bg-white object-contain"
                style={{ maxHeight: '80vh' }} />
            </div>
          ) : isPdf ? (
            <iframe src={url} title={doc.name} className="w-full h-full border-none" style={{ minHeight: '80vh' }} />
          ) : (
            <div className="flex items-start justify-center min-h-full p-3">
              <img src={url} alt={doc.name} className="max-w-full rounded-xl shadow-xl bg-white" />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <FileText size={48} />
            <p className="text-sm font-medium">Preview not available</p>
            {doc.notes && <p className="text-xs text-gray-500 max-w-xs text-center">{doc.notes}</p>}
          </div>
        )}
      </div>
      {doc.notes && (
        <div className="bg-white px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Notes</p>
          <p className="text-xs text-gray-600">{doc.notes}</p>
        </div>
      )}
    </motion.div>
  )
}

function DocTimelineCard({ item, onView }) {
  const type = DOC_TYPES.find(t => t.id === item.docType) || DOC_TYPES[5]
  return (
    <button onClick={() => onView(item)} className="w-full glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: type.color + '18' }}>{type.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
        <p className="text-[11px] text-gray-400">{type.label}</p>
      </div>
      <span className="text-[10px] text-primary-500 font-semibold bg-primary-50 px-2 py-1 rounded-full">View</span>
    </button>
  )
}

const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.pdf'
const ACCEPTED_MIME  = ['image/jpeg', 'image/png', 'application/pdf']

function UploadModal({ onClose, onSave }) {
  const [name,    setName]    = useState('')
  const [docType, setDocType] = useState('lab')
  const [notes,   setNotes]   = useState('')
  const [file,    setFile]    = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [fileErr, setFileErr] = useState('')
  const fileRef = useRef()

  function handleFile(f) {
    if (!f) return
    if (!ACCEPTED_MIME.includes(f.type)) {
      setFileErr('Only JPEG, PNG, or PDF files are allowed.')
      return
    }
    setFileErr('')
    setFile(f)
    // Revoke previous object URL if any
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFileUrl(URL.createObjectURL(f))
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    onSave({ name, docType, notes, fileName: file?.name, fileUrl })
    onClose()
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type:'spring', damping:28, stiffness:320 }}
        className="relative glass-elevated rounded-3xl w-full max-w-md p-6 overflow-y-auto"
        style={{ maxHeight: '88vh' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-gray-800">Add Health Record</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-all">
            <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <Upload size={22} className="mx-auto text-gray-300 mb-1.5" />
            {file
              ? <p className="text-sm font-medium text-primary-600">{file.name}</p>
              : <>
                  <p className="text-sm text-gray-500 font-medium">Tap to upload</p>
                  <p className="text-xs text-gray-300 mt-0.5">JPEG, PNG or PDF only</p>
                </>}
            {fileErr && <p className="text-xs text-rose-500 mt-1 font-medium">{fileErr}</p>}
          </div>
          <input type="text" placeholder="Document name *" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setDocType(t.id)}
                className={`p-2 rounded-xl border-2 text-center transition-all ${docType === t.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100'}`}>
                <div className="text-base">{t.icon}</div>
                <p className="text-[9px] font-medium text-gray-600 mt-0.5 leading-tight">{t.label}</p>
              </button>
            ))}
          </div>
          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary-400" />
          <button type="submit" disabled={!name} className="w-full py-3 rounded-2xl font-bold text-sm bg-primary-600 text-white disabled:opacity-40">
            Save Record
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function RecordsOverlay({ documents, onClose, onAdd, onView }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 bg-surface flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Health Records</h2>
          <p className="text-xs text-gray-400">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdd}
            className="flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
            <Plus size={13} /> Upload
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {documents.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-500">No records yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload lab results, prescriptions, and more</p>
            <button onClick={onAdd} className="mt-4 bg-primary-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl">Upload first record</button>
          </div>
        ) : (
          documents.map(d => {
            const type = DOC_TYPES.find(t => t.id === d.docType) || DOC_TYPES[5]
            return (
              <button key={d.id} onClick={() => onView(d)}
                className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/80 transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: type.color + '1a' }}>{type.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400">{type.label} · {format(new Date(d.uploadedAt), 'MMM d, yyyy')}</p>
                  {d.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{d.notes}</p>}
                </div>
                <span className="text-[10px] text-primary-500 font-semibold bg-primary-50 px-2 py-1 rounded-full flex-shrink-0">View</span>
              </button>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Conditions sub-components (inline, no outer page wrapper)
// ─────────────────────────────────────────────────────────────────────────────
function AddConditionModal({ onClose }) {
  const { addCondition } = useApp()
  const [query,      setQuery]      = useState('')
  const [selected,   setSelected]   = useState(null)
  const [severity,   setSeverity]   = useState('mild')
  const [diagDate,   setDiagDate]   = useState('')
  const [notes,      setNotes]      = useState('')
  const [linkedCats, setLinkedCats] = useState([])
  const [step,       setStep]       = useState('pick')

  const filtered = CHRONIC_CONDITION_PRESETS.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  function selectPreset(p) {
    setSelected(p)
    const cat = SYMPTOM_CATEGORIES.find(c => c.id === p.category)
    if (cat) setLinkedCats([cat.id])
    setStep('details')
  }

  function handleSave() {
    if (!selected) return
    addCondition({
      name:             selected.name,
      icon:             selected.icon,
      icd:              selected.icd,
      severity,
      diagnosedDate:    diagDate || null,
      notes,
      linkedCategories: linkedCats,
    })
    onClose()
  }

  function toggleCat(catId) {
    setLinkedCats(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    )
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type:'spring', damping:28, stiffness:320 }}
        className="relative glass-elevated rounded-3xl w-full max-w-md flex flex-col"
        style={{ maxHeight:'88vh' }}>
        <div className="flex justify-between items-center px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-gray-800">
              {step === 'pick' ? 'Add Condition' : selected?.name}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === 'pick' ? 'Select from common conditions' : 'Fill in details'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {step === 'details' && (
              <button onClick={() => setStep('pick')} className="text-xs text-primary-500 font-semibold">← Back</button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={14} />
            </button>
          </div>
        </div>

        {step === 'pick' && (
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" placeholder="Search conditions…" value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
            </div>
            <div className="space-y-2">
              {filtered.map(p => (
                <button key={p.name} onClick={() => selectPreset(p)}
                  className="w-full flex items-center gap-3 p-3 glass-card rounded-2xl hover:bg-white/80 transition-all text-left">
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{p.name}</p>
                    <p className="text-[11px] text-gray-400">ICD: {p.icd} · {p.category}</p>
                  </div>
                  <span className="text-primary-400 text-lg">›</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">No matches found</p>
              )}
            </div>
          </div>
        )}

        {step === 'details' && selected && (
          <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {['mild','moderate','severe'].map(s => (
                  <button key={s} type="button" onClick={() => setSeverity(s)}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all capitalize ${
                      severity === s
                        ? s === 'mild'     ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : s === 'moderate' ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-gray-100 text-gray-400'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Diagnosis Date (optional)</label>
              <input type="date" value={diagDate} onChange={e => setDiagDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">Monitor Symptom Categories</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_CATEGORIES.filter(c => c.id !== 'other').map(cat => (
                  <button key={cat.id} type="button" onClick={() => toggleCat(cat.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border-2 transition-all"
                    style={
                      linkedCats.includes(cat.id)
                        ? { background: cat.color + '18', borderColor: cat.color, color: cat.color }
                        : { borderColor: '#e5e7eb', color: '#9ca3af' }
                    }>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Clinical Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Triggers, management strategy, doctor notes…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary-400" />
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-50">
            <button onClick={handleSave}
              className="w-full py-3 rounded-2xl bg-primary-600 text-white font-extrabold text-sm hover:bg-primary-700 transition-colors">
              Add {selected?.name}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function AddMedicationModal({ onClose, conditions }) {
  const { addMedication } = useApp()
  const [name,      setName]      = useState('')
  const [dosage,    setDosage]    = useState('')
  const [frequency, setFrequency] = useState('')
  const [condId,    setCondId]    = useState(conditions[0]?.id || '')

  const FREQS = ['Once daily','Twice daily','Three times daily','As needed (PRN)','Weekly','Other']

  function handleSave(e) {
    e.preventDefault()
    if (!name) return
    addMedication({ name, dosage, frequency, conditionId: condId || null })
    onClose()
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type:'spring', damping:28, stiffness:320 }}
        className="relative glass-elevated rounded-3xl w-full max-w-md overflow-y-auto"
        style={{ maxHeight: '88vh' }}>
        <div className="flex justify-between items-center px-5 pt-5 pb-3">
          <h2 className="text-sm font-extrabold text-gray-800">Add Medication</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSave} className="px-5 pb-8 space-y-3">
          <input type="text" placeholder="Medication name *" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400" />
          <input type="text" placeholder="Dosage (e.g. 100mcg, 5mg)" value={dosage}
            onChange={e => setDosage(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400" />
          <div className="flex flex-wrap gap-2">
            {FREQS.map(f => (
              <button key={f} type="button" onClick={() => setFrequency(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all ${
                  frequency === f ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 text-gray-400'
                }`}>{f}</button>
            ))}
          </div>
          {conditions.length > 0 && (
            <select value={condId} onChange={e => setCondId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 bg-white">
              <option value="">Not linked to condition</option>
              {conditions.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          )}
          <button type="submit" disabled={!name}
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-extrabold text-sm disabled:opacity-40">
            Add Medication
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Inline conditions panel (no outer page wrapper / heading)
function ConditionsPanel() {
  const {
    currentMember, currentConditions, currentMedications,
    currentSymptoms, currentRiskProfile,
    addCondition, addMedication,
  } = useApp()

  const [showAddCond, setShowAddCond] = useState(false)
  const [showAddMed,  setShowAddMed]  = useState(false)

  const riskLevel = currentRiskProfile?.riskLevel || 'normal'
  const riskColors = {
    normal:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    high:     'bg-amber-50  text-amber-700  border-amber-200',
    critical: 'bg-rose-50   text-rose-700   border-rose-200',
  }

  const standaloneMeds = currentMedications.filter(
    m => !m.conditionId || !currentConditions.find(c => c.id === m.conditionId)
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {currentMember?.name} · {currentConditions.length} condition{currentConditions.length !== 1 ? 's' : ''} · {currentMedications.length} med{currentMedications.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowAddMed(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
            <Pill size={13} /> Med
          </button>
          <button onClick={() => setShowAddCond(true)}
            className="flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-primary-700 transition-colors">
            <Plus size={13} /> Condition
          </button>
        </div>
      </div>

      {/* Risk badge */}
      {currentRiskProfile && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${riskColors[riskLevel]}`}>
          <Heart size={14} />
          <p className="text-xs font-bold capitalize">
            Risk Level: {riskLevel}
            {currentRiskProfile.mandatoryCheckIn && ' · Check-in required'}
          </p>
        </div>
      )}

      {/* Conditions */}
      {currentConditions.length === 0 ? (
        <div className="text-center py-10 px-6 glass-card rounded-3xl">
          <div className="text-5xl mb-3">🏥</div>
          <p className="text-sm font-bold text-gray-600">No conditions recorded</p>
          <p className="text-xs text-gray-400 mt-1">Add chronic conditions to track symptoms and medications</p>
          <button onClick={() => setShowAddCond(true)}
            className="mt-4 bg-primary-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl">
            Add first condition
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {currentConditions.map(c => (
            <ConditionCard key={c.id} condition={c} medications={currentMedications} symptoms={currentSymptoms} />
          ))}
        </div>
      )}

      {/* Standalone meds */}
      {standaloneMeds.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pill size={13} className="text-indigo-400" /> Other Medications
          </p>
          <div className="space-y-2">
            {standaloneMeds.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-indigo-50 rounded-xl px-3 py-2.5">
                <Pill size={13} className="text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-indigo-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-indigo-400">{m.dosage} · {m.frequency}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddCond && <AddConditionModal onClose={() => setShowAddCond(false)} />}
        {showAddMed  && <AddMedicationModal onClose={() => setShowAddMed(false)} conditions={currentConditions} />}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Health page
// ─────────────────────────────────────────────────────────────────────────────
const TIMELINE_TABS = ['All', 'Symptoms', 'Check-ins', 'Records']
const MAIN_TABS     = ['Timeline', 'Conditions']

const TIME_RANGES = [
  { id: 'all', label: 'Forever' },
  { id: '1y',  label: 'Last 1Y' },
  { id: '6m',  label: 'Last 6M' },
]

export default function History() {
  const {
    currentSymptoms, currentCheckIns, currentDocuments,
    resolveSymptom, addDocument, currentMember,
  } = useApp()

  // For connected members (linkedFamilyId set), fetch their data via SECURITY DEFINER RPCs
  // because local state only holds own-family data.
  const [remoteSymptoms,  setRemoteSymptoms]  = useState(null)
  const [remoteCheckIns,  setRemoteCheckIns]  = useState(null)

  useEffect(() => {
    setRemoteSymptoms(null)
    setRemoteCheckIns(null)
    if (!currentMember?.linkedFamilyId || !currentMember?.userId) return
    if (!supabaseReady || !supabase) return

    let cancelled = false
    async function fetchConnected() {
      try {
        const { data: selfMems } = await supabase.rpc('get_connected_member', {
          target_family_id: currentMember.linkedFamilyId,
          target_user_id:   currentMember.userId,
        })
        const selfId = selfMems?.[0]?.id
        if (!selfId || cancelled) return

        const [sympRes, ciRes] = await Promise.all([
          supabase.rpc('get_connected_symptoms', {
            target_family_id: currentMember.linkedFamilyId,
            target_member_id: selfId,
          }),
          supabase.rpc('get_connected_checkins', {
            target_family_id: currentMember.linkedFamilyId,
            target_member_id: selfId,
          }),
        ])
        if (!cancelled) {
          setRemoteSymptoms(sympRes.data || [])
          setRemoteCheckIns((ciRes.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)))
        }
      } catch (err) {
        console.error('[History fetchConnected]', err)
      }
    }
    fetchConnected()
    return () => { cancelled = true }
  }, [currentMember?.id, currentMember?.linkedFamilyId, currentMember?.userId])

  // Use remote data when viewing a connected member, own data otherwise
  const symptomsToShow  = currentMember?.linkedFamilyId ? (remoteSymptoms  ?? []) : currentSymptoms
  const checkInsToShow  = currentMember?.linkedFamilyId ? (remoteCheckIns  ?? []) : currentCheckIns
  const documentsToShow = currentDocuments  // documents are always own-family

  const [mainTab,      setMainTab]      = useState('Timeline')
  const [timelineTab,  setTimelineTab]  = useState('All')
  const [showRecords,  setShowRecords]  = useState(false)
  const [showUpload,   setShowUpload]   = useState(false)
  const [viewDoc,      setViewDoc]      = useState(null)
  const [search,       setSearch]       = useState('')
  const [timeRange,    setTimeRange]    = useState('all')
  const [sortOrder,    setSortOrder]    = useState('desc')  // 'desc' = newest first
  const [showFilters,  setShowFilters]  = useState(false)

  const allItems = useMemo(() => {
    // Expand each symptom across every calendar day it was active.
    // Resolved symptoms: from timestamp → resolvedAt.
    // Active symptoms: from timestamp → today (so they keep appearing daily until resolved).
    // Cap at 90 days to avoid runaway expansion.
    const symptomEntries = []
    symptomsToShow.forEach(s => {
      const startDay = new Date(s.timestamp); startDay.setHours(0,0,0,0)
      let endDay
      if (s.resolvedAt) {
        endDay = new Date(s.resolvedAt); endDay.setHours(0,0,0,0)
      } else if (s.resolved) {
        endDay = new Date(startDay)           // old data — no resolvedAt, just show start day
      } else {
        endDay = new Date(); endDay.setHours(0,0,0,0)  // still active → show up to today
      }

      let d = new Date(startDay)
      let idx = 0
      while (d <= endDay && idx < 90) {
        symptomEntries.push({
          ...s,
          _type:    'symptom',
          _date:    new Date(d).toISOString(),
          _dayIndex: idx,           // 0 = first day logged
          _isStart:  idx === 0,
        })
        d = new Date(d); d.setDate(d.getDate() + 1)
        idx++
      }
    })

    return [
      ...symptomEntries,
      ...checkInsToShow.map(c  => ({ ...c, _type:'checkin',  _date: c.date       })),
      ...documentsToShow.map(d => ({ ...d, _type:'document', _date: d.uploadedAt })),
    ]
  }, [symptomsToShow, checkInsToShow, documentsToShow])

  const filtered = useMemo(() => {
    const now = new Date()
    const cutoff =
      timeRange === '6m' ? subMonths(now, 6) :
      timeRange === '1y' ? subYears(now, 1)  : null

    const q = search.toLowerCase().trim()

    return allItems
      .filter(i => {
        // Time range filter
        if (cutoff && new Date(i._date) < cutoff) return false
        // Type filter
        if (timelineTab === 'Symptoms'  && i._type !== 'symptom')  return false
        if (timelineTab === 'Check-ins' && i._type !== 'checkin')  return false
        if (timelineTab === 'Records'   && i._type !== 'document') return false
        // Search filter
        if (q) {
          const haystack = [
            i.bodyLabel, i.type, i.category, i.categoryLabel,
            i.notes, i.name, i.feeling, i.docType,
          ].filter(Boolean).join(' ').toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((a, b) =>
        sortOrder === 'desc'
          ? new Date(b._date) - new Date(a._date)
          : new Date(a._date) - new Date(b._date)
      )
  }, [allItems, timelineTab, timeRange, search, sortOrder])

  const grouped = groupByDate(filtered)

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      {/* Page header */}
      <div data-tour="history-header" className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Health</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {symptomsToShow.length} symptoms · {checkInsToShow.length} check-ins · {documentsToShow.length} records
          </p>
        </div>
        {mainTab === 'Timeline' && (
          <button data-tour="history-records-btn" onClick={() => setShowRecords(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-2 rounded-xl hover:bg-primary-100 transition-colors">
            <FolderOpen size={13} /> Records
          </button>
        )}
      </div>

      {/* Main tab switcher */}
      <div className="flex glass-card rounded-2xl p-1 mb-5 gap-1">
        {MAIN_TABS.map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mainTab === t ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {/* ── Timeline tab ── */}
      {mainTab === 'Timeline' && (
        <>
          {/* Sub-tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-3 gap-1 overflow-x-auto">
            {TIMELINE_TABS.map(t => (
              <button key={t} onClick={() => setTimelineTab(t)}
                className={`flex-shrink-0 flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  timelineTab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}>{t}</button>
            ))}
          </div>

          {/* Search + Filter button (side by side) */}
          <div className="flex gap-2 mb-3">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-8 py-2.5 rounded-2xl text-xs border border-gray-200 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white/70 backdrop-blur-sm"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter button */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-semibold border transition-all flex-shrink-0 ${
                  showFilters || timeRange !== 'all' || sortOrder !== 'desc'
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white/70 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <SlidersHorizontal size={13} />
                Filters
                {(timeRange !== 'all' || sortOrder !== 'desc') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90 ml-0.5" />
                )}
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 z-50 glass-elevated rounded-2xl p-3 shadow-card-lg min-w-[200px]"
                  >
                    {/* Time range */}
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Time Range</p>
                    <div className="space-y-1 mb-3">
                      {TIME_RANGES.map(r => (
                        <button key={r.id} onClick={() => setTimeRange(r.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                            timeRange === r.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                          }`}>
                          {r.id !== 'all' && <Clock size={11} className="text-gray-400" />}
                          {r.id === 'all' && <span className="text-[11px]">∞</span>}
                          {r.label}
                          {timeRange === r.id && <span className="ml-auto text-primary-500">✓</span>}
                        </button>
                      ))}
                    </div>

                    {/* Sort order */}
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Sort Order</p>
                    <div className="space-y-1">
                      {[{ id: 'desc', label: 'Newest first' }, { id: 'asc', label: 'Oldest first' }].map(s => (
                        <button key={s.id} onClick={() => setSortOrder(s.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                            sortOrder === s.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                          }`}>
                          <ArrowDownUp size={11} className={`text-gray-400 ${s.id === 'asc' ? 'scale-y-[-1]' : ''}`} />
                          {s.label}
                          {sortOrder === s.id && <span className="ml-auto text-primary-500">✓</span>}
                        </button>
                      ))}
                    </div>

                    {/* Reset */}
                    {(timeRange !== 'all' || sortOrder !== 'desc') && (
                      <button
                        onClick={() => { setTimeRange('all'); setSortOrder('desc') }}
                        className="w-full mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400 hover:text-rose-500 font-semibold transition-colors"
                      >
                        Reset filters
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active filter chips */}
          {(search || timeRange !== 'all') && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <p className="text-[11px] text-gray-400">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </p>
              {search && (
                <span className="flex items-center gap-1 text-[11px] bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                  "{search}"
                  <button onClick={() => setSearch('')}><X size={10} /></button>
                </span>
              )}
              {timeRange !== 'all' && (
                <span className="flex items-center gap-1 text-[11px] bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                  {TIME_RANGES.find(r => r.id === timeRange)?.label}
                  <button onClick={() => setTimeRange('all')}><X size={10} /></button>
                </span>
              )}
            </div>
          )}

          {grouped.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-sm font-semibold text-gray-600">Nothing here yet</p>
              <p className="text-xs text-gray-400 mt-1">Log a symptom, check in, or upload a record.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([label, items]) => (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary-400" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                  </div>
                  <div className="space-y-2 ml-4">
                    {items.map(item =>
                      item._type === 'symptom'  ? <SymptomCard   key={item.id} item={item} onResolve={resolveSymptom} readOnly={!!currentMember?.linkedFamilyId} /> :
                      item._type === 'checkin'  ? <CheckInCard   key={item.id} item={item} /> :
                      <DocTimelineCard key={item.id} item={item} onView={setViewDoc} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Conditions tab ── */}
      {mainTab === 'Conditions' && <ConditionsPanel />}

      {/* Overlays */}
      <AnimatePresence>
        {showRecords && (
          <RecordsOverlay
            documents={currentDocuments}
            onClose={() => setShowRecords(false)}
            onAdd={() => { setShowRecords(false); setShowUpload(true) }}
            onView={d => { setShowRecords(false); setViewDoc(d) }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSave={data => addDocument(data)} />}
      </AnimatePresence>
      <AnimatePresence>
        {viewDoc && <DocViewer doc={viewDoc} onClose={() => setViewDoc(null)} />}
      </AnimatePresence>
    </div>
  )
}
