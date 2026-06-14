// ─── Enums ────────────────────────────────────────────────────────────────────

export type Phase = 'BEFORE' | 'DURING' | 'AFTER' | 'INTEGRATION'

export type PostType = 'INSIGHT' | 'RITUAL' | 'DOCTRINE_EXCERPT' | 'REFLECTION'

export type Visibility = 'PRIVATE' | 'TRIBE' | 'PUBLIC'

export type BeliefCategory =
  | 'ETHICS'
  | 'COSMOLOGY'
  | 'PRACTICE'
  | 'RELATIONSHIPS'
  | 'PURPOSE'
  | 'DEATH'
  | 'OTHER'

export type NoteType = 'TEXT' | 'AUDIO' | 'VISUAL' | 'PHOTO'

export type IntegrationType = 'GOOGLE_WORKSPACE' | 'GOOGLE_HOME' | 'SPOTIFY' | 'BRAINFM' | 'GEMINI'

export type CompanionProvider = 'gemini' | 'claude'

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Seeker {
  id: string
  supabaseId: string
  username: string | null
  tribeHandle: string | null
  createdAt: string
  updatedAt: string
}

export interface Journey {
  id: string
  seekerId: string
  substance: string
  doseMg: number | null
  doseUnit: string
  sporeSource: string | null
  scheduledAt: string
  intentions: string | null
  setting: string | null
  entries?: Entry[]
  insights?: Insight[]
  doseEvents?: DoseEvent[]
  createdAt: string
  updatedAt: string
}

export interface Entry {
  id: string
  journeyId: string
  content: string
  phase: Phase
  timestamp: string
  createdAt: string
}

export interface DoseEvent {
  id: string
  journeyId: string
  substance: string
  doseMg: number
  doseUnit: string
  takenAt: string
  cumulativeMg: number | null
  notes: string | null
  createdAt: string
}

export interface Note {
  id: string
  journeyId: string
  seekerId: string
  type: NoteType
  content: string | null
  mediaUrl: string | null
  canvasData: string | null
  phase: Phase | null
  mood: number | null
  bodyFeel: number | null
  analysis: string | null
  timestamp: string
  createdAt: string
}

export interface JourneyRecommendation {
  id: string
  journeyId: string
  seekerId: string
  content: string
  categories: string[]
  generatedAt: string
}

export interface JourneyAnalysis {
  themes: string[]
  emotionalArc: string
  physicalSensations: string[]
  synchronicities: string[]
  integrationAreas: string[]
  rawSummary: string
}

export interface Insight {
  id: string
  journeyId: string | null
  seekerId: string
  content: string
  tags: string[]
  resonance: number
  isCore: boolean
  createdAt: string
  updatedAt: string
}

export interface Belief {
  id: string
  seekerId: string
  content: string
  category: BeliefCategory | null
  createdAt: string
  updatedAt: string
}

export interface Ritual {
  id: string
  seekerId: string
  name: string
  description: string
  frequency: string | null
  createdAt: string
  updatedAt: string
}

export interface SacredText {
  id: string
  seekerId: string
  content: string
  version: number
  generatedAt: string
}

export interface TribePost {
  id: string
  seekerId: string
  seeker?: Pick<Seeker, 'tribeHandle'>
  content: string
  type: PostType
  visibility: Visibility
  resonances: number
  createdAt: string
  updatedAt: string
}

export interface Integration {
  id: string
  seekerId: string
  type: IntegrationType
  metadata: Record<string, unknown> | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionTrack {
  id: string
  journeyId: string
  source: string
  trackId: string | null
  trackName: string
  artist: string | null
  startedAt: string
  endedAt: string | null
}

// ─── Metrics / Analytics ─────────────────────────────────────────────────────

export interface JourneyMetrics {
  journeyId: string
  substance: string
  scheduledAt: string
  totalDoseMg: number
  doseEventCount: number
  noteCount: number
  insightCount: number
  avgMood: number | null
  avgBodyFeel: number | null
  durationMinutes: number | null
}

// ─── API request shapes ───────────────────────────────────────────────────────

export interface CreateJourneyInput {
  substance: string
  doseMg?: number
  doseUnit?: string
  sporeSource?: string
  scheduledAt: string
  intentions?: string
  setting?: string
}

export interface CreateDoseEventInput {
  substance: string
  doseMg: number
  doseUnit?: string
  takenAt?: string
  notes?: string
}

export interface CreateNoteInput {
  type: NoteType
  content?: string
  mediaUrl?: string
  canvasData?: string
  phase?: Phase
  mood?: number
  bodyFeel?: number
}

export interface CreateEntryInput {
  content: string
  phase: Phase
  timestamp?: string
}

export interface CreateInsightInput {
  content: string
  tags?: string[]
  resonance?: number
  isCore?: boolean
  journeyId?: string
}

export interface CreateBeliefInput {
  content: string
  category?: BeliefCategory
  insightIds?: string[]
}

export interface CreateRitualInput {
  name: string
  description: string
  frequency?: string
  beliefIds?: string[]
}

export interface CreateTribePostInput {
  content: string
  type: PostType
  visibility?: Visibility
}

export interface GenerateDoctrineInput {
  includeInsights?: boolean
  includeBeliefs?: boolean
  includeRituals?: boolean
  additionalContext?: string
}

export interface CompanionMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface CompanionRequest {
  audioBase64?: string
  text?: string
  history: CompanionMessage[]
  journeyId: string
  provider: CompanionProvider
}

export interface CompanionResponse {
  text: string
  timestamp: string
}

// ─── Sync protocol ────────────────────────────────────────────────────────────

export interface SyncPushPayload {
  lastSyncedAt: string | null
  journeys: Array<Journey & { _deleted?: boolean }>
  entries: Array<Entry & { _deleted?: boolean }>
  insights: Array<Insight & { _deleted?: boolean }>
  beliefs: Array<Belief & { _deleted?: boolean }>
  rituals: Array<Ritual & { _deleted?: boolean }>
  doseEvents: Array<DoseEvent & { _deleted?: boolean }>
  notes: Array<Note & { _deleted?: boolean }>
}

export interface SyncPullResponse {
  syncedAt: string
  journeys: Journey[]
  entries: Entry[]
  insights: Insight[]
  beliefs: Belief[]
  rituals: Ritual[]
  doseEvents: DoseEvent[]
  notes: Note[]
}

// ─── API response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
  }
}
