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

// ─── API request/response shapes ─────────────────────────────────────────────

export interface CreateJourneyInput {
  substance: string
  doseMg?: number
  doseUnit?: string
  sporeSource?: string
  scheduledAt: string
  intentions?: string
  setting?: string
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

// ─── Sync protocol ────────────────────────────────────────────────────────────

export interface SyncPushPayload {
  lastSyncedAt: string | null
  journeys: Array<Journey & { _deleted?: boolean }>
  entries: Array<Entry & { _deleted?: boolean }>
  insights: Array<Insight & { _deleted?: boolean }>
  beliefs: Array<Belief & { _deleted?: boolean }>
  rituals: Array<Ritual & { _deleted?: boolean }>
}

export interface SyncPullResponse {
  syncedAt: string
  journeys: Journey[]
  entries: Entry[]
  insights: Insight[]
  beliefs: Belief[]
  rituals: Ritual[]
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
