import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { VersionGate } from '@/components/version-gate'
import { AuthProvider } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { attachNotificationHandlers } from '@/lib/push-notifications'
import { initSentry, Sentry } from '@/lib/sentry'

// Sentry zo vroeg mogelijk, zodat ook fouten bij het eerste renderen binnenkomen.
initSentry()

// Eén client voor de hele app (buiten de component, zodat hot reload de cache niet leegt).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
})

/**
 * Geen analytics in de app: Studiemaat wordt ook door kinderen onder 13 gebruikt (groep 7/8),
 * en dan gelden strengere regels bij Apple en Google. Alleen crashmeldingen via Sentry.
 */
function RootStack() {
  const theme = useTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: theme.primary,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="les/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="toets/[id]" options={{ headerShown: true, title: '', gestureEnabled: false }} />
    </Stack>
  )
}

function RootLayout() {
  useEffect(() => {
    attachNotificationHandlers()
  }, [])

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="auto" />
            <RootStack />
            <VersionGate />
          </AuthProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

export default Sentry.wrap(RootLayout)
