import { apiFetch } from './client'
import type { Difficulty, Invite, Me, Options, ScanOptions } from './types'

export const fetchMe = () => apiFetch<Me>('/mobile/me')

export const fetchOptions = () => apiFetch<Options>('/mobile/options', { auth: false })

export interface UpdateMeInput {
  name?: string
  level?: string | null
  year?: number | null
  difficulty?: Difficulty
  scan?: ScanOptions
}

export const updateMe = (input: UpdateMeInput) => apiFetch<Me>('/mobile/me', { method: 'PATCH', body: input })

/** deleted: meteen weg. requested: de beheerder handelt het af (bv. bij betaalde periodes). */
export const deleteAccount = () =>
  apiFetch<{ deleted: boolean; requested?: boolean; message?: string }>('/mobile/me', { method: 'DELETE' })

export const fetchInvites = () => apiFetch<{ invites: Invite[]; max: number; friendDays: number }>('/mobile/invites')

export const sendInvite = (email: string) => apiFetch<{ sent: string }>('/mobile/invites', { method: 'POST', body: { email } })
