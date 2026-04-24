import { Routes, Route, Navigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import AppLayout     from './components/Layout/AppLayout'
import Auth          from './pages/Auth'
import Dashboard     from './pages/Dashboard'
import BodyMap       from './pages/BodyMap'
import History       from './pages/History'
import Family        from './pages/Family'
import DoctorPortal  from './pages/DoctorPortal'

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
  const { currentUser, appLoading } = useApp()

  // Firebase is resolving auth state — show a subtle splash
  if (appLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: '#eeeae6' }}
      >
        <div className="w-16 h-16 rounded-3xl bg-primary-600 flex items-center justify-center shadow-xl animate-pulse">
          <Heart size={28} className="text-white" fill="white" />
        </div>
        <p className="text-sm font-semibold text-gray-400 tracking-wide">Kaapu</p>
      </div>
    )
  }

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
