import { Routes, Route, Navigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import AppLayout              from './components/Layout/AppLayout'
import Auth                   from './pages/Auth'
import Dashboard              from './pages/Dashboard'
import BodyMap                from './pages/BodyMap'
import History                from './pages/History'
import Family                 from './pages/Family'
import DoctorPortal           from './pages/DoctorPortal'
import EmergencyContactGate   from './components/Onboarding/EmergencyContactGate'

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
        <Route index            element={<Dashboard />} />
        <Route path="body-map"  element={<BodyMap />} />
        <Route path="history"   element={<History />} />
        <Route path="family"    element={<Family />} />
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
