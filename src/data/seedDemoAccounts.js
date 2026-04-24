/**
 * Seeds demo accounts into localStorage on first load.
 * Called once from main.jsx.
 */
export function seedDemoAccounts() {
  const USERS_KEY = 'ht_users'
  const existing  = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')

  const demos = [
    {
      id: 'usr-demo-family',
      email: 'demo@family.com',
      password: 'demo123',
      name: 'Olga Morgan',
      role: 'user',
      familyId: 'fam-demo',
    },
    {
      id: 'usr-demo-doctor',
      email: 'doctor@health.com',
      password: 'doc123',
      name: 'Sarah Chen',
      role: 'doctor',
      familyId: 'fam-doctor',
    },
  ]

  const merged = [...existing]
  demos.forEach(demo => {
    if (!existing.find(u => u.email === demo.email)) merged.push(demo)
  })

  localStorage.setItem(USERS_KEY, JSON.stringify(merged))
}
