import { apiFetch } from './client'

export type PushPlatform = 'ios' | 'android'

/** Expo push token van deze telefoon koppelen (de server werkt bij als hij al bestaat). */
export const registerPushToken = (token: string, platform: PushPlatform) =>
  apiFetch<{ ok: true }>('/mobile/push/register', { method: 'POST', body: { token, platform } })

export const unregisterPushToken = (token: string) =>
  apiFetch<{ ok: true }>('/mobile/push/unregister', { method: 'POST', body: { token } })
