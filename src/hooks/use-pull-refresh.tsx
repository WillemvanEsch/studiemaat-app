/**
 * Omlaag trekken om te verversen.
 *
 * Bewust een eigen "bezig"-stand in plaats van `isRefetching` van TanStack Query: die is ook waar als de lijst
 * vanzelf ververst (terugkomen op het scherm, elke 5 seconden tijdens het maken van een les). Op iOS bleef het
 * draaiende rondje bovenaan dan staan. Nu draait het alleen als je zelf omlaag trekt.
 */

import { useCallback, useState } from 'react'
import { RefreshControl } from 'react-native'

export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [pulling, setPulling] = useState(false)
  const onRefresh = useCallback(async () => {
    setPulling(true)
    try {
      await refetch()
    } finally {
      setPulling(false)
    }
  }, [refetch])
  return <RefreshControl refreshing={pulling} onRefresh={onRefresh} />
}
