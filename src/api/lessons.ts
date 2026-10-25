import { apiFetch } from './client'
import type { Lesson, LessonListItem, ScanOptions } from './types'

export const fetchLessons = () => apiFetch<{ lessons: LessonListItem[] }>('/mobile/lessons')

export const fetchLesson = (id: number) => apiFetch<Lesson>(`/mobile/lessons/${id}`)

export const renameLesson = (id: number, title: string) =>
  apiFetch<{ ok: true; title: string }>(`/mobile/lessons/${id}`, { method: 'PATCH', body: { title } })

export const deleteLesson = (id: number) => apiFetch<{ ok: true }>(`/mobile/lessons/${id}`, { method: 'DELETE' })

export const retryLesson = (id: number) => apiFetch<{ ok: true }>(`/mobile/lessons/${id}/retry`, { method: 'POST' })

export const makeQuestions = (id: number) =>
  apiFetch<{ added: number; message: string }>(`/mobile/lessons/${id}/questions`, { method: 'POST' })

/** Eén foto uploaden. folder = uuid van deze nieuwe les, position = 1, 2, 3 ... */
export function uploadPhoto(photo: { uri: string; mime: string }, folder: string, position: number) {
  const form = new FormData()
  const ext = photo.mime === 'image/png' ? 'png' : 'jpg'
  // React Native's FormData accepteert een { uri, name, type }-object als bestand.
  form.append('file', { uri: photo.uri, name: `pagina-${position}.${ext}`, type: photo.mime } as unknown as Blob)
  form.append('folder', folder)
  form.append('position', String(position))
  return apiFetch<{ key: string; mime: string }>('/mobile/uploads', { method: 'POST', body: form })
}

export interface CreateLessonInput {
  subject: string
  title?: string
  instructions?: string
  scan?: ScanOptions
  pages: { key: string; mime: string }[]
}

export const createLesson = (input: CreateLessonInput) =>
  apiFetch<{ id: number }>('/mobile/lessons', { method: 'POST', body: input })
