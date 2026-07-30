import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, ChevronRight, User, Shield, Bell, LogOut, Heart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar } from '../components/Family/FamilySwitcher'
import HealthIDCard from '../components/Profile/HealthIDCard'

const GENDERS  = ['female','male','other']
const RELATIONS = ['Self','Partner','Child','Parent','Sibling','Other']
const COLORS   = ['#6366f1','#0891b2','#ec4899','#10b981','#f59e0b','#8b5cf6']

function AddMemberModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'female', relationship: 'Child' })
  const [color, setColor] = useState(COLORS[1])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.name) return
    onSave({ ...form, age: parseInt(form.age) || 0, avatarColor: color })
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
        className="relative bg-white rounded-t-3xl w-full max-w-md p-6 pb-10"
      >
        <h2 className="text-base font-bold text-gray-800 mb-5">Add Family Member</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar color pick */}
          <div className="flex justify-center gap-3 mb-2">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-300' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
          {/* Preview avatar */}
          <div className="flex justify-center mb-1">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ background: color }}>
              {form.name ? form.name.slice(0,2).toUpperCase() : '?'}
            </div>
          </div>

          <input type="text" placeholder="Full name *" value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />

          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Age" value={form.age}
              onChange={e => set('age', e.target.value)} min={0} max={120}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400" />
            <select value={form.gender} onChange={e => set('gender', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400">
              {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {RELATIONS.map(r => (
              <button key={r} type="button" onClick={() => set('relationship', r)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  form.relationship === r ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-200 text-gray-500'
                }`}>
                {r}
              </button>
            ))}
          </div>

          <button type="submit" disabled={!form.name}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-primary-600 text-white disabled:opacity-40">
            Add Member
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function MemberCard({ member, isCurrent, symptoms }) {
  const activeSymptoms = symptoms.filter(s => s.memberId === member.id && !s.resolved)
  return (
    <motion.div
      layout
      className={`glass-card rounded-2xl p-4 border-2 transition-all ${
        isCurrent ? 'border-primary-200' : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar member={member} size="lg" />
          {isCurrent && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-800">{member.name}</p>
            {isCurrent && <span className="text-[10px] bg-primary-100 text-primary-700 font-semibold px-1.5 py-0.5 rounded-full">Active</span>}
          </div>
          <p className="text-xs text-gray-400">{member.relationship} · {member.age} years old · {member.gender}</p>
          {activeSymptoms.length > 0 && (
            <p className="text-[10px] text-amber-500 font-semibold mt-0.5">
              {activeSymptoms.length} active symptom{activeSymptoms.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { label: 'Symptoms', value: activeSymptoms.length, color: '#f97316' },
          { label: 'Resolved', value: symptoms.filter(s => s.memberId === member.id && s.resolved).length, color: '#10b981' },
          { label: 'Age', value: member.age, color: '#6366f1' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-base font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[10px] text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function Profile() {
  const { myFamilyMembers, currentMember, symptoms, addMember, currentUser, logout } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  function handleAddMember(data) {
    addMember(data)
    setShowAdd(false)
  }

  function handleLogout() {
    setLoggingOut(true)
    // Defer to next tick so the spinner renders for a frame before
    // logout() clears state and unmounts this page.
    setTimeout(logout, 50)
  }

  const menuItems = [
    { icon: Bell,   label: 'Notifications',   sub: 'Manage alerts & reminders' },
    { icon: Shield, label: 'Privacy & Sharing', sub: 'Control who sees your data' },
    { icon: Heart,  label: 'Health Goals',     sub: 'Set targets for your activity' },
    { icon: User,   label: 'Account Settings', sub: currentUser?.email },
  ]

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Family Profiles</h2>
          <p className="text-xs text-gray-400 mt-0.5">{myFamilyMembers.length} member{myFamilyMembers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Member cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {myFamilyMembers.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              isCurrent={m.id === currentMember?.id}
              symptoms={symptoms}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Health ID */}
      <HealthIDCard />

      {/* Settings menu */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {menuItems.map((item, i) => {
          const Icon = item.icon
          return (
            <button key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${
                i < menuItems.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <Icon size={15} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                {item.sub && <p className="text-xs text-gray-400">{item.sub}</p>}
              </div>
              <ChevronRight size={14} className="text-gray-300" />
            </button>
          )
        })}
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-rose-100 text-rose-500 font-semibold text-sm hover:bg-rose-50 transition-colors disabled:opacity-60"
      >
        {loggingOut
          ? <><span className="w-4 h-4 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" /> Signing out…</>
          : <><LogOut size={16} /> Sign Out</>}
      </button>

      <AnimatePresence>
        {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSave={handleAddMember} />}
      </AnimatePresence>
    </div>
  )
}
