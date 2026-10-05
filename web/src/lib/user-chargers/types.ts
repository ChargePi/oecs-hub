import type { CategoryRating, ChargerVariant } from '@/lib/oecs/types'

export interface Favorite {
  charger: ChargerVariant
  favoritedAt: string
}

export interface FavoritesPage {
  favorites: Favorite[]
  nextPageToken: string
  totalSize: number
}

export interface Project {
  id: string
  name: string
  description?: string
  chargerCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectsPage {
  projects: Project[]
  nextPageToken: string
  totalSize: number
}

export interface ProjectCharger {
  charger: ChargerVariant
  note?: string
}

export interface ProjectDetail {
  project: Project
  chargers: ProjectCharger[]
}

export type ProjectChargerAction = 'add' | 'remove' | 'set_note'

export interface ProjectChargerChange {
  chargerVariantId: string
  action: ProjectChargerAction
  /** Used by 'add' and 'set_note'; ignored by 'remove'. */
  note?: string
}

export interface RatingScore {
  categoryName: string
  score: number
}

export interface MyRating {
  charger: ChargerVariant
  myScores: RatingScore[]
  aggregate: CategoryRating[]
  ratedAt: string
}

export interface MyRatingsPage {
  ratings: MyRating[]
  nextPageToken: string
  totalSize: number
}

export type PendingActionKind = 'favorite' | 'project' | 'rating'

/** Where the user's decision on an assistant-proposed action stands. 'expired' is never
 *  returned by the hub - an expired action is simply gone - but is what the chat shows
 *  for one it can no longer find. */
export type PendingActionStatus = 'pending' | 'confirmed' | 'rejected' | 'failed' | 'expired'

/** A change to the user's favorites/projects/ratings the chat assistant proposed, which
 *  only runs once the user confirms it. */
export interface PendingAction {
  id: string
  kind: PendingActionKind
  /** Exactly what Confirm will do, written by the hub - not by the assistant. */
  summary: string
  status: PendingActionStatus
  expiresAt: string
}
