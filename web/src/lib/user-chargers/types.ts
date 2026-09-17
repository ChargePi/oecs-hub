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
