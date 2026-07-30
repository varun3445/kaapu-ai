import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './context/AppContext'
import AppLayout              from './components/Layout/AppLayout'
import Auth                   from './pages/Auth'
import Dashboard              from './pages/Dashboard'
import History                from './pages/History'
import Family                 from './pages/Family'
import AI                     from './pages/AI'
import LogPain                from './pages/LogPain'
import DoctorPortal           from './pages/DoctorPortal'
import EmergencyContactGate   from './components/Onboarding/EmergencyContactGate'

// Funny, low-stakes copy so a multi-second load never reads as "stuck"
const LOADING_MESSAGES = [
  'Waking up the servers…',
  'Untangling your health data…',
  'Reticulating splines…',
  'Convincing the database to cooperate…',
  'Plugging in the networks…',
  'Collecting your resources…',
  'Herding symptoms into place…',
  'Negotiating with the cloud…',
  'Dusting off your dashboard…',
  'Bribing the servers with coffee…',
]

function LoadingMessage() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % LOADING_MESSAGES.length), 1700)
    return () => clearInterval(id)
  }, [])
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        className="text-xs text-gray-400 font-medium"
      >
        {LOADING_MESSAGES[index]}
      </motion.p>
    </AnimatePresence>
  )
}

function PrivateRoute({ children }) {
  const { currentUser } = useApp()
  return currentUser ? children : <Navigate to="/auth" replace />
}

function DoctorRoute({ children }) {
  const { currentUser } = useApp()
  if (!currentUser) return <Navigate to="/auth" replace />
  if (currentUser.role !== 'doctor') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { currentUser, appLoading, isDemoMode } = useApp()

  // Firebase is resolving auth state — show a subtle splash
  if (appLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: '#eeeae6' }}
      >
        <img src="/logo.png" alt="Kaapu" className="w-16 h-16 object-contain animate-pulse" style={{ mixBlendMode: 'multiply' }} />
        <p className="text-sm font-semibold text-gray-400 tracking-wide">Kaapu</p>
        <LoadingMessage />
      </div>
    )
  }

  // Block non-demo, non-doctor users who have no named emergency contact
  const needsEmergencyContact =
    !isDemoMode &&
    currentUser &&
    currentUser.role !== 'doctor' &&
    !(currentUser.emergencyContacts || []).some(c => c.name?.trim())

  if (needsEmergencyContact) return <EmergencyContactGate />

  return (
    <Routes>
      <Route path="/auth" element={
        currentUser
          ? <Navigate to={currentUser.role === 'doctor' ? '/doctor' : '/'} replace />
          : <Auth />
      } />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index           element={<Dashboard />} />
        <Route path="history"  element={<History />} />
        <Route path="ai"       element={<AI />} />
        <Route path="family"   element={<Family />} />
        <Route path="log-pain" element={<LogPain />} />
      </Route>
      <Route path="/doctor" element={<DoctorRoute><DoctorPortal /></DoctorRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
