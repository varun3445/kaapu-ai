import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Users, Sparkles, ActivitySquare } from 'lucide-react'

const links = [
  { to: '/',        icon: Home,      label: 'Home',     tour: null         },
  { to: '/history', icon: BookOpen,  label: 'Timeline', tour: null         },
  { to: '/family',  icon: Users,     label: 'People',   tour: 'nav-family' },
]

export default function BottomNav() {
  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-1 pt-2 pb-3 max-w-lg mx-auto">
        {/* Home */}
        <NavLink to="/" end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <Home size={19} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-gray-700' : ''}`}>Home</span>
            </>
          )}
        </NavLink>

        {/* Log Pain */}
        <NavLink to="/log-pain"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <ActivitySquare size={19} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-gray-700' : ''}`}>Log Pain</span>
            </>
          )}
        </NavLink>

        {/* Ask Kaapu — centre highlight, icon only */}
        <NavLink to="/ai"
          className="flex flex-col items-center px-3 py-1 rounded-xl transition-all duration-200"
        >
          {({ isActive }) => (
            <div className={`p-2.5 rounded-full transition-all ${
              isActive
                ? 'bg-indigo-600 shadow-lg shadow-indigo-200'
                : 'bg-indigo-100 hover:bg-indigo-200'
            }`}>
              <Sparkles size={20} strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-white' : 'text-indigo-500'} />
            </div>
          )}
        </NavLink>

        {/* Timeline */}
        <NavLink to="/history"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <BookOpen size={19} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-gray-700' : ''}`}>Timeline</span>
            </>
          )}
        </NavLink>

        {/* People */}
        <NavLink to="/family" data-tour="nav-family"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <Users size={19} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-gray-700' : ''}`}>People</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
