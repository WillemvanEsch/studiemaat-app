/**
 * Sentry crash reporting bootstrap.
 *
 * Why: when the app crashes on a user's device we need to know
 * about it. Without Sentry the user reinstalls, never comes back,
 * we never find out. With Sentry we get stack traces + device info
 * + breadcrumbs of what they did before it broke.
 *
 * When it fires:
 *   - Uncaught JS exceptions (anywhere in the app)
 *   - Native crashes (iOS exception, Android fatal)
 *   - Manually via `Sentry.captureException(err)` or
 *     `Sentry.captureMessage('event')`
 *
 * Skipped in __DEV__ so we don't pollute production-event dashboards
 * with our own dev crashes. Also skipped if no DSN is set (e.g. local
 * Metro without env) so a missing config never blocks app startup.
 *
 * The DSN is project-specific — get it from sentry.io after creating
 * the project, set as EXPO_PUBLIC_SENTRY_DSN in EAS env (preview +
 * production).
 */

import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

let initialized = false

export function initSentry() {
  if (initialized) return
  if (__DEV__) {
    if (dsn) console.log('[Sentry] dev mode — skipping init')
    return
  }
  if (!dsn) {
    console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled')
    return
  }

  Sentry.init({
    dsn,
    // Tag releases by app version so Sentry can group errors per
    // release and we can confirm a fix landed in the right build.
    release: Constants.expoConfig?.version ?? undefined,
    // EAS-managed runtime; keep buffering off for snappier delivery
    // and the default sampler at 1 (all errors captured).
    tracesSampleRate: 0.2,
    // Enable performance profiling on a sample — low cost, useful
    // for spotting slow screens after launch.
    enableAutoSessionTracking: true,
    // Don't ship breadcrumbs from console.log (noisy) — only
    // network + navigation + lifecycle.
    integrations: (def) => def.filter((i) => i.name !== 'Console'),
  })

  initialized = true
  console.log('[Sentry] initialised')
}

/**
 * Re-export so consumers can import everything from one place.
 * Use `Sentry.captureException(err)` for caught errors that you
 * want to record but not let crash the app.
 */
export { Sentry }
