/**
 * Het logo van Studiemaat zoals op de website: het icoontje met "studie" en "maat" (in groen) ernaast,
 * in het lettertype van de koppen.
 */

import { Image, StyleSheet, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { DisplayFont, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

export function Wordmark({ size = 22, icon = true }: { size?: number; icon?: boolean }) {
  const theme = useTheme()
  const box = Math.round(size * 1.35)
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Studiemaat">
      {icon ? (
        <Image source={require('@/assets/images/logo.png')} style={{ width: box, height: box, borderRadius: box * 0.24 }} />
      ) : null}
      <ThemedText style={[styles.text, { fontSize: size, lineHeight: size * 1.2 }]}>
        studie<ThemedText style={[styles.text, { fontSize: size, lineHeight: size * 1.2, color: theme.primary }]}>maat</ThemedText>
      </ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { fontFamily: DisplayFont.extraBold, letterSpacing: -0.6 },
})
