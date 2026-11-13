/**
 * Foto's van lesstof maken of kiezen, verkleinen en uploaden.
 * Verkleinen naar max 2000 px en JPEG 70%: dan blijft elke foto ruim onder de 4 MB van de server,
 * en de AI leest de tekst nog prima.
 */

import * as Crypto from 'expo-crypto'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

import { uploadPhoto } from '@/api'

/**
 * `uri` is de originele foto (vaak 12 tot 48 megapixel) en wordt pas bij het uploaden verkleind.
 * `preview` is een klein plaatje voor de miniaturen op het scherm Nieuw. Zonder dat moet expo-image elke
 * volle foto op het hoofdthread verkleinen, en dan hangt de app seconden lang (Sentry "App Hanging", nov 2026).
 */
export type Photo = { uri: string; width: number; height: number; preview: string }

export const MAX_PAGES = 20
const MAX_SIDE = 2000
/** Langste kant van een miniatuur: ruim genoeg voor een vakje van ~110 pt op een scherm met 3x pixels. */
const PREVIEW_SIDE = 360

/** Klein plaatje maken (buiten het hoofdthread, via expo-image-manipulator). Lukt het niet, dan het origineel. */
async function withPreview(a: { uri: string; width: number; height: number }): Promise<Photo> {
  try {
    const ctx = ImageManipulator.manipulate(a.uri)
    ctx.resize(a.width >= a.height ? { width: Math.min(PREVIEW_SIDE, a.width || PREVIEW_SIDE) } : { height: Math.min(PREVIEW_SIDE, a.height || PREVIEW_SIDE) })
    const image = await ctx.renderAsync()
    const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG })
    return { uri: a.uri, width: a.width, height: a.height, preview: saved.uri }
  } catch {
    return { uri: a.uri, width: a.width, height: a.height, preview: a.uri }
  }
}

export async function takePhoto(): Promise<Photo | null | 'geen-toestemming'> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) return 'geen-toestemming'
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
  if (r.canceled || !r.assets[0]) return null
  return withPreview(r.assets[0])
}

export async function pickPhotos(max: number): Promise<Photo[]> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: max,
    orderedSelection: true,
    quality: 0.9,
  })
  if (r.canceled) return []
  // Na elkaar, zodat er niet twintig grote foto's tegelijk in het geheugen staan.
  const photos: Photo[] = []
  for (const a of r.assets) photos.push(await withPreview(a))
  return photos
}

async function shrink(photo: Photo): Promise<string> {
  const ctx = ImageManipulator.manipulate(photo.uri)
  const longest = Math.max(photo.width, photo.height)
  if (longest > MAX_SIDE) {
    ctx.resize(photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE })
  }
  const image = await ctx.renderAsync()
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG })
  return saved.uri
}

/**
 * Alle foto's verkleinen en één voor één uploaden. onProgress(klaar, totaal) voor de voortgangsbalk.
 * Geeft de sleutels terug voor POST /lessons, of een foutmelding.
 */
export async function uploadAll(
  photos: Photo[],
  onProgress: (done: number, total: number) => void,
): Promise<{ pages: { key: string; mime: string }[] } | { error: string }> {
  const folder = Crypto.randomUUID()
  const pages: { key: string; mime: string }[] = []
  onProgress(0, photos.length)
  for (const [i, photo] of photos.entries()) {
    let uri: string
    try {
      uri = await shrink(photo)
    } catch {
      return { error: `Foto ${i + 1} kon niet worden verwerkt. Probeer een andere foto.` }
    }
    const r = await uploadPhoto({ uri, mime: 'image/jpeg' }, folder, i + 1)
    if (!r.ok) return { error: r.error.message }
    pages.push(r.data)
    onProgress(i + 1, photos.length)
  }
  return { pages }
}
