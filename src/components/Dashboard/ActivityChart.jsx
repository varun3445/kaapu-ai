import { Smartphone } from 'lucide-react'

export default function ActivityChart({ onConnect }) {
  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      {/* Coming soon overlay */}
      <div className="absolute inset-0 rounded-2xl bg-white/85 backdrop-blur-md z-10 flex flex-col items-center justify-center gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Coming Soon</span>
      </div>
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Activity Tracker</h3>
          <p className="text-xs text-gray-400 mt-0.5">Steps, calories & heart rate</p>
        </div>
      </div>

      {/* Empty state illustration */}
      <div className="flex flex-col items-center text-center py-4 pb-2">
        {/* Faint ghost bars */}
        <div className="flex items-end gap-2 mb-5 opacity-[0.12]" aria-hidden>
          {[40, 65, 50, 80, 45, 70, 55].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-primary-400"
              style={{ height: h }}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(99,102,241,0.09)', border: '0.75px solid rgba(99,102,241,0.15)' }}>
          <Smartphone size={22} className="text-primary-400" />
        </div>

        <p className="text-sm font-bold text-gray-600 mb-1">No activity data yet</p>
        <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
          Connect Apple Health or Google Health Connect to see your steps, calories, and more.
        </p>

        <button
          onClick={onConnect}
          className="mt-4 flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
          }}
        >
          <Smartphone size={14} />
          Connect Health App
        </button>
      </div>
    </div>
  )
}
