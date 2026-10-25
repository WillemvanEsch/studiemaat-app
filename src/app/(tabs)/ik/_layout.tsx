import { Stack } from 'expo-router'

import { useTheme } from '@/hooks/use-theme'

/** Het tabblad Ik heeft eigen subschermen (instellingen, abonnement, uitnodigen, account verwijderen). */
export default function IkLayout() {
  const theme = useTheme()
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.primary,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="instellingen" options={{ title: 'Instellingen' }} />
      <Stack.Screen name="abonnement" options={{ title: 'Abonnement' }} />
      <Stack.Screen name="uitnodigen" options={{ title: 'Vriend uitnodigen' }} />
      <Stack.Screen name="verwijderen" options={{ title: 'Account verwijderen' }} />
    </Stack>
  )
}
