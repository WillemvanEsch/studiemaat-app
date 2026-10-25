/** Mijn lessen: alles wat je hebt gescand, nieuwste eerst. */

import { useMutation, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { createTest, fetchLessons } from '@/api'
import type { LessonListItem } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Loading, Notice, Screen, Title } from '@/components/ui'
import { Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { usePullRefresh } from '@/hooks/use-pull-refresh'
import { useTheme } from '@/hooks/use-theme'
import { formatDate } from '@/lib/format'

export default function LessonsScreen() {
  const { me } = useAuth()
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

  const refresh = usePullRefresh(lessons.refetch)
  return (
    <Screen refreshControl={refresh}>
      <Title sub={list.length ? 'Kies een les om te leren of jezelf te overhoren.' : undefined}>
        {name ? `Hoi ${name}` : 'Mijn lessen'}
      </Title>

      {expired ? (
        <Notice kind="warn">
          <ThemedText type="smallBold">Je gratis periode of abonnement is afgelopen</ThemedText>
          <ThemedText type="small">Je lessen blijven bewaard. Kies een abonnement om verder te leren.</ThemedText>
          <Button title="Bekijk abonnementen" kind="secondary" onPress={() => router.push('/(tabs)/ik/abonnement')} />
        </Notice>
      ) : null}

      {lessons.isLoading ? <Loading /> : null}
      {lessons.isError ? <Notice kind="error">{(lessons.error as Error).message}</Notice> : null}

      {!lessons.isLoading && !list.length ? (
        <Card>
          <ThemedText type="smallBold">Nog geen lessen</ThemedText>
          <ThemedText themeColor="textSecondary">
            Maak een foto van een bladzijde uit je boek of van je aantekeningen. Binnen een paar minuten staan je uittreksel en
            oefenvragen klaar.
          </ThemedText>
          <Button title="Eerste les maken" icon="camera.fill" onPress={() => router.push('/(tabs)/nieuw')} />
        </Card>
      ) : null}

      {list.some((l) => l.status === 'ready' && l.questionCount > 0) ? (
        <Button
          title="Herhaal wat je nog lastig vond"
          kind="secondary"
          icon="arrow.counterclockwise"
          loading={mistakes.isPending}
          onPress={() => mistakes.mutate()}
        />
      ) : null}
      {mistakes.isError ? <Notice>{(mistakes.error as Error).message}</Notice> : null}

      {list.map((l) => (
        <LessonRow key={l.id} lesson={l} />
      ))}
    </Screen>
  )
}

function LessonRow({ lesson }: { lesson: LessonListItem }) {
  const theme = useTheme()
  return (
    <Card onPress={() => router.push(`/les/${lesson.id}`)}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {lesson.subject} · {formatDate(lesson.createdAt)}
          </ThemedText>
          <ThemedText style={styles.title}>{lesson.title || 'Nieuwe les'}</ThemedText>
          {lesson.status === 'processing' ? (
            <View style={styles.status}>
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
        </View>
        <Icon name="chevron.right" size={16} tintColor={theme.textSecondary} />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  status: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
})
