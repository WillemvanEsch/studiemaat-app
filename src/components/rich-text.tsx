/**
 * Tekst uit de AI zoals de website hem toont (src/components/Rich.tsx): een klein stukje Markdown.
 *   ==highlight==  → geel gemarkeerd (de belangrijkste stof)
 *   **vet**        → begrippen
 *   - opsomming    → lijstje
 * Meer hebben we niet nodig, dus geen hele Markdown-bibliotheek.
 */

import { Fragment } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

function Inline({ text }: { text: string }) {
  const theme = useTheme()
  const parts = text.split(/(==[^=]+==|\*\*[^*]+\*\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('==') && p.endsWith('==') && p.length > 4)
          return (
            <Text key={i} style={{ backgroundColor: theme.mark, color: theme.markText }}>
              {p.slice(2, -2)}
            </Text>
          )
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
          return (
            <Text key={i} style={{ fontWeight: 700 }}>
              {p.slice(2, -2)}
            </Text>
          )
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <View style={{ gap: Spacing.two }}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim())
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l))
        if (isList)
          return (
            <View key={bi} style={{ gap: Spacing.one }}>
              {lines.map((l, li) => (
                <View key={li} style={styles.item}>
                  <ThemedText style={styles.bullet}>•</ThemedText>
                  <ThemedText style={styles.text}>
                    <Inline text={l.replace(/^\s*[-*•]\s+/, '')} />
                  </ThemedText>
                </View>
              ))}
            </View>
          )
        return (
          <ThemedText key={bi} style={styles.text}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 ? '\n' : ''}
                <Inline text={l.replace(/^\s*[-*•]\s+/, '• ')} />
              </Fragment>
            ))}
          </ThemedText>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: Spacing.two, paddingRight: Spacing.three },
  bullet: { lineHeight: 26 },
  text: { flex: 1, fontSize: 17, lineHeight: 26, fontWeight: 400 },
})
