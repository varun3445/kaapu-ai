import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { getConditionIcon } from '../Conditions/conditionIcons'

export default function ConditionSelect({ conditions, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = conditions.find(c => c.id === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected && (
            <img src={getConditionIcon(selected)} alt="" className="w-4 h-4 flex-shrink-0" />
          )}
          <span className={selected ? 'text-black truncate' : 'text-black/75'}>
            {selected ? selected.name : 'Not linked to condition'}
          </span>
        </span>
        <ChevronDown size={14} className={`text-black/75 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full flex items-center px-3 py-2.5 text-sm text-black/75 hover:bg-gray-50 transition-colors"
          >
            Not linked to condition
          </button>
          {conditions.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-black hover:bg-gray-50 transition-colors"
            >
              <img src={getConditionIcon(c)} alt="" className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
