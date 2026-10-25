/**
 * Nieuwe les: foto's maken of kiezen, vak kiezen, en Studiemaat maakt er een uittreksel en vragen van.
 * De eerste keer vragen we toestemming om foto's door een AI te laten verwerken (verplicht van Apple).
 */

import { useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native'

import { createLesson } from '@/api'
import { Icon } from '@/components/icon'
import { ThemedText } from '@/components/themed-text'
import { Button, Card, Chips, Field, Notice, Screen, Title } from '@/components/ui'
import { Radius, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/hooks/use-theme'
import { MAX_PAGES, pickPhotos, takePhoto, uploadAll, type Photo } from '@/lib/photos'
import { hasAiConsent, saveAiConsent } from '@/lib/storage'

/** Zelfde vakken als op de website (studypro/src/lib/format.ts SUBJECTS). */
const SUBJECTS = [
  'Aardrijkskunde',
  'Biologie',
  'Duits',
  'Economie',
  'Engels',
  'Frans',
  'Geschiedenis',
  'Latijn',
  'Maatschappijleer',
  'Natuurkunde',
  'Nederlands',
  'Scheikunde',
  'Wiskunde',
  'Anders',
] as const

export default function NewLessonScreen() {
  const theme = useTheme()
  const { me } = useAuth()
  const queryClient = useQueryClient()
  const [consent, setConsent] = useState<boolean | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [subject, setSubject] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hasAiConsent().then(setConsent)
  }, [])

  if (consent === false) {
    return (
      <Screen>
        <Title>Voordat je begint</Title>
        <Card>
          <ThemedText type="smallBold">Zo maakt Studiemaat je les</ThemedText>
          <ThemedText>
            Je foto&apos;s worden gedeeld met een AI-dienst die ze analyseert en er lesstof van maakt: een uittreksel, begrippen en
            oefenvragen. Ook je antwoorden op open vragen worden zo nagekeken.
          </ThemedText>
          <ThemedText>Fotografeer alleen lesstof, geen gezichten of persoonlijke gegevens.</ThemedText>
          <Button title="Meer over privacy" kind="ghost" onPress={() => router.push('/privacy')} />
          <Button
            title="Ik snap het, ga verder"
            onPress={async () => {
              await saveAiConsent()
              setConsent(true)
            }}
          />
        </Card>
      </Screen>
    )
  }

  const expired = me && !me.access.hasAccess
  const busy = progress !== null
  const room = MAX_PAGES - photos.length

  async function addFromCamera() {
    const p = await takePhoto()
    if (p === 'geen-toestemming') {
      Alert.alert('Geen toegang tot de camera', 'Geef Studiemaat toegang tot je camera in de instellingen van je telefoon.', [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Instellingen', onPress: () => Linking.openSettings() },
      ])
      return
    }
    if (p) setPhotos((ps) => [...ps, p].slice(0, MAX_PAGES))
  }

  async function addFromLibrary() {
    const picked = await pickPhotos(room)
    if (picked.length) setPhotos((ps) => [...ps, ...picked].slice(0, MAX_PAGES))
  }

  async function submit() {
    if (!subject) return setError('Kies eerst een vak.')
    setError(null)
    const up = await uploadAll(photos, (done, total) => setProgress(`Foto's uploaden: ${done} van ${total}`))
    if ('error' in up) {
      setProgress(null)
      return setError(up.error)
    }
    setProgress('Les aanmaken…')
    const r = await createLesson({ subject, title: title.trim(), instructions: instructions.trim(), pages: up.pages })
    setProgress(null)
    if (!r.ok) return setError(r.error.message)
    setPhotos([])
    setTitle('')
    setInstructions('')
    setSubject(null)
    queryClient.invalidateQueries({ queryKey: ['lessons'] })
    router.push(`/les/${r.data.id}`)
  }

  return (
    <Screen>
      <Title sub="Fotografeer de bladzijdes die je moet leren. Studiemaat maakt er binnen een paar minuten een les van.">Nieuwe les</Title>

      {expired ? (
        <Notice kind="warn">
          <ThemedText type="small">Je gratis periode of abonnement is afgelopen. Kies een abonnement om nieuwe lessen te maken.</ThemedText>
          <Button title="Bekijk abonnementen" kind="secondary" onPress={() => router.push('/(tabs)/ik/abonnement')} />
        </Notice>
      ) : null}

      <View style={styles.actions}>
        <Button title="Foto maken" icon="camera.fill" style={{ flex: 1 }} disabled={!room || busy} onPress={addFromCamera} />
        <Button title="Uit fotorol" icon="photo.on.rectangle" kind="secondary" style={{ flex: 1 }} disabled={!room || busy} onPress={addFromLibrary} />
      </View>

      {photos.length ? (
        <View style={styles.grid}>
          {photos.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={[styles.thumb, { borderColor: theme.border }]}>
              <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <ThemedText style={[styles.badge, { backgroundColor: theme.primary, color: theme.primaryForeground }]}>{i + 1}</ThemedText>
              {!busy ? (
                <Pressable
                  accessibilityLabel={`Foto ${i + 1} weghalen`}
                  onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  style={[styles.remove, { backgroundColor: theme.backgroundElement }]}>
                  <Icon name="xmark" size={14} tintColor={theme.text} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Tip: leg het boek plat neer, zorg voor genoeg licht en zet de hele bladzijde in beeld. Maximaal {MAX_PAGES} foto&apos;s per les.
        </ThemedText>
      )}

      {photos.length ? (
        <>
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold">Vak</ThemedText>
            <Chips options={SUBJECTS.map((s) => ({ id: s, label: s }))} value={subject} onChange={setSubject} />
          </View>
          <Field label="Titel (mag leeg, dan bedenkt Studiemaat er een)" value={title} onChangeText={setTitle} placeholder="Bijv. H3 Klimaat" maxLength={120} />
          <Field
            label="Wat moet je kennen? (optioneel)"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Bijv. alleen paragraaf 3.2 en 3.3, toets is volgende week"
            multiline
            style={{ minHeight: 90, paddingTop: Spacing.two, textAlignVertical: 'top' }}
            maxLength={1000}
          />
          {error ? <Notice kind="error">{error}</Notice> : null}
          {progress ? <Notice>{progress}</Notice> : null}
          <Button title="Maak mijn les" icon="sparkles" loading={busy} disabled={!subject || !!expired} onPress={submit} />
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: 100, height: 134, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1 },
  badge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    minWidth: 22,
    textAlign: 'center',
    borderRadius: 11,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 22,
    fontWeight: 700,
  },
  remove: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
})
