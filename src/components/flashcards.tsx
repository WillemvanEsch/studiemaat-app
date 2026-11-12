/**
 * Flitskaarten van de begrippen: tik om om te draaien, "Ken ik" / "Nog niet" om door te gaan.
 * Per ronde onthouden we per kaart of je hem kende (op nummer in `cards`, zodat husselen en filteren niets door
 * elkaar halen). Na de laatste kaart volgt een overzicht met een knop om alleen de kaarten te oefenen die je nog
 * niet kende; dat kan zo vaak als nodig, tot je ze allemaal kent. Zelfde werking als op de website.
 */

import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import type { LessonContent } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button } from '@/components/ui'
import { Radius, Spacing } from '@/constants/theme'
import { useLayout } from '@/hooks/use-layout'
import { useTheme } from '@/hooks/use-theme'

/** Fisher-Yates: eerlijk husselen. */
function shuffled<T>(list: T[]): T[] {
  const a = [...list]
  for (let k = a.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1))
    ;[a[k], a[r]] = [a[r], a[k]]
  }
  return a
}

export function Flashcards({ cards }: { cards: LessonContent['begrippen'] }) {
  const theme = useTheme()
  const { isTablet } = useLayout()
  const all = cards.map((_, k) => k)
  const [order, setOrder] = useState<number[]>(all)
  const [pos, setPos] = useState(0)
  const [back, setBack] = useState(false)
  const [marks, setMarks] = useState<Record<number, boolean>>({})
  const [done, setDone] = useState(false)
  if (!cards.length) return <ThemedText themeColor="textSecondary">Deze les heeft geen begrippen.</ThemedText>

  // Kwam er na een verversing een andere set begrippen binnen, dan vallen oude nummers weg.
  const deck = order.filter((k) => k < cards.length)
  const list = deck.length ? deck : all
  const p = Math.min(pos, list.length - 1)
  const card = cards[list[p]]
  const subset = list.length < cards.length

  /** Nieuwe ronde met deze kaarten: markeringen leeg, bij de eerste beginnen. */
  const startRound = (l: number[]) => {
    setOrder(l)
    setPos(0)
    setBack(false)
    setMarks({})
    setDone(false)
  }
  const next = () => {
    setBack(false)
    if (p >= list.length - 1) setDone(true)
    else setPos(p + 1)
  }
  const prev = () => {
    setBack(false)
    setPos(Math.max(0, p - 1))
  }
  const mark = (ok: boolean) => {
    setMarks((m) => ({ ...m, [list[p]]: ok }))
    next()
  }

  const knownCount = list.filter((k) => marks[k] === true).length
  const notYet = list.filter((k) => marks[k] === false)
  // Aan het eind telt alles wat je niet als "Ken ik" aanklikte als nog niet gekend (ook overgeslagen kaarten).
  const rest = list.filter((k) => marks[k] !== true)

  const toolbar = (
    <View style={styles.toolbar}>
      <ThemedText type="small" themeColor="textSecondary" style={{ flexShrink: 1 }}>
        {done ? `${list.length} kaarten` : `Kaart ${p + 1} van ${list.length}`} · {knownCount} gekend
        {subset ? ' · alleen nog niet gekende' : ''}
      </ThemedText>
      <View style={styles.tools}>
        {!done && notYet.length > 0 ? (
          <Tool label={`Nog niet (${notYet.length})`} icon="arrow.counterclockwise" onPress={() => startRound(notYet)} />
        ) : null}
        {subset ? <Tool label="Alle kaarten" onPress={() => startRound(all)} /> : null}
        <Tool label="Husselen" icon="shuffle" onPress={() => startRound(shuffled(list))} />
      </View>
    </View>
  )

  if (done) {
    return (
      <View style={{ gap: Spacing.three }}>
        {toolbar}
        <View style={[styles.card, styles.summary, isTablet && styles.cardTablet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            {rest.length === 0 ? 'Je kent ze allemaal!' : 'Ronde klaar'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {rest.length === 0 ? `Alle ${list.length} kaarten gekend. Goed bezig.` : `${knownCount} gekend, ${rest.length} nog niet.`}
          </ThemedText>
          <View style={{ gap: Spacing.two, alignSelf: 'stretch' }}>
            {rest.length > 0 ? (
              <Button
                title={`Oefen de ${rest.length === 1 ? 'kaart' : `${rest.length} kaarten`} die je nog niet kende`}
                icon="arrow.counterclockwise"
                onPress={() => startRound(rest)}
              />
            ) : null}
            <Button title={`Opnieuw met alle ${cards.length} kaarten`} kind="secondary" onPress={() => startRound(all)} />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={{ gap: Spacing.three }}>
      {toolbar}
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Tik om de kaart om te draaien"
        onPress={() => setBack((b) => !b)}
        style={[styles.card, isTablet && styles.cardTablet, { backgroundColor: back ? theme.accent : theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          {back ? 'Uitleg' : 'Begrip'}
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
        <Pressable
          accessibilityRole="button"
          onPress={() => mark(false)}
          style={({ pressed }) => [styles.markButton, { backgroundColor: theme.destructiveSoft, opacity: pressed ? 0.8 : 1 }]}>
          <ThemedText style={[styles.markText, { color: theme.gradeBad }]}>Nog niet</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => mark(true)}
          style={({ pressed }) => [styles.markButton, { backgroundColor: theme.successSoft, opacity: pressed ? 0.8 : 1 }]}>
          <Icon name="checkmark" size={18} tintColor={theme.gradeGood} />
          <ThemedText style={[styles.markText, { color: theme.gradeGood }]}>Ken ik</ThemedText>
        </Pressable>
      </View>
      <View style={styles.nav}>
        <Button title="Vorige" kind="ghost" icon="chevron.left" style={{ flex: 1 }} disabled={p === 0} onPress={prev} />
        <Button title="Volgende" kind="ghost" style={{ flex: 1 }} onPress={next} />
      </View>
    </View>
  )
}

/** Klein knopje in de balk boven de kaart. */
function Tool({ label, icon, onPress }: { label: string; icon?: string; onPress: () => void }) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.tool, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      {icon ? <Icon name={icon} size={14} tintColor={theme.link} /> : null}
      <ThemedText type="smallBold" style={{ color: theme.link }}>
        {label}
      </ThemedText>
    </Pressable>
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
  // Op een tablet een grotere kaart, als een echt systeemkaartje.
  cardTablet: { minHeight: 380, padding: Spacing.five },
  summary: { justifyContent: 'center', alignItems: 'center' },
  term: { fontSize: 28, lineHeight: 36, fontWeight: 800, textAlign: 'center' },
  backText: { fontSize: 19, lineHeight: 28 },
  nav: { flexDirection: 'row', gap: Spacing.two },
  toolbar: { gap: Spacing.two },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  markButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  markText: { fontSize: 16, fontWeight: 700 },
})
