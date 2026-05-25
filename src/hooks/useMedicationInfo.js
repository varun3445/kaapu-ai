import { useState, useEffect } from 'react'
import { findMedication } from '../data/medicationInfo'
import { supabase, supabaseReady } from '../supabase'

/**
 * Returns medication info for a given name.
 * 1. Checks static dictionary instantly.
 * 2. Falls back to Supabase Edge Function (Claude API) after 800ms debounce
 *    — only if name isn't in the dictionary and is at least 3 chars.
 *
 * Returns: { info: { name, drugClass, description, uses } | null, loading: bool }
 */
export default function useMedicationInfo(name) {
  const [info,    setInfo]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setInfo(null)
    setLoading(false)

    const trimmed = (name || '').trim()
    if (trimmed.length < 3) return

    // ── 1. Static dictionary (instant) ──────────────────────────────────────
    const staticMatch = findMedication(trimmed)
    if (staticMatch) {
      setInfo(staticMatch)
      return
    }

    // ── 2. AI fallback (debounced 800ms) ────────────────────────────────────
    if (!supabaseReady || !supabase) return

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('med-info', {
          body: { medication: trimmed },
        })
        if (!error && data?.name) {
          setInfo(data)
        }
      } catch (_) {
        // Edge function not deployed or API key not set — fail silently
      } finally {
        setLoading(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [name])

  return { info, loading }
}
