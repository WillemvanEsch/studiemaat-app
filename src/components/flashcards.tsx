/** Flitskaarten van de begrippen: tik om om te draaien, vorige/volgende om door te gaan. */

import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import type { LessonContent } from '@/api'
import { ThemedText } from '@/components/themed-text'
import { Button } from '@/components/ui'
import { Radius, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

export function Flashcards({ cards }: { cards: LessonContent['begrippen'] }) {
  const theme = useTheme()
  const [i, setI] = useState(0)
  const [back, setBack] = useState(false)
  if (!cards.length) return <ThemedText themeColor="textSecondary">Deze les heeft geen begrippen.</ThemedText>
  const card = cards[i % cards.length]
  const go = (d: number) => {
    setBack(false)
    setI((n) => (n + d + cards.length) % cards.length)
  }
  return (
    <View style={{ gap: Spacing.three }}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Tik om de kaart om te draaien"
        onPress={() => setBack((b) => !b)}
        style={[styles.card, { backgroundColor: back ? theme.accent : theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          {back ? 'Uitleg' : 'Begrip'} · {(i % cards.length) + 1} van {cards.length}
        </ThemedText>
        {back ? (
          <View style={{ gap: Spacing.two }}>
            <ThemedText style={styles.backText}>{card.uitleg}</ThemedText>
            {card.voorbeeld ? <ThemedText themeColor="textSecondary">Bijv. {card.voorbeeld}</ThemedText> : null}
          </View>
        ) : (
          <ThemedText style={styles.term}>{card.term}</ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          Tik om om te draaien
        </ThemedText>
      </Pressable>
      <View style={styles.nav}>
        <Button title="Vorige" kind="secondary" icon="chevron.left" style={{ flex: 1 }} onPress={() => go(-1)} />
        <Button title="Volgende" kind="secondary" style={{ flex: 1 }} onPress={() => go(1)} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: 260,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  term: { fontSize: 28, lineHeight: 36, fontWeight: 800, textAlign: 'center' },
  backText: { fontSize: 19, lineHeight: 28 },
  nav: { flexDirection: 'row', gap: Spacing.two },
})
