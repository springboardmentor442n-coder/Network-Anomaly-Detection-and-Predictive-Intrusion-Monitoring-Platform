/**
 * Authentication context.
 *
 * Holds the token plus the resolved user profile (including role), so route
 * guards can enforce RBAC on the client. The backend enforces it too - the
 * client guard only avoids showing links that would 403.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.get()))

  const loadProfile = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const profile = await api.me()
      setUser(profile)
      return profile
    } catch {
      tokenStore.clear()
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const login = useCallback(
    async (email, password) => {
      const { access_token } = await api.login(email, password)
      tokenStore.set(access_token)
      return loadProfile()
    },
    [loadProfile],
  )

  const register = useCallback(
    async (email, password) => {
      const { access_token } = await api.register(email, password)
      tokenStore.set(access_token)
      return loadProfile()
    },
    [loadProfile],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* logout is best-effort; the token is discarded either way */
    }
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
