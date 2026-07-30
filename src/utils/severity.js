// Shared 6-point severity scale (1-6, one word per number) — the slider in
// SymptomForm goes 1 to 6 to match exactly, so there's no "two numbers, one
// word" ambiguity. Everywhere a severity value is shown to a user, it's
// shown as this tier word instead of a raw number (log views, GP report,
// AI context, emergency/doctor/dashboard displays).
export function severityLabel(sev) {
  if (sev >= 6) return 'Very Severe'
  if (sev >= 5) return 'Severe'
  if (sev >= 4) return 'Moderate-Severe'
  if (sev >= 3) return 'Moderate'
  if (sev >= 2) return 'Mild-Moderate'
  return 'Mild'
}

export function severityColor(sev) {
  if (sev >= 6) return '#b91c1c' // dark red   — Very Severe
  if (sev >= 5) return '#ef4444' // red        — Severe
  if (sev >= 4) return '#f97316' // orange     — Moderate-Severe
  if (sev >= 3) return '#f59e0b' // amber      — Moderate
  if (sev >= 2) return '#84cc16' // lime       — Mild-Moderate
  return '#10b981'               // green      — Mild
}

// "Danger" / "warning" thresholds used for alerts, banners, and badge colors
// across the app. On the old 1-10 scale these were severity>=7 and >=5;
// rescaled to 1-6 so a value of 6 (now the max) still reads as urgent.
export const SEVERITY_HIGH_THRESHOLD = 5   // Severe or Very Severe
export const SEVERITY_MID_THRESHOLD  = 3   // Moderate or worse
