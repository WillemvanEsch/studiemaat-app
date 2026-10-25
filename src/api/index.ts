/**
 * Publieke kant van src/api/. Componenten importeren altijd uit '@/api', nooit uit de losse bestanden.
 */

export { apiFetch, authHeaders, BASE_URL, setUnauthorizedHandler } from './client'
export { logout, requestCode, verifyCode } from './auth'
export { deleteAccount, fetchInvites, fetchMe, fetchOptions, sendInvite, updateMe } from './me'
export type { UpdateMeInput } from './me'
export {
  createLesson,
  deleteLesson,
  fetchLesson,
  fetchLessons,
  makeQuestions,
  renameLesson,
  retryLesson,
  uploadPhoto,
} from './lessons'
export type { CreateLessonInput } from './lessons'
export { createTest, deleteTest, fetchTest, fetchTests, finishTest, submitAnswer } from './tests'
export type { CreateTestInput } from './tests'
export { registerPushToken, unregisterPushToken } from './push'
export { fetchStoreInfo, reportPurchase } from './store'
export type { PushPlatform } from './push'
export { fetchVersionCheck } from './version'
export type * from './types'
