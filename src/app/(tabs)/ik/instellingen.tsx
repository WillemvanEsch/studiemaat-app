/**
 * Naam, niveau, leerjaar en moeilijkheid, plus wat er standaard gemaakt wordt bij een nieuwe les.
 * De keuzelijsten komen van de website (/mobile/options), zodat app en site altijd hetzelfde aanbieden.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { fetchOptions, updateMe } from '@/api'
import type { Difficulty, QuestionAmount, ScanPart } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Chips, Field, Loading, Notice, Screen } from '@/components/ui'
import { MarkColors, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useTheme } from '@/hooks/use-theme'
import { getWeergave, setWeergave, type Weergave } from '@/lib/appearance'
import { MARK_OPTIONS, setMarkColor, useMarkColor } from '@/lib/mark-color'

export default function SettingsScreen() {
  const { me, setMe } = useAuth()
  const theme = useTheme()
  const options = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const r = await fetchOptions()
      if (!r.ok) throw new Error(r.error.message)
      return r.data
    },
    staleTime: Infinity,
  })
  const [name, setName] = useState(me?.user.name ?? '')
  const [level, setLevel] = useState<string | null>(me?.profile.level ?? null)
  const [year, setYear] = useState<number | null>(me?.profile.year ?? null)
  const [difficulty, setDifficulty] = useState<Difficulty>(me?.profile.difficulty ?? 'normaal')
  const [parts, setParts] = useState<ScanPart[]>(me?.scan.parts ?? ['uittreksel', 'begrippen', 'tabellen', 'vragen'])
  const [amount, setAmount] = useState<QuestionAmount>(me?.scan.questions ?? 'normaal')

  // Weergave staat alleen op dit toestel en gaat meteen in (geen Opslaan nodig).
  const [weergave, setWeergaveState] = useState<Weergave>('auto')
  useEffect(() => {
    getWeergave().then(setWeergaveState)
  }, [])

  const save = useMutation({
    mutationFn: async () => {
      const r = await updateMe({ name: name.trim(), level, year, difficulty, scan: { parts, questions: amount } })
      if (!r.ok) throw new Error(r.error.message)
      await setMe(r.data)
    },
  })

  if (options.isLoading || !me) return <Loading />
  if (!options.data)
    return (
      <Screen edges={[]}>
        <Notice kind="error">{(options.error as Error | null)?.message ?? 'Laden lukte niet'}</Notice>
      </Screen>
    )
  const o = options.data
  const current = o.levels.find((l) => l.id === level)
  const years = current?.years ?? 0

  const toggle = (p: ScanPart) => {
    save.reset()
    setParts((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]))
  }

  return (
    <Screen edges={[]}>
      <Card>
        <Field label="Je naam" value={name} onChangeText={setName} autoComplete="name" textContentType="givenName" maxLength={60} />
      </Card>

      <Card>
        <ThemedText type="smallBold">Welke opleiding doe je?</ThemedText>
        <Chips
          options={o.levels.map((l) => ({ id: l.id, label: l.label }))}
          value={level}
          onChange={(id) => {
            setLevel(id)
            setYear(null)
          }}
        />
        {years ? (
          <>
            <ThemedText type="smallBold">In welk jaar zit je?</ThemedText>
            <Chips
              options={Array.from({ length: years }, (_, i) => ({ id: String(i + 1), label: String(i + 1) }))}
              value={year ? String(year) : null}
              onChange={(y) => setYear(Number(y))}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <ThemedText type="smallBold">Hoe moeilijk mogen de vragen zijn?</ThemedText>
        <Chips options={o.difficulties} value={difficulty} onChange={setDifficulty} />
        <ThemedText type="small" themeColor="textSecondary">
          {o.difficulties.find((d) => d.id === difficulty)?.text}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">Wat maakt Studiemaat bij een nieuwe les?</ThemedText>
        {o.scanParts.map((p) => {
          const on = parts.includes(p.id)
          return (
            <Pressable
              key={p.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(p.id)}
              style={styles.check}>
              <Icon name={on ? 'checkmark.circle.fill' : 'circle'} size={22} tintColor={on ? theme.primary : theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <ThemedText>{p.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {p.text}
                </ThemedText>
              </View>
            </Pressable>
          )
        })}
        {parts.includes('vragen') ? (
          <>
            <ThemedText type="smallBold">Hoeveel vragen?</ThemedText>
            <Chips options={o.questionAmounts.map((q) => ({ id: q.id, label: `${q.label} (${q.count})` }))} value={amount} onChange={setAmount} />
          </>
        ) : null}
      </Card>

      {save.isSuccess ? <Notice kind="ok">Opgeslagen.</Notice> : null}
      {save.isError ? <Notice kind="error">{(save.error as Error).message}</Notice> : null}
      <Button title="Opslaan" loading={save.isPending} disabled={!name.trim() || !parts.length} onPress={() => save.mutate()} />

      <Card>
        <ThemedText type="smallBold">Weergave</ThemedText>
        <Chips<Weergave>
          options={[
            { id: 'auto', label: 'Automatisch' },
            { id: 'licht', label: 'Licht' },
            { id: 'donker', label: 'Donker' },
          ]}
          value={weergave}
          onChange={(v) => {
            setWeergaveState(v)
            setWeergave(v).catch(() => {})
          }}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Automatisch volgt de instelling van je telefoon.
        </ThemedText>
      </Card>

      <MarkColorCard />
    </Screen>
  )
}

/** Arceerkleur van de belangrijkste stof in uittreksels, zoals bij Weergave op de website. Gaat meteen in. */
function MarkColorCard() {
  const theme = useTheme()
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const current = useMarkColor()
  return (
    <Card>
      <ThemedText type="smallBold">Arceerkleur</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        De kleur waarmee de{' '}
        <ThemedText type="small" style={{ backgroundColor: current.bg, color: current.text }}>
          belangrijkste stof
        </ThemedText>{' '}
        in je uittreksels wordt gemarkeerd.
      </ThemedText>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        {MARK_OPTIONS.map((o) => {
          const on = o.id === current.mark
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              onPress={() => setMarkColor(o.id).catch(() => {})}
              style={styles.swatchItem}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: MarkColors[o.id][scheme].bg, borderColor: on ? theme.primary : theme.border },
                  on && { borderWidth: 3 },
                ]}>
                {on ? <Icon name="checkmark" size={18} tintColor={MarkColors[o.id][scheme].text} /> : null}
              </View>
              <ThemedText type="small" themeColor={on ? 'text' : 'textSecondary'}>
                {o.label}
              </ThemedText>
            </Pressable>
          )
        })}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  swatchItem: { alignItems: 'center', gap: Spacing.one },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start', paddingVertical: Spacing.one },
})
