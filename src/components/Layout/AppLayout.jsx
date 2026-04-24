import { Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import BottomNav from './BottomNav'
import Header from './Header'
import NotificationBanner from '../Notifications/NotificationBanner'
import EmergencyButton from '../Emergency/EmergencyButton'
import EmergencyBanner from '../Emergency/EmergencyBanner'
import { useApp } from '../../context/AppContext'

export default function AppLayout() {
  const { activeEmergency } = useApp()

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#eeeae6' }}>
      {/* Ambient blobs — give the frosted glass something to blur over */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)', filter: 'blur(48px)' }} />
        <div className="absolute top-1/3 -right-24 w-72 h-72 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #ddd6fe 0%, transparent 70%)', filter: 'blur(48px)' }} />
        <div className="absolute bottom-24 left-1/4 w-64 h-64 rounded-full opacity-35"
          style={{ background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)', filter: 'blur(48px)' }} />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #fde68a 0%, transparent 70%)', filter: 'blur(48px)' }} />
      </div>
      <Header />

      {/* Emergency banner — part of flow so it pushes content (intentional) */}
      <AnimatePresence>
        {activeEmergency && <EmergencyBanner />}
      </AnimatePresence>

      <main
        className="flex-1 overflow-y-auto page-enter"
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Outlet />
      </main>

      <BottomNav />

      {/* Notifications — fixed overlay, below header, above nav bar, never shifts layout */}
      <NotificationBanner />

      {/* Emergency FAB */}
      <EmergencyButton />
    </div>
  )
}
