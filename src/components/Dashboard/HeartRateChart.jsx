import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { HEART_RATE_DATA } from '../../data/mockData'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card text-xs rounded-xl px-3 py-2">
      <p className="font-bold text-rose-500">♥ {payload[0]?.value} bpm</p>
    </div>
  )
}

// Candlestick-style bars matching reference design
function CandleBar({ x, y, width, high, low, bpm, maxBpm, minBpm, chartHeight }) {
  const scaleY = (v) => chartHeight - ((v - minBpm) / (maxBpm - minBpm)) * chartHeight
  const isHigh = bpm > 90
  return (
    <g>
      <line x1={x + width / 2} y1={scaleY(high)} x2={x + width / 2} y2={scaleY(low)}
        stroke={isHigh ? '#ef4444' : '#374151'} strokeWidth={1.5} strokeLinecap="round" />
      <rect x={x + 1} y={Math.min(scaleY(bpm), scaleY(bpm - 5))}
        width={width - 2} height={5}
        fill={isHigh ? '#ef4444' : '#374151'} rx={1.5} />
    </g>
  )
}

export default function HeartRateChart() {
  // Use a slice of 14 days for cleaner display
  const data = HEART_RATE_DATA.slice(-14)
  const current = data[data.length - 1]

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Heart Rate Analysis</h3>
          <p className="text-xs text-gray-400">Compare last month</p>
        </div>
        <button className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-1">
          Month <span className="text-[10px]">▾</span>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl font-bold text-gray-800">♥</span>
        <span className="text-3xl font-bold text-gray-800">{current.bpm}</span>
        <div className="ml-1">
          <p className="text-xs text-gray-400">Current BPM</p>
          <p className="text-[10px] text-rose-400">Peak {current.high} / Low {current.low}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
          <XAxis dataKey="day" tick={false} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 8, fill: '#e5e7eb' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            dataKey="bpm"
            stroke="#374151"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
          />
          <Line dataKey="high" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="2 3" />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex justify-between text-[10px] text-gray-300 mt-1 px-1">
        {['1 May', '7 May', '14 May', '21 May', '28 May'].map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  )
}
