import { Stack } from 'expo-router'

import { useTheme } from '@/hooks/use-theme'

// Opent een ander tabblad een subscherm van Ik (bv. "Abonnement kiezen" op Lessen), dan ligt Ik zelf eronder.
// Zonder dit is het subscherm het enige scherm in de stapel: geen terugknop, en een tik op Ik blijft daar hangen.
export const unstable_settings = { initialRouteName: 'index' }

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
