import { Redirect } from 'expo-router'

import AppTabs from '@/components/app-tabs'
import { useAuth } from '@/contexts/auth-context'

export default function TabsLayout() {
  const { status } = useAuth()
  // Uitgelogd (of sessie verlopen): terug naar inloggen.
  if (status === 'unauthenticated') return <Redirect href="/(auth)/login" />
  return <AppTabs />
}
