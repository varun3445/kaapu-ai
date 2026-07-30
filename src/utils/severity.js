// Shared 6-tier severity wording, used everywhere a severity value is shown
// to a user — a raw "5/10" reads as more clinically precise than a
// self-reported slider actually is, so every surface (log views, GP report,
// AI context, emergency/doctor/dashboard displays) shows the tier instead.
export function severityLabel(sev) {
  if (sev >= 10) return 'Very Severe'
  if (sev >= 8)  return 'Severe'
  if (sev >= 7)  return 'Moderate-Severe'
  if (sev >= 5)  return 'Moderate'
  if (sev >= 3)  return 'Mild-Moderate'
  return 'Mild'
}

export function severityColor(sev) {
  if (sev >= 10) return '#b91c1c' // dark red   — Very Severe
  if (sev >= 8)  return '#ef4444' // red        — Severe
  if (sev >= 7)  return '#f97316' // orange     — Moderate-Severe
  if (sev >= 5)  return '#f59e0b' // amber      — Moderate
  if (sev >= 3)  return '#84cc16' // lime       — Mild-Moderate
  return '#10b981'                // green      — Mild
}
