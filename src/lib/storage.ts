/**
 * Veilige opslag via expo-secure-store (iOS Keychain / Android Keystore).
 * Sleutels beginnen met `studiemaat_`. Nooit direct expo-secure-store gebruiken in componenten.
 */

import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'

import type { Me } from '@/api/types'

const TOKEN_KEY = 'studiemaat_token'
const ME_KEY = 'studiemaat_me'
const DEVICE_KEY = 'studiemaat_device'
const LOGIN_SECRET_KEY = 'studiemaat_login_secret'
const AI_CONSENT_KEY = 'studiemaat_ai_consent'

/** Willekeurige tekst van letters, cijfers, - en _ (zoals de website verwacht). */
function randomId(bytes: number): string {
  const raw = Crypto.getRandomBytes(bytes)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  return Array.from(raw, (b) => alphabet[b % 64]).join('')
}

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY)

export async function saveSession(token: string, me: Me) {
  await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), saveMe(me)])
}

export async function clearSession() {
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(ME_KEY)])
}

/** Laatst bekende accountgegevens, zodat de app meteen iets kan laten zien bij het opstarten. */
export const saveMe = (me: Me) => SecureStore.setItemAsync(ME_KEY, JSON.stringify(me))

export async function getMe(): Promise<Me | null> {
  const raw = await SecureStore.getItemAsync(ME_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Me
  } catch {
    return null
  }
}

/** Vast apparaatnummer van deze installatie (zoals de cookie sm_apparaat op de website). */
let deviceCache: string | null = null
export async function getDeviceId(): Promise<string> {
  if (deviceCache) return deviceCache
  let id = await SecureStore.getItemAsync(DEVICE_KEY)
  if (!id) {
    id = randomId(16)
    await SecureStore.setItemAsync(DEVICE_KEY, id)
  }
  deviceCache = id
  return id
}

/**
 * Geheim van de lopende inlogpoging. De mailcode werkt alleen samen met dit geheim, zodat iemand die
 * de mail ziet er op een ander apparaat niets mee kan. Na inloggen weg.
 */
export async function loginSecret(fresh: boolean): Promise<string> {
  const have = fresh ? null : await SecureStore.getItemAsync(LOGIN_SECRET_KEY)
  if (have) return have
  const secret = randomId(32)
  await SecureStore.setItemAsync(LOGIN_SECRET_KEY, secret)
  return secret
}

export const clearLoginSecret = () => SecureStore.deleteItemAsync(LOGIN_SECRET_KEY)

/** Toestemming om foto's door een AI te laten verwerken (verplicht van Apple, eenmalig per installatie). */
export const hasAiConsent = async () => (await SecureStore.getItemAsync(AI_CONSENT_KEY)) === 'ja'
export const saveAiConsent = () => SecureStore.setItemAsync(AI_CONSENT_KEY, 'ja')

/** Weergave van de app: automatisch (zoals de telefoon), licht of donker. Alleen op dit toestel. */
export type Weergave = 'auto' | 'licht' | 'donker'
const WEERGAVE_KEY = 'studiemaat_weergave'
export async function getWeergave(): Promise<Weergave> {
  const v = await SecureStore.getItemAsync(WEERGAVE_KEY)
  return v === 'licht' || v === 'donker' ? v : 'auto'
}
export const saveWeergave = (v: Weergave) => SecureStore.setItemAsync(WEERGAVE_KEY, v)
