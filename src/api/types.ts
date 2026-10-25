/**
 * Types van de koppeling met studiemaat.nl. Spiegel van wat de website teruggeeft
 * (studypro/src/lib/mobile.ts, src/lib/schemas.ts, src/lib/repo.ts). Bij wijzigingen daar: hier bijwerken.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError }

export interface ApiError {
  /** NETWORK_ERROR | UNAUTHORIZED | NO_ACCESS (402) | LIMIT (429) | API_ERROR */
  code: string
  message: string
}

/** store: abonnement via de App Store of Google Play (opzeggen in de telefoon), anders null/afwezig. */
export type Access =
  | { kind: 'gratis'; hasAccess: boolean; label: string | null; store?: null }
  | { kind: 'actief'; plan: string; until: string; cancelled?: boolean; hasAccess: boolean; label: string | null; store?: StoreName | null }
  | { kind: 'verlopen'; plan: string | null; until: string | null; hasAccess: boolean; label: string | null; store?: null }

export type StoreName = 'apple' | 'google'

/** GET /mobile/store */
export interface StoreInfo {
  products: { productId: string; plan: 'maand' | 'kwartaal' | 'jaar' }[]
  /** Vaste UUID van dit account; gaat mee als appAccountToken (iOS) / obfuscatedAccountId (Android). */
  accountId: string
  available: { apple: boolean; google: boolean }
}

/** POST /mobile/store/purchase */
export type PurchaseResult =
  | { ok: true; active: boolean; me: Me | null }
  | { ok: false; reason: 'not_configured' | 'not_found' | 'unknown_product' | 'unknown_user' | 'other_account' | 'wrong_app'; message: string }

export type Difficulty = 'makkelijker' | 'normaal' | 'uitdagend'
export type ScanPart = 'uittreksel' | 'begrippen' | 'tabellen' | 'vragen'
export type QuestionAmount = 'weinig' | 'normaal' | 'veel'

export interface Profile {
  level: string | null
  year: number | null
  difficulty: Difficulty
}

export interface ScanOptions {
  parts: ScanPart[]
  questions: QuestionAmount
}

export interface Me {
  user: { id: number; name: string; email: string | null }
  access: Access
  profile: Profile
  scan: ScanOptions
}

export interface Session extends Me {
  token: string
  isNew: boolean
}

export interface Options {
  levels: { id: string; label: string; short: string; years: number; group: 'po' | 'vo' | 'vervolg' }[]
  difficulties: { id: Difficulty; label: string; text: string }[]
  scanParts: { id: ScanPart; label: string; text: string }[]
  questionAmounts: { id: QuestionAmount; label: string; count: string }[]
  plans: { id: string; label: string; months: number; cents: number; price: string; perMonth: string }[]
  trialDays: number
}

export type LessonStatus = 'processing' | 'ready' | 'error'

export interface LessonListItem {
  id: number
  title: string
  subject: string
  status: LessonStatus
  error: string | null
  createdAt: string
  questionCount: number
  freshCount: number
}

export type QuestionKind = 'meerkeuze' | 'kort' | 'open'

export interface Question {
  id: string
  soort: QuestionKind
  onderwerp: string
  vraag: string
  opties: string[]
  /** -1 als de app het antwoord (nog) niet mag zien */
  juisteOptie: number
  antwoord: string
  alternatieven: string[]
  uitleg: string
  /** BCP-47, bv. nl-NL of en-GB: voor spraakherkenning en voorlezen */
  taal: string
}

export interface TestQuestion extends Question {
  lessonId: number
  lessonTitle: string
}

export type SidenoteKind = 'tip' | 'ezelsbruggetje' | 'let op' | 'voorbeeld' | 'weetje'

export interface LessonContent {
  titelSuggestie: string
  korteSamenvatting: string
  kernpunten: string[]
  secties: { titel: string; inhoud: string; onderwerp: string; sidenotes: { soort: SidenoteKind; tekst: string }[] }[]
  begrippen: { term: string; uitleg: string; voorbeeld: string }[]
  tabellen: { titel: string; kolommen: string[]; rijen: string[][] }[]
  onderwerpen: string[]
  vragen: Question[]
}

export interface TopicStat {
  lessonId: number
  topic: string
  total: number
  attempted: number
  avg: number
  grade: number
  verdict: 'onbekend' | 'voldoende' | 'twijfel' | 'onvoldoende'
}

export interface Lesson {
  id: number
  title: string
  subject: string
  status: LessonStatus
  error: string | null
  createdAt: string
  instructions: string
  content: LessonContent | null
  pages: { id: number; position: number; url: string }[]
  topics: TopicStat[]
  freshCount: number
  makingQuestions: boolean
}

export type TestMode = 'oefenen' | 'proeftoets' | 'herhaling'

export interface TestListItem {
  id: number
  title: string
  mode: TestMode
  score: number | null
  maxScore: number | null
  grade: number | null
  createdAt: string
  finishedAt: string | null
  questionCount: number
  answered: number
}

export interface AnswerRow {
  position: number
  answer: string
  score: number | null
  feedback: string | null
}

export interface Test {
  id: number
  title: string
  mode: TestMode
  lessonIds: number[]
  questions: TestQuestion[]
  score: number | null
  maxScore: number | null
  grade: number | null
  createdAt: string
  finishedAt: string | null
  answers: AnswerRow[]
}

export interface Grade {
  oordeel: 'goed' | 'deels' | 'fout'
  feedback: string
  score: number
  correctAnswer: number | string
  explanation: string
}

export interface VersionCheck {
  minSupported: string
  recommended: string
  message: string | null
}

export interface Invite {
  email: string
  accepted_at: string | null
}
