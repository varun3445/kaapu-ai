import { motion } from 'framer-motion'

export default function MetricCard({ icon, label, value, unit, sub, color = '#4f46e5', bg = '#eef2ff', trend }) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="glass-card rounded-2xl p-4 card-hover flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: bg }}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] text-black/75 font-medium">{label}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-xl font-bold text-black">{value}</span>
          {unit && <span className="text-xs text-black/75 font-medium">{unit}</span>}
        </div>
        {sub && <p className="text-[10px] text-black/75 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}
