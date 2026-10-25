/**
 * Native push notifications — permission, token registration, handlers.
 *
 * Lifecycle:
 *   - After login: `setupPushNotifications()` is called from
 *     auth-context. Asks for permission (iOS) → fetches Expo push
 *     token → POSTs to /api/v1/mobile/push/register.
 *   - Before logout: `tearDownPushNotifications()` is called. POSTs
 *     to /api/v1/mobile/push/unregister so the backend stops sending
 *     to this device for the old user.
 *   - At app start (via _layout): `attachNotificationHandlers()`
 *     installs the foreground display config + tap listener.
 *
 * Deep linking:
 *   The backend stores a web-style path in `data.url` (e.g.
 *   `/les/12`). On tap we
 *   translate that path to the matching Expo Router route and call
 *   `router.push()`. See `routeFromUrl()` for the mapping.
 *
 * Failure handling:
 *   Permission denied / simulator (no token possible) / server error
 *   → log and continue. Push is best-effort: missing it shouldn't
 *   break login.
 */

import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { Platform } from 'react-native'

import { registerPushToken, unregisterPushToken } from '@/api'

let handlersAttached = false
let lastRegisteredToken: string | null = null

/**
 * Display foreground notifications as banners (iOS) and play sound.
 * Without this, push that arrives while the app is open is silent +
 * invisible. We want visibility — bid notifications can come fast.
 *
 * `shouldSetBadge: false`: Studiemaat gebruikt (nog) geen badge op het app-icoon.
 * (Bij bieden.nl staat dit aan:) the backend sets the badge
 * count on every push payload (computeUnreadCount in bieden/lib/...).
 * Letting iOS apply that automatically keeps the app icon badge in
 * sync without us doing extra work on every push receipt.
 */
function configureForegroundBehavior() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

/**
 * Android (API 26+) requires an explicit notification channel for
 * heads-up banners + sound. Without one, FCM messages land in a silent
 * low-importance default channel and the user barely notices them. iOS
 * has no channel concept, so this is a no-op there.
 *
 * The channel id `default` matches what the backend sends (Expo's
 * default when no channelId is set on the push payload). Best-effort:
 * a failure here must never block push setup.
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Meldingen',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#25916F',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
  } catch (err) {
    console.warn('[Push] Android channel setup failed (ignored):', err)
  }
}

/**
 * Pad uit het pushbericht (data.url, zelfde paden als de website) naar het scherm in de app.
 *   /les/<id>    → /les/<id>
 *   /toets/<id>  → /toets/<id>
 *   anders       → /(tabs)
 */
function routeFromUrl(url: string | undefined): string {
  if (!url) return '/(tabs)'
  const lesson = url.match(/^\/les\/(\d+)/)
  if (lesson) return `/les/${lesson[1]}`
  const test = url.match(/^\/toets\/(\d+)/)
  if (test) return `/toets/${test[1]}`
  return '/(tabs)'
}

/**
 * Install foreground + tap handlers. Idempotent — safe to call from
 * _layout.tsx on every render via a useEffect. Uses the imperative
 * `router` import from expo-router, which works as long as the
 * navigator has mounted by the time a notification arrives (true for
 * any post-cold-start tap; for cold start we delay the route by a
 * tick to let the layout settle).
 */
export function attachNotificationHandlers() {
  if (handlersAttached) return
  handlersAttached = true

  configureForegroundBehavior()
  // Fire-and-forget — the channel must exist before any push arrives,
  // but setup shouldn't block handler registration. No-op on iOS.
  ensureAndroidChannel()

  // Tap on a notification (foreground or background) → deeplink.
  Notifications.addNotificationResponseReceivedListener((response) => {
    const url = (response.notification.request.content.data as { url?: string })
      ?.url
    const target = routeFromUrl(url)
    try {
      router.push(target as never)
    } catch (err) {
      console.warn('[Push] router.push failed for', target, err)
    }
  })

  // Cold-start: app was launched by tapping a notification → also route.
  // Defer one tick so the root layout has mounted.
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return
    const url = (response.notification.request.content.data as { url?: string })
      ?.url
    const target = routeFromUrl(url)
    setTimeout(() => {
      try {
        router.push(target as never)
      } catch (err) {
        console.warn('[Push] cold-start route failed for', target, err)
      }
    }, 100)
  })
}

/**
 * Request permission, fetch Expo push token, and register it server-side.
 *
 * Called from auth-context after a successful login. Returns the token
 * (or null if registration was skipped/failed) so the caller can stash
 * it for later unregister.
 */
export async function setupPushNotifications(): Promise<string | null> {
  // Push requires a real device — simulators don't get tokens.
  if (!Device.isDevice) {
    console.log('[Push] Simulator detected, skipping registration')
    return null
  }

  try {
    const existing = await Notifications.getPermissionsAsync()
    let granted = existing.status === 'granted'
    if (!granted && existing.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync()
      granted = req.status === 'granted'
    }
    if (!granted) {
      console.log('[Push] Permission not granted, skipping registration')
      return null
    }

    // EAS injects the project id; expo-notifications needs it to mint
    // an Expo push token (not a raw APNS/FCM token).
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId
    if (!projectId) {
      console.warn('[Push] No EAS projectId in app.json/Constants, cannot fetch token')
      return null
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId })
    const expoToken = tokenResponse.data
    if (!expoToken) {
      console.warn('[Push] Empty token from Expo')
      return null
    }

    const r = await registerPushToken(expoToken, Platform.OS === 'ios' ? 'ios' : 'android')
    if (!r.ok) {
      console.warn('[Push] Server-side register failed:', r.error.message)
      return null
    }

    console.log('[Push] Registered token', expoToken.substring(0, 30) + '...')
    lastRegisteredToken = expoToken
    return expoToken
  } catch (err) {
    console.warn('[Push] setup failed:', err)
    return null
  }
}

/**
 * Best-effort cleanup before logout. Tells the server to stop sending
 * pushes for this token. Idempotent on the server side.
 *
 * Also clears the iOS app icon badge — otherwise the previous user's
 * unread count would linger on the icon after the next user logs in.
 */
export async function tearDownPushNotifications(): Promise<void> {
  Notifications.setBadgeCountAsync(0).catch(() => {})
  if (!lastRegisteredToken) return
  try {
    await unregisterPushToken(lastRegisteredToken)
  } catch (err) {
    console.warn('[Push] unregister failed (ignored):', err)
  } finally {
    lastRegisteredToken = null
  }
}
