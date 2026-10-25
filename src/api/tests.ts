import { apiFetch } from './client'
import type { Grade, QuestionKind, Test, TestListItem, TestMode } from './types'

export const fetchTests = () => apiFetch<{ tests: TestListItem[] }>('/mobile/tests')

export const fetchTest = (id: number) => apiFetch<Test>(`/mobile/tests/${id}`)

export interface CreateTestInput {
  mode: TestMode
  lessonIds: number[]
  count?: number
  kinds?: QuestionKind[]
}

export const createTest = (input: CreateTestInput) => apiFetch<{ id: number }>('/mobile/tests', { method: 'POST', body: input })

export const deleteTest = (id: number) => apiFetch<{ ok: true }>(`/mobile/tests/${id}`, { method: 'DELETE' })

/** Bij oefenen/herhaling komt het oordeel terug; bij een proeftoets alleen { saved: true }. */
export const submitAnswer = (id: number, position: number, answer: string) =>
  apiFetch<Grade | { saved: true }>(`/mobile/tests/${id}/answer`, { method: 'POST', body: { position, answer } })

export const finishTest = (id: number) => apiFetch<Test>(`/mobile/tests/${id}/finish`, { method: 'POST' })
