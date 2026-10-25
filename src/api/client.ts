/**
 * Getypte fetch-laag voor de koppeling met studiemaat.nl (/api/v1/mobile/...).
 *
 * - Zet EXPO_PUBLIC_API_BASE_URL voor elk pad
 * - Stuurt het sessietoken mee als `Authorization: Bearer` en het vaste apparaatnummer als header
 * - Geeft altijd een ApiResult terug (geen try/catch nodig bij de aanroeper)
 * - Bij 401 (sessie verlopen of uitgelogd op een ander apparaat) wordt het token gewist en
 *   krijgt de auth-context een seintje, zodat de app terug naar het inlogscherm gaat.
 *
 * Anders dan bij bieden.nl is er geen refresh-token: een sessie van Studiemaat duurt 400 dagen en
 * wordt bij gebruik vanzelf verlengd (net als op de website).
 */

import { clearSession, getDeviceId, getToken } from '@/lib/storage'
import type { ApiResult } from './types'

// Standaard de echte website; EXPO_PUBLIC_API_BASE_URL alleen zetten om tegen een andere server te testen.
// (Bij bieden.nl crashte een build zonder deze variabele; hier valt hij terug op studiemaat.nl.)
export const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://studiemaat.nl/api/v1').replace(/\/$/, '')

const NETWORK_ERROR = 'Geen verbinding. Controleer je internet en probeer het opnieuw.'

let onUnauthorized: (() => void) | null = null

/** De auth-context luistert hiermee naar een verlopen sessie. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Wordt als JSON verstuurd; FormData gaat ongewijzigd mee (uploads). */
  body?: unknown
  /** false: geen Authorization-header (inloggen, versiecontrole) */
  auth?: boolean
}

/** Headers die bij elk verzoek horen (ook voor afbeeldingen via expo-image). */
export async function authHeaders(): Promise<Record<string, string>> {
  const [token, device] = await Promise.all([getToken(), getDeviceId()])
  return {
    'x-studiemaat-device': device,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<ApiResult<T>> {
  const { auth = true, body, headers: rawHeaders, ...rest } = options
  const headers = new Headers(rawHeaders)
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')
  const extra = await authHeaders()
  for (const [k, v] of Object.entries(extra)) {
    if (k === 'Authorization' && !auth) continue
    headers.set(k, v)
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    })
  } catch {
    return { ok: false, status: 0, error: { code: 'NETWORK_ERROR', message: NETWORK_ERROR } }
  }

  if (res.status === 401 && auth) {
    await clearSession()
    onUnauthorized?.()
  }

  let data: unknown = undefined
  try {
    data = await res.json()
  } catch {
    // Geen JSON (bv. een storingspagina van Vercel)
  }

  if (res.ok) return { ok: true, data: data as T }

  const message =
    data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error
      : res.status >= 500
        ? 'Er ging iets mis bij Studiemaat. Probeer het zo nog eens.'
        : 'Er ging iets mis.'
  const code =
    res.status === 401 ? 'UNAUTHORIZED' : res.status === 402 ? 'NO_ACCESS' : res.status === 429 ? 'LIMIT' : 'API_ERROR'
  return { ok: false, status: res.status, error: { code, message } }
}
