import { apiFetch } from './client'
import type { ApiResult, Session } from './types'

/** Stap 1: code per mail. loginSecret is het geheim van deze inlogpoging (zie lib/storage). */
export function requestCode(email: string, loginSecret: string, existing = false) {
  return apiFetch<{ ok: true; email: string; note: string | null }>('/mobile/auth/code', {
    method: 'POST',
    auth: false,
    body: { email, loginSecret, existing },
  })
}

/** Stap 2: code controleren; geeft het sessietoken en het account terug. */
export function verifyCode(email: string, code: string, loginSecret: string): Promise<ApiResult<Session>> {
  return apiFetch<Session>('/mobile/auth/verify', { method: 'POST', auth: false, body: { email, code, loginSecret } })
}

export function logout(pushToken: string | null) {
  return apiFetch<{ ok: true }>('/mobile/auth/logout', { method: 'POST', body: { pushToken } })
}
