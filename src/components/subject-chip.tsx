import { StyleSheet, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { Radius, SubjectColors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { subjectColorIndex } from '@/lib/format'

/** Vak als gekleurd label; elk vak houdt altijd dezelfde kleur. */
export function SubjectChip({ subject }: { subject: string }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const palette = SubjectColors[scheme]
  const c = palette[subjectColorIndex(subject, palette.length)]
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <ThemedText type="smallBold" style={{ color: c.text, fontSize: 13 }}>
        {subject}
      </ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
})
