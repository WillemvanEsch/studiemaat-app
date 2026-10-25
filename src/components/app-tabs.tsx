import { Tabs } from 'expo-router'
import { useColorScheme, type ColorValue } from 'react-native'

import { Icon } from '@/components/icon'
import { Colors } from '@/constants/theme'

/**
 * Tabbalk onderin via `Tabs` van expo-router (JS-gerenderd), net als bij bieden.nl: daar gaf
 * `unstable-native-tabs` op iOS verspringende labels bij de eerste keer laden.
 */

function TabIcon({ name, active, color, focused }: { name: string; active: string; color: ColorValue; focused: boolean }) {
  return <Icon name={focused ? active : name} size={26} tintColor={color as string} />
}

const TABS = [
  { name: 'index', title: 'Lessen', icon: 'book.closed', active: 'book.closed.fill' },
  { name: 'nieuw', title: 'Nieuw', icon: 'plus.circle', active: 'plus.circle.fill' },
  { name: 'toetsen', title: 'Toetsen', icon: 'list.bullet.clipboard', active: 'list.bullet.clipboard.fill' },
  { name: 'ik', title: 'Ik', icon: 'person.crop.circle', active: 'person.crop.circle.fill' },
] as const

export default function AppTabs() {
  const scheme = useColorScheme()
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light']

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <TabIcon name={t.icon} active={t.active} color={color} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  )
}
