import { Stack, useRouter } from 'expo-router'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/auth-context'

export default function AuthLayout() {
  const router = useRouter()
  const { status } = useAuth()

  // Centrale doorsturing na inloggen: schermen zetten alleen de auth-status om, deze layout stuurt door.
  useEffect(() => {
    if (status === 'authenticated') router.replace('/(tabs)')
  }, [status, router])

  return <Stack screenOptions={{ headerShown: false }} />
}
