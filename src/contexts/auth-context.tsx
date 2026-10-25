/**
 * Wie er is ingelogd, voor de hele app.
 *
 * Opstarten: staan er een token en accountgegevens in de beveiligde opslag, dan zijn we meteen ingelogd en
 * laten we de bewaarde gegevens zien; op de achtergrond halen we de actuele stand op (toegang kan veranderd zijn).
 * Een 401 van de server (sessie weg) zet de app terug naar het inlogscherm.
 *
 * Inloggen gaat in twee stappen, net als op de website: mailadres → code per mail → code invullen.
 */

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  fetchMe,
  logout as apiLogout,
  requestCode as apiRequestCode,
  setUnauthorizedHandler,
  verifyCode as apiVerifyCode,
} from '@/api'
import type { ApiResult, Me } from '@/api'
import { setupPushNotifications, tearDownPushNotifications } from '@/lib/push-notifications'
import { startPurchases, stopPurchases } from '@/lib/purchases'
import { clearLoginSecret, clearSession, getMe, getToken, loginSecret, saveMe, saveSession } from '@/lib/storage'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  me: Me | null
  /** Stap 1. existing: geen nieuwe code, alleen verder met een code die al onderweg is. */
  requestCode(email: string, existing?: boolean): Promise<ApiResult<{ email: string; note: string | null }>>
  /** Stap 2. Bij succes is status meteen 'authenticated'. */
  verifyCode(email: string, code: string): Promise<ApiResult<{ isNew: boolean }>>
  logout(): Promise<void>
  /** Actuele stand van het account ophalen (na betalen, instellingen enz.). */
  refreshMe(): Promise<void>
  setMe(me: Me): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [me, setMeState] = useState<Me | null>(null)

  const signedOut = useCallback(() => {
    setMeState(null)
    setStatus('unauthenticated')
    queryClient.clear()
  }, [queryClient])

  const refreshMe = useCallback(async () => {
    const r = await fetchMe()
    if (r.ok) {
      setMeState(r.data)
      await saveMe(r.data)
    }
  }, [])

  // Opstarten
  useEffect(() => {
    let cancelled = false
    setUnauthorizedHandler(() => signedOut())
    ;(async () => {
      const [token, cached] = await Promise.all([getToken(), getMe()])
      if (cancelled) return
      if (token && cached) {
        setMeState(cached)
        setStatus('authenticated')
        refreshMe().catch(() => {})
        // Token kan veranderen (herinstallatie); de server werkt bij, dus elke start opnieuw is veilig.
        setupPushNotifications().catch(() => {})
      } else {
        await clearSession()
        setStatus('unauthenticated')
      }
    })()
    return () => {
      cancelled = true
      setUnauthorizedHandler(null)
    }
  }, [refreshMe, signedOut])

  const requestCode = useCallback(async (email: string, existing = false) => {
    // Nieuwe code = nieuw geheim; "ik heb al een code" = het geheim van de vorige aanvraag.
    const secret = await loginSecret(!existing)
    return apiRequestCode(email, secret, existing)
  }, [])

  const verifyCode = useCallback(async (email: string, code: string): Promise<ApiResult<{ isNew: boolean }>> => {
    const secret = await loginSecret(false)
    const r = await apiVerifyCode(email, code, secret)
    if (!r.ok) return r
    const { token, isNew, ...rest } = r.data
    await saveSession(token, rest)
    await clearLoginSecret()
    setMeState(rest)
    setStatus('authenticated')
    setupPushNotifications().catch(() => {})
    return { ok: true, data: { isNew } }
  }, [])

  const logout = useCallback(async () => {
    // Eerst push afmelden: daarvoor is het token nog nodig.
    await tearDownPushNotifications()
    await apiLogout(null)
    await clearSession()
    signedOut()
  }, [signedOut])

  const setMe = useCallback(async (next: Me) => {
    await saveMe(next)
    setMeState(next)
  }, [])

  // Aankopen in de app: alleen luisteren als er iemand is ingelogd (de aankoop moet aan een account gekoppeld worden).
  // Onafgeronde aankopen (bv. app gesloten tijdens het betalen) komen dan alsnog binnen.
  useEffect(() => {
    if (status === 'authenticated') startPurchases((next) => void setMe(next))
    else if (status === 'unauthenticated') stopPurchases()
  }, [status, setMe])

  const value = useMemo<AuthContextValue>(
    () => ({ status, me, requestCode, verifyCode, logout, refreshMe, setMe }),
    [status, me, requestCode, verifyCode, logout, refreshMe, setMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth moet binnen <AuthProvider> gebruikt worden')
  return ctx
}
