import { useState, useRef } from 'react'
import { Upload, FileText, Image, File, Eye, Download, Trash2, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useApp } from '../context/AppContext'

const DOC_TYPES = [
  { id: 'lab',          label: 'Lab Report',     icon: '🧪', color: '#4f46e5' },
  { id: 'prescription', label: 'Prescription',   icon: '💊', color: '#0891b2' },
  { id: 'imaging',      label: 'Imaging / Scan', icon: '🫁', color: '#7c3aed' },
  { id: 'discharge',    label: 'Discharge Note', icon: '🏥', color: '#059669' },
  { id: 'referral',     label: 'Referral',       icon: '📄', color: '#d97706' },
  { id: 'other',        label: 'Other',          icon: '📎', color: '#6b7280' },
]

function FileIcon({ name }) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return <Image size={20} className="text-blue-400" />
  if (['pdf'].includes(ext)) return <FileText size={20} className="text-rose-400" />
  return <File size={20} className="text-gray-400" />
}

function DocCard({ doc, onDelete }) {
  const type = DOC_TYPES.find(t => t.id === doc.docType) || DOC_TYPES[5]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: type.color + '1a' }}>
          {type.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{doc.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{type.label}</p>
          {doc.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{doc.notes}</p>}
          <p className="text-[10px] text-gray-300 mt-1">
            Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onDelete(doc.id)}
            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-rose-50 flex items-center justify-center text-gray-300 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function UploadModal({ onClose, onSave }) {
  const [name,    setName]    = useState('')
  const [docType, setDocType] = useState('lab')
  const [notes,   setNotes]   = useState('')
  const [file,    setFile]    = useState(null)
  const fileRef = useRef()

  function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    onSave({ name: name || file?.name || 'Document', docType, notes, fileName: file?.name })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60 }}
        transition={{ type: 'spring', damping: 28 }}
        className="relative glass-elevated rounded-t-3xl w-full max-w-md p-6 pb-10"
      >
        <h2 className="text-base font-bold text-gray-800 mb-4">Add Document</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-all"
          >
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => { setFile(e.target.files[0]); if (!name) setName(e.target.files[0]?.name || '') }} />
            <Upload size={24} className="mx-auto text-gray-300 mb-2" />
            {file
              ? <p className="text-sm font-medium text-primary-600">{file.name}</p>
              : <><p className="text-sm text-gray-500 font-medium">Tap to upload a file</p>
                  <p className="text-xs text-gray-300 mt-1">PDF, images, any format</p></>
            }
          </div>

          <input
            type="text"
            placeholder="Document name *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />

          <div className="grid grid-cols-3 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t.id} type="button"
                onClick={() => setDocType(t.id)}
                className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                  docType === t.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100'
                }`}
              >
                <div className="text-lg">{t.icon}</div>
                <p className="text-[10px] font-medium text-gray-600 mt-0.5 leading-tight">{t.label}</p>
              </button>
            ))}
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />

          <button type="submit" disabled={!name}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-primary-600 text-white disabled:opacity-40">
            Save Document
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function Documents() {
  const { currentDocuments, addDocument, currentMember } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [docs, setDocs] = useState(currentDocuments)

  // Keep local state for immediate optimistic UI
  const allDocs = currentDocuments

  function handleSave(data) {
    addDocument(data)
    setShowUpload(false)
  }

  function handleDelete(id) {
    // Note: would call deleteDocument in full app
    alert('Delete functionality — connect to deleteDocument() in context for production.')
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Health Records</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {currentMember?.name} · {allDocs.length} document{allDocs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-sm hover:bg-primary-700 transition-colors"
        >
          <Plus size={14} /> Upload
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        {['All', ...DOC_TYPES.map(t => t.label)].map(label => (
          <button key={label}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full glass-card text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors">
            {label}
          </button>
        ))}
      </div>

      {allDocs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">
            📋
          </div>
          <p className="text-sm font-bold text-gray-600">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-6">Upload lab results, prescriptions, and more</p>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-primary-600 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-sm"
          >
            Upload first document
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {allDocs.map(doc => (
              <DocCard key={doc.id} doc={doc} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showUpload && (
          <UploadModal onClose={() => setShowUpload(false)} onSave={handleSave} />
        )}
      </AnimatePresence>
    </div>
  )
}
