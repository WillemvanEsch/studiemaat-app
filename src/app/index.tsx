/** Startpunt: naar de lessen als je bent ingelogd, anders naar inloggen. */

import { Redirect } from 'expo-router'

import { Loading } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'

export default function Index() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/(auth)/login'} />
}
