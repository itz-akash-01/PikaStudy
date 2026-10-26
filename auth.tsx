import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  user: User | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}
const Ctx = createContext<AuthState | null>(null)

async function fetchIsAdmin(user: User | null) {
  if (!supabase || !user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return data?.role === 'admin'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    const apply = async (u: User | null) => { setUser(u); setIsAdmin(await fetchIsAdmin(u)); setLoading(false) }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { void apply(session?.user ?? null) })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn: AuthState['signIn'] = async (email, password) => {
    if (!supabase) return 'Admin login needs Supabase. See the README.'
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return 'Wrong email or password.'
    if (!(await fetchIsAdmin(data.user))) { await supabase.auth.signOut(); return 'This account is not an administrator.' }
    return null
  }
  const signOut = async () => { await supabase?.auth.signOut() }

  return <Ctx.Provider value={{ user, isAdmin, loading, signIn, signOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
