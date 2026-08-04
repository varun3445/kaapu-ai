import { NavLink } from 'react-router-dom'
import navHomeIcon from '../../assets/icons/nav-home.svg'
import navLogPainIcon from '../../assets/icons/nav-logpain.svg'
import navSparklesIcon from '../../assets/icons/nav-sparkles.svg'
import navTimelineIcon from '../../assets/icons/nav-timeline.svg'
import navPeopleIcon from '../../assets/icons/nav-people.svg'

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
              isActive ? 'text-black' : 'text-black/75 hover:text-black/75'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <img src={navHomeIcon} alt="" className={`w-6 h-6 transition-opacity ${isActive ? 'opacity-100' : 'opacity-75'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-black/80' : ''}`}>Home</span>
            </>
          )}
        </NavLink>

        {/* Log Pain */}
        <NavLink to="/log-pain"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-black' : 'text-black/75 hover:text-black/75'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <img src={navLogPainIcon} alt="" className={`w-6 h-6 transition-opacity ${isActive ? 'opacity-100' : 'opacity-75'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-black/80' : ''}`}>Log Pain</span>
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
                ? 'bg-[#4f46e5] shadow-lg shadow-indigo-200'
                : 'bg-[rgba(79,70,229,0.1)] hover:bg-[rgba(79,70,229,0.18)]'
            }`}>
              <img src={navSparklesIcon} alt="" className="w-5 h-5"
                style={isActive ? { filter: 'brightness(0) invert(1)' } : undefined} />
            </div>
          )}
        </NavLink>

        {/* Timeline */}
        <NavLink to="/history"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-black' : 'text-black/75 hover:text-black/75'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <img src={navTimelineIcon} alt="" className={`w-6 h-6 transition-opacity ${isActive ? 'opacity-100' : 'opacity-75'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-black/80' : ''}`}>Timeline</span>
            </>
          )}
        </NavLink>

        {/* People */}
        <NavLink to="/family" data-tour="nav-family"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-black' : 'text-black/75 hover:text-black/75'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm' : ''}`}>
                <img src={navPeopleIcon} alt="" className={`w-6 h-6 transition-opacity ${isActive ? 'opacity-100' : 'opacity-75'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-black/80' : ''}`}>People</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
