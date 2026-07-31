/**
 * Mock supabase client for Storybook.
 * Returns empty/resolved promises so any component that imports supabase directly
 * doesn't crash during story render.
 */
const noop = async () => ({ data: null, error: null })

export const supabase = {
  auth: {
    getSession: noop,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: noop,
    signUp: noop,
    signOut: noop,
    signInWithOAuth: noop,
  },
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: noop,
    update: noop,
    delete: noop,
    eq: function() { return this },
    order: function() { return this },
    limit: function() { return this },
    single: noop,
  }),
  channel: () => ({
    on: function() { return this },
    subscribe: () => {},
  }),
  removeChannel: noop,
}

export const supabaseReady = Promise.resolve(supabase)
