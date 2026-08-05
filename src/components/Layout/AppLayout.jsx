import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import BottomNav from './BottomNav'
import Header from './Header'
import NotificationBanner from '../Notifications/NotificationBanner'
import EmergencyButton from '../Emergency/EmergencyButton'
import EmergencyBanner from '../Emergency/EmergencyBanner'
import OnboardingTour, { TOUR_KEY } from '../Onboarding/OnboardingTour'
import { useApp } from '../../context/AppContext'

export default function AppLayout() {
  const { activeEmergency, currentUser, profilePanelOpen } = useApp()
  const navigate = useNavigate()
  const [showTour, setShowTour] = useState(false)

  // Navigate to AI tab when a streak notification is tapped
  useEffect(() => {
    const handler = (e) => navigate(e.detail?.path || '/ai')
    window.addEventListener('kaapu:navigate', handler)
    return () => window.removeEventListener('kaapu:navigate', handler)
  }, [navigate])

  // Show tour once for first-time users
  useEffect(() => {
    if (!currentUser?.id) return
    const pendingTour = sessionStorage.getItem('kaapu_show_tour') === '1'
    if (pendingTour || !localStorage.getItem(TOUR_KEY)) {
      sessionStorage.removeItem('kaapu_show_tour')
      const t = setTimeout(() => setShowTour(true), 800)
      return () => clearTimeout(t)
    }
  }, [currentUser?.id]) // eslint-disable-line

  // Allow re-triggering the tour via custom event or sessionStorage flag
  useEffect(() => {
    const handler = () => {
      sessionStorage.removeItem('kaapu_show_tour')
      setShowTour(true)
    }
    window.addEventListener('kaapu:start-tour', handler)
    return () => window.removeEventListener('kaapu:start-tour', handler)
  }, [])

  // Also catch the sessionStorage flag on mount (in case event fires before listener attaches)
  useEffect(() => {
    if (sessionStorage.getItem('kaapu_show_tour') === '1') {
      sessionStorage.removeItem('kaapu_show_tour')
      const t = setTimeout(() => setShowTour(true), 400)
      return () => clearTimeout(t)
    }
  }, [])

  // Only show the banner (and its "I'm OK" resolve button) when the emergency
  // belongs to THIS user's own family. Connected-family emergencies are handled
  // by ConnectedEmergencyModal inside EmergencyButton — observers must NOT be
  // able to resolve someone else's alert.
  const isMyEmergency = !!activeEmergency && activeEmergency.familyId === currentUser?.familyId

  return (
    <div className="flex flex-col h-dvh overflow-hidden" style={{ backgroundImage: 'linear-gradient(180deg, #acd1fb 0%, #ffffff 88.4%)' }}>
      <main
        className="flex-1 overflow-y-auto page-enter"
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Header />

        {/* Emergency banner — only for the person who triggered it, never for observers */}
        <AnimatePresence>
          {isMyEmergency && <EmergencyBanner />}
        </AnimatePresence>

        <Outlet />
      </main>

      {!profilePanelOpen && <BottomNav />}

      {/* Notifications — fixed overlay, below header, above nav bar, never shifts layout */}
      <NotificationBanner />

      {/* Emergency FAB */}
      <EmergencyButton />

      {/* Onboarding tour — shown once on first login, re-triggered from Profile */}
      <AnimatePresence>
        {showTour && (
          <OnboardingTour onDone={() => setShowTour(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
