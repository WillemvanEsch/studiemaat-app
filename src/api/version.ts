import { apiFetch } from './client'
import type { VersionCheck } from './types'

/** Is deze versie van de app nog goed genoeg? (blokkeren, melding of niets) */
export const fetchVersionCheck = () => apiFetch<VersionCheck>('/mobile/version-check', { auth: false })
