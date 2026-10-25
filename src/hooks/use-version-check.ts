/**
 * Polls /api/v1/mobile/version-check at app start + every 30 min
 * while the app is open, and exposes the resulting status.
 *
 * Status transitions matter for UX:
 *   - first fetch on cold-start drives the initial gate (force-update
 *     blocker shows immediately if the build is below minSupported)
 *   - subsequent polls let the gate appear mid-session if the backend
 *     bumps `EXPO_MIN_SUPPORTED_VERSION` while a user is in-app
 *
 * Network failure → status stays `'unknown'`. We deliberately do NOT
 * fall back to "ok" — better to be silent than to assume up-to-date
 * when we can't verify.
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchVersionCheck } from '@/api'
import type { VersionCheck } from '@/api'
import { getCurrentAppVersion, getVersionStatus } from '@/lib/version'
import type { VersionStatus } from '@/lib/version'

const VERSION_QUERY_KEY = ['version-check'] as const

export interface UseVersionCheck {
  status: VersionStatus
  data: VersionCheck | null
  currentVersion: string
}

export function useVersionCheck(): UseVersionCheck {
  const query = useQuery({
    queryKey: VERSION_QUERY_KEY,
    queryFn: async () => {
      const r = await fetchVersionCheck()
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    // Cache stays in memory across remounts (no fresh fetch needed
    // every time the layout re-renders).
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const status = useMemo(() => getVersionStatus(query.data ?? null), [query.data])

  return {
    status,
    data: query.data ?? null,
    currentVersion: getCurrentAppVersion(),
  }
}
