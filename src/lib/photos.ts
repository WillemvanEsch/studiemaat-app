/**
 * Foto's van lesstof maken of kiezen, verkleinen en uploaden.
 * Verkleinen naar max 2000 px en JPEG 70%: dan blijft elke foto ruim onder de 4 MB van de server,
 * en de AI leest de tekst nog prima.
 */

import * as Crypto from 'expo-crypto'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

import { uploadPhoto } from '@/api'

export type Photo = { uri: string; width: number; height: number }

export const MAX_PAGES = 20
const MAX_SIDE = 2000

export async function takePhoto(): Promise<Photo | null | 'geen-toestemming'> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) return 'geen-toestemming'
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
  if (r.canceled || !r.assets[0]) return null
  const a = r.assets[0]
  return { uri: a.uri, width: a.width, height: a.height }
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
  return r.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }))
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
