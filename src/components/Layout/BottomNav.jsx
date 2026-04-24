import { NavLink } from 'react-router-dom'
import { Home, Activity, BookOpen, Users } from 'lucide-react'

const links = [
  { to: '/',         icon: Home,     label: 'Home'    },
  { to: '/body-map', icon: Activity, label: 'Body Map'},
  { to: '/history',  icon: BookOpen, label: 'Health'  },
  { to: '/family',   icon: Users,    label: 'People'  },
]

export default function BottomNav() {
  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-1 pt-2 pb-3 max-w-lg mx-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
                isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-white shadow-sm' : ''
                }`}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[9px] font-semibold ${isActive ? 'text-gray-700' : ''}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
