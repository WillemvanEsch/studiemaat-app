/**
 * Regel in een lijstje (zoals in Ik): icoon, tekst en een pijltje.
 * external = de regel opent iets buiten de app (website, mail); dan staat er een "naar buiten"-icoon in plaats van het
 * pijltje, zodat je weet dat je de app even verlaat.
 */

import { router, type Href } from 'expo-router'
import { Linking, Pressable, StyleSheet, View } from 'react-native'

import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

export function ListRow({
  icon,
  label,
  sub,
  href,
  url,
  onPress,
  color,
  last,
}: {
  icon: string
  label: string
  sub?: string
  /** Scherm in de app */
  href?: Href
  /** Adres buiten de app (https of mailto) */
  url?: string
  onPress?: () => void
  color?: string
  last?: boolean
}) {
  const theme = useTheme()
  const tint = color ?? theme.text
  const press = onPress ?? (() => (url ? Linking.openURL(url) : href ? router.push(href) : undefined))
  return (
    <Pressable
      accessibilityRole={url ? 'link' : 'button'}
      onPress={press}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { opacity: 0.6 },
      ]}>
      <Icon name={icon} size={20} tintColor={color ?? theme.primary} />
      <View style={{ flex: 1 }}>
        <ThemedText style={{ color: tint }}>{label}</ThemedText>
        {sub ? (
          <ThemedText type="small" themeColor="textSecondary">
            {sub}
          </ThemedText>
        ) : null}
      </View>
      <Icon name={url ? 'arrow.up.right.square' : 'chevron.right'} size={url ? 16 : 14} tintColor={theme.textSecondary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
})
