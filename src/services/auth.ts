import { supabase } from '../lib/supabase'

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function updateProfile(userId: string, updates: { username?: string; avatar_url?: string | null }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(20)
  if (error) throw error
  return data || []
}

export async function updateLastSeen(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', userId)
  if (error) console.error('Failed to update last_seen:', error)
}
