import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { supabase } from '../lib/supabase'
import { onAuthStateChange, getProfile, updateLastSeen } from '../services/auth'
import { Profile } from '../types'

interface AuthContextType {
  user: any
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        getProfile(session.user.id).then((p) => setProfile(p)).catch(console.error)
      }
      setLoading(false)
    })

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        getProfile(session.user.id).then((p) => setProfile(p)).catch(console.error)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    updateLastSeen(user.id)
    const interval = setInterval(() => {
      updateLastSeen(user.id)
    }, 60000)

    return () => clearInterval(interval)
  }, [user])

  // Use React Native AppState instead of document.visibilitychange
  useEffect(() => {
    if (!user) return

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        updateLastSeen(user.id)
      }
    }

    const subscription = AppState.addEventListener('change', handleAppState)
    return () => subscription.remove()
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await getProfile(user.id)
      setProfile(p)
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
