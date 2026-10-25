/**
 * Start: begroeting, wat cijfers, herhalen en je lessen. Opgezet zoals het dashboard op de website
 * (studypro src/app/(app)/page.tsx): logo bovenin, gele streep onder je naam, gekleurde vak-labels.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import { createTest, fetchLessons, fetchTests } from '@/api'
import type { LessonListItem } from '@/api'
import { Wordmark } from '@/components/brand'
import { SubjectChip } from '@/components/subject-chip'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Heading, Loading, Notice, Screen } from '@/components/ui'
import { DisplayFont, Radius, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { usePullRefresh } from '@/hooks/use-pull-refresh'
import { useTheme } from '@/hooks/use-theme'
import { formatDate, gradeText, gradeTone, todayText } from '@/lib/format'

export default function LessonsScreen() {
  const { me } = useAuth()
  const theme = useTheme()
  const [vak, setVak] = useState<string | null>(null)
  const lessons = useQuery({
    queryKey: ['lessons'],
    queryFn: async () => {
      const r = await fetchLessons()
      if (!r.ok) throw new Error(r.error.message)
      return r.data.lessons
    },
    // Zolang er een les wordt verwerkt (1-3 minuten), af en toe kijken of hij klaar is.
    refetchInterval: (q) => (q.state.data?.some((l) => l.status === 'processing') ? 5000 : false),
  })
  // Zelfde lijst als het tabblad Toetsen (zelfde queryKey), voor de cijfers bovenin.
  const tests = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      const r = await fetchTests()
      if (!r.ok) throw new Error(r.error.message)
      return r.data.tests
    },
  })
  const mistakes = useMutation({
    mutationFn: async () => {
      const r = await createTest({ mode: 'herhaling', lessonIds: [] })
      if (!r.ok) throw new Error(r.error.message)
      return r.data.id
    },
    onSuccess: (id) => router.push(`/toets/${id}`),
  })

  const name = me?.user.name ?? ''
  const expired = me && !me.access.hasAccess
  const list = lessons.data ?? []
  const done = (tests.data ?? []).filter((t) => t.finishedAt)
  const graded = done.filter((t) => t.mode === 'proeftoets' && t.grade !== null)
  const avg = graded.length ? graded.reduce((s, t) => s + t.grade!, 0) / graded.length : null
  const subjects = [...new Set(list.map((l) => l.subject))].sort()
  const shown = vak ? list.filter((l) => l.subject === vak) : list

  const refresh = usePullRefresh(async () => {
    await Promise.all([lessons.refetch(), tests.refetch()])
  })
  return (
    <Screen refreshControl={refresh}>
      <Wordmark />

      {!lessons.isLoading && !list.length && !lessons.isError ? (
        <EmptyState name={name} />
      ) : (
        <>
          <View style={{ marginTop: Spacing.two }}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.eyebrow}>
              {todayText()}
            </ThemedText>
            <Greeting name={name} />
            <ThemedText themeColor="textSecondary" style={{ fontSize: 17 }}>
              Waar ga je vandaag mee aan de slag?
            </ThemedText>
          </View>

          {list.length ? (
            <Card style={styles.stats}>
              <Stat label="lessen" value={String(list.length)} />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Stat label="toetsen" value={String(done.length)} />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Stat label="gem. proeftoets" value={gradeText(avg)} color={theme[gradeTone(avg)]} />
            </Card>
          ) : null}
        </>
      )}

      {expired ? (
        <Notice kind="warn">
          <ThemedText type="smallBold">Je gratis periode of abonnement is afgelopen</ThemedText>
          <ThemedText type="small">Je lessen blijven bewaard. Kies een abonnement om verder te leren.</ThemedText>
          <Button title="Bekijk abonnementen" kind="secondary" onPress={() => router.push('/(tabs)/ik/abonnement')} />
        </Notice>
      ) : null}

      {lessons.isLoading ? <Loading /> : null}
      {lessons.isError ? <Notice kind="error">{(lessons.error as Error).message}</Notice> : null}

      {list.some((l) => l.status === 'ready' && l.questionCount > 0) ? (
        <Card>
          <View style={styles.row}>
            <View style={[styles.tile, { backgroundColor: theme.warningSoft }]}>
              <Icon name="arrow.counterclockwise" size={22} tintColor={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>Herhaal je lastige vragen</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Je foute en half goede vragen in één herhalingstoets.
              </ThemedText>
            </View>
          </View>
          <Button title="Start herhaling" loading={mistakes.isPending} onPress={() => mistakes.mutate()} />
          {mistakes.isError ? <Notice>{(mistakes.error as Error).message}</Notice> : null}
        </Card>
      ) : null}

      {list.length ? (
        <>
          <Heading style={{ marginTop: Spacing.two }}>Mijn lessen</Heading>
          {subjects.length > 1 ? (
            <View style={styles.filters}>
              <Filter label="Alles" active={!vak} onPress={() => setVak(null)} />
              {subjects.map((s) => (
                <Filter key={s} label={s} active={vak === s} onPress={() => setVak(s)} />
              ))}
            </View>
          ) : null}
          <NewLessonCard />
          {shown.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </>
      ) : null}
    </Screen>
  )
}

/** "Hoi Wim", met een zonnegele streep onder je naam (zoals op de website). */
function Greeting({ name }: { name: string }) {
  const theme = useTheme()
  if (!name) return <ThemedText style={styles.hello}>Hoi!</ThemedText>
  return (
    <View style={styles.helloRow}>
      <ThemedText style={styles.hello}>Hoi </ThemedText>
      <View>
        <View style={[styles.swash, { backgroundColor: theme.sun }]} />
        <ThemedText style={styles.hello}>{name}</ThemedText>
      </View>
    </View>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={[styles.statValue, color ? { color } : null]}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  )
}

function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.filter,
        active
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <ThemedText type="smallBold" style={{ color: active ? theme.primaryForeground : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  )
}

function NewLessonCard() {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/(tabs)/nieuw')}
      style={({ pressed }) => [styles.newCard, { borderColor: theme.dashed, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.plus, { backgroundColor: theme.primary }]}>
        <Icon name="plus" size={22} tintColor={theme.primaryForeground} />
      </View>
      <View>
        <ThemedText style={styles.cardTitle}>Nieuwe les</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Fotografeer je boek
        </ThemedText>
      </View>
    </Pressable>
  )
}

function LessonCard({ lesson }: { lesson: LessonListItem }) {
  const theme = useTheme()
  return (
    <Card onPress={() => router.push(`/les/${lesson.id}`)}>
      <View style={styles.spread}>
        <SubjectChip subject={lesson.subject} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(lesson.createdAt)}
        </ThemedText>
      </View>
      <ThemedText style={styles.lessonTitle} numberOfLines={2}>
        {lesson.title || 'Nieuwe les'}
      </ThemedText>
      <View style={styles.spread}>
        {lesson.status === 'processing' ? (
          <View style={styles.row}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary">
              Wordt gemaakt… dit duurt 1 tot 3 minuten
            </ThemedText>
          </View>
        ) : lesson.status === 'error' ? (
          <ThemedText type="small" themeColor="destructive">
            Niet gelukt. Tik om het opnieuw te proberen.
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {lesson.questionCount} vragen{lesson.freshCount ? ` · ${lesson.freshCount} nog niet gehad` : ''}
          </ThemedText>
        )}
        <Icon name="chevron.right" size={16} tintColor={theme.textSecondary} />
      </View>
    </Card>
  )
}

/** Nog geen lessen: welkom en de drie stappen, zoals op de website. */
function EmptyState({ name }: { name: string }) {
  const theme = useTheme()
  const steps = [
    { icon: 'camera.fill', title: "Foto's maken", text: 'Fotografeer de bladzijdes van je boek of werkboek.' },
    { icon: 'highlighter', title: 'Studiemaat leest mee', text: 'Je krijgt een uittreksel met markeringen en een begrippenlijst.' },
    { icon: 'target', title: 'Overhoren', text: 'Oefen met directe uitleg, of maak een proeftoets met cijfer.' },
  ]
  return (
    <>
      <View style={{ marginTop: Spacing.two, gap: Spacing.one }}>
        <ThemedText style={styles.hello}>{name ? `Welkom, ${name}` : 'Welkom'}</ThemedText>
        <ThemedText themeColor="textSecondary" style={{ fontSize: 17 }}>
          Ik ben je studiemaat. Maak foto&apos;s van je hoofdstuk, dan maak ik er leerstof en een oefentoets van.
        </ThemedText>
      </View>
      {steps.map((s, i) => (
        <Card key={s.title}>
          <View style={styles.row}>
            <View style={[styles.tile, { backgroundColor: theme.accent }]}>
              <Icon name={s.icon} size={22} tintColor={theme.accentForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>{s.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {s.text}
              </ThemedText>
            </View>
            <ThemedText style={[styles.stepNumber, { color: theme.dashed }]}>{i + 1}</ThemedText>
          </View>
        </Card>
      ))}
      <Button title="Maak je eerste les" icon="camera.fill" onPress={() => router.push('/(tabs)/nieuw')} />
    </>
  )
}

const styles = StyleSheet.create({
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  helloRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  hello: { fontSize: 38, lineHeight: 46, fontFamily: DisplayFont.extraBold, letterSpacing: -1 },
  swash: {
    position: 'absolute',
    left: -2,
    right: -2,
    bottom: 4,
    height: 11,
    borderRadius: 6,
    transform: [{ rotate: '-1.5deg' }],
  },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, paddingHorizontal: 0, gap: 0 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.one },
  statValue: { fontSize: 24, lineHeight: 30, fontFamily: DisplayFont.extraBold },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  tile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, lineHeight: 23, fontFamily: DisplayFont.bold },
  lessonTitle: { fontSize: 19, lineHeight: 25, fontFamily: DisplayFont.bold, marginVertical: Spacing.one },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filter: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  newCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 30, lineHeight: 34, fontFamily: DisplayFont.extraBold },
})
