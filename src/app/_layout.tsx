import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { VersionGate } from '@/components/version-gate'
import { AuthProvider } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { DisplayFont } from '@/constants/theme'
import { loadWeergave } from '@/lib/appearance'
import { loadMarkColor } from '@/lib/mark-color'
import { attachNotificationHandlers } from '@/lib/push-notifications'
import { initSentry, Sentry } from '@/lib/sentry'

// Sentry zo vroeg mogelijk, zodat ook fouten bij het eerste renderen binnenkomen.
initSentry()
// Gekozen weergave (licht/donker) meteen toepassen.
loadWeergave().catch(() => {})
loadMarkColor().catch(() => {})

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
      <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy' }} />
      <Stack.Screen name="hulp" options={{ headerShown: true, title: 'Hulp en contact' }} />
    </Stack>
  )
}

function RootLayout() {
  useEffect(() => {
    attachNotificationHandlers()
  }, [])
  // Lettertype voor koppen (zelfde als de website). Even wachten tot hij geladen is, anders verspringen
  // de koppen; lukt laden niet, dan gewoon door met het systeemlettertype.
  const [fontsLoaded, fontError] = useFonts({
    [DisplayFont.bold]: require('@/assets/fonts/BricolageGrotesque-Bold.ttf'),
    [DisplayFont.extraBold]: require('@/assets/fonts/BricolageGrotesque-ExtraBold.ttf'),
  })
  if (!fontsLoaded && !fontError) return null

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
