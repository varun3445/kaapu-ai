// Shared 3-tier severity wording for user-facing surfaces (log views, GP
// report). A raw "5/10" reads as more clinically precise than a self-reported
// slider actually is — show the tier instead. Not used for AI context strings
// or doctor-portal numeric displays, where the precise value still matters.
export function severityLabel(sev) {
  if (sev >= 7) return 'Severe'
  if (sev >= 4) return 'Moderate'
  return 'Mild'
}
