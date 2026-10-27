/**
 * Version comparison + force-update helpers.
 *
 * Backend `/api/v1/mobile/version-check` returnt `minSupported` en
 * `recommended` als semver-strings (e.g. "1.2.3"). Vergelijk met de
 * lokale `Constants.expoConfig.version` om te bepalen of we moeten
 * blokkeren ("force-update"), waarschuwen ("soft-update"), of niets
 * doen ("ok").
 *
 */

import Constants from 'expo-constants'
import { Platform } from 'react-native'

import type { VersionCheck } from '@/api'

// Waar de knop "Bijwerken" heen gaat: de App Store-pagina (Apple ID 6826899921 in App Store Connect).
// Android: de Play Store-pagina van nl.studiemaat.app.
const IOS_STORE_URL = 'https://apps.apple.com/nl/app/id6826899921'
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=nl.studiemaat.app'
export const APP_STORE_URL = Platform.OS === 'android' ? ANDROID_STORE_URL : IOS_STORE_URL
/**
 * Naam van de winkel op dit toestel. In de app noemen we alleen de eigen winkel: Apple keurt een iOS-app af die
 * Android of Google Play noemt (richtlijn 2.3.10), en Google andersom ook liever niet.
 */
export const STORE_NAME = Platform.OS === 'android' ? 'Google Play' : 'de App Store'

export type VersionStatus = 'ok' | 'soft-update' | 'force-update' | 'unknown'

/**
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Treats missing components as 0 ("1.2" === "1.2.0").
 * Ignores anything after the third segment (pre-release suffixes etc.).
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) =>
    v
      .split('.')
      .slice(0, 3)
      .map((n) => parseInt(n, 10) || 0)

  const pa = parse(a)
  const pb = parse(b)
  while (pa.length < 3) pa.push(0)
  while (pb.length < 3) pb.push(0)

  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1
    if (pa[i] > pb[i]) return 1
  }
  return 0
}

export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0'
}

export function getVersionStatus(check: VersionCheck | null): VersionStatus {
  if (!check) return 'unknown'
  const current = getCurrentAppVersion()

  // Below minSupported → must update to keep using the app
  if (compareSemver(current, check.minSupported) < 0) {
    return 'force-update'
  }
  // At-or-above min but below recommended → soft warning
  if (compareSemver(current, check.recommended) < 0) {
    return 'soft-update'
  }
  return 'ok'
}
