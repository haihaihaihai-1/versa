// ============== Auth React Context ==============

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import api, { initAPI } from './index'
import type { User } from './types'
import { useStoreVersion } from './useStore'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<User>
  signUp: (input: { username: string; email?: string; password: string; displayName?: string }) => Promise<User>
  signOut: () => Promise<void>
  updateMe: (patch: Partial<User>) => Promise<User>
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // useStoreVersion forces re-render when store changes (login, profile update, etc.)
  useStoreVersion()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    initAPI()
    setUser(api.auth.current())
    setLoading(false)
  }, [])

  // Subscribe to auth changes (e.g. after sign in from another tab/window)
  useEffect(() => {
    const unsubscribe = api.auth.onChange(() => {
      setUser(api.auth.current())
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const { user } = await api.auth.signIn(username, password)
    setUser(user)
    return user
  }, [])

  const signUp = useCallback(async (input: { username: string; email?: string; password: string; displayName?: string }) => {
    const { user } = await api.auth.signUp(input)
    setUser(user)
    return user
  }, [])

  const signOut = useCallback(async () => {
    await api.auth.signOut()
    setUser(null)
  }, [])

  const updateMe = useCallback(async (patch: Partial<User>) => {
    const u = await api.auth.updateMe(patch)
    setUser(u)
    return u
  }, [])

  const refresh = useCallback(() => {
    setUser(api.auth.current())
  }, [])

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut, updateMe, refresh }), [user, loading, signIn, signUp, signOut, updateMe, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
