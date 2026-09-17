import { normalizeAndDispatch } from '@/lib/errors'
import {
  FavoriteServiceClient,
  ProjectServiceClient,
  RatingServiceClient,
} from '@/lib/registry/gen/userchargers/v1/UserchargersServiceClientPb'
import {
  CreateProjectRequest,
  DeleteProjectRequest,
  FavoriteChargerRequest,
  FavoriteState,
  GetProjectRequest,
  ListFavoritesRequest,
  ListMyRatingsRequest,
  ListProjectsRequest,
  ManageProjectChargersRequest,
  type MyRating as MyRatingProto,
  ProjectChargerAction,
  ProjectChargerChange,
  type ProjectCharger as ProjectChargerProto,
  RatingInput,
  SubmitRatingRequest,
  UpdateProjectRequest,
} from '@/lib/registry/gen/userchargers/v1/userchargers_pb'
import { categoryRatingFromProto, chargerVariantFromSummary } from '@/lib/registry/grpc-mapping'

import type {
  Favorite,
  FavoritesPage,
  MyRating,
  MyRatingsPage,
  Project,
  ProjectCharger,
  ProjectChargerChange as ProjectChargerChangeInput,
  ProjectDetail,
  ProjectsPage,
  RatingScore,
} from './types'

// Registered on the same public gRPC server as RegistryService/ManufacturerService, not a
// separate backend - same base as registry/grpc-client.ts's BASE_URL.
const BASE_URL = '/api'

const favoriteClient = new FavoriteServiceClient(BASE_URL, null, null)
const projectClient = new ProjectServiceClient(BASE_URL, null, null)
const ratingClient = new RatingServiceClient(BASE_URL, null, null)

function mapError(err: unknown, context: string): never {
  normalizeAndDispatch(err, context, 'user-chargers request failed')
}

function projectFromProto(p: {
  getId(): string
  getName(): string
  getDescription(): string
  hasDescription(): boolean
  getChargerCount(): number
  getCreatedAt(): { toDate(): Date } | undefined
  getUpdatedAt(): { toDate(): Date } | undefined
}): Project {
  return {
    id: p.getId(),
    name: p.getName(),
    description: p.hasDescription() ? p.getDescription() : undefined,
    chargerCount: p.getChargerCount(),
    createdAt: p.getCreatedAt()?.toDate().toISOString() ?? '',
    updatedAt: p.getUpdatedAt()?.toDate().toISOString() ?? '',
  }
}

function projectChargerFromProto(pc: ProjectChargerProto): ProjectCharger {
  const summary = pc.getSummary()
  if (!summary) throw new Error('ProjectCharger missing summary')

  return {
    charger: chargerVariantFromSummary(summary),
    note: pc.hasNote() ? pc.getNote() : undefined,
  }
}

function myRatingFromProto(r: MyRatingProto): MyRating {
  const summary = r.getSummary()
  if (!summary) throw new Error('MyRating missing summary')

  return {
    charger: chargerVariantFromSummary(summary),
    myScores: r
      .getMyScoresList()
      .map((s): RatingScore => ({ categoryName: s.getCategoryName(), score: s.getScore() })),
    aggregate: r.getAggregateList().map(categoryRatingFromProto),
    ratedAt: r.getRatedAt()?.toDate().toISOString() ?? '',
  }
}

const ACTION_TO_PROTO: Record<ProjectChargerChangeInput['action'], ProjectChargerAction> = {
  add: ProjectChargerAction.PROJECT_CHARGER_ACTION_ADD,
  remove: ProjectChargerAction.PROJECT_CHARGER_ACTION_REMOVE,
  set_note: ProjectChargerAction.PROJECT_CHARGER_ACTION_SET_NOTE,
}

function changeToProto(change: ProjectChargerChangeInput): ProjectChargerChange {
  const req = new ProjectChargerChange()
  req.setChargerVariantId(change.chargerVariantId)
  req.setAction(ACTION_TO_PROTO[change.action])
  if (change.note !== undefined) req.setNote(change.note)
  return req
}

export async function favoriteCharger(
  chargerVariantId: string,
  favorited: boolean,
): Promise<boolean> {
  const req = new FavoriteChargerRequest()
  req.setChargerVariantId(chargerVariantId)
  req.setState(
    favorited ? FavoriteState.FAVORITE_STATE_FAVORITED : FavoriteState.FAVORITE_STATE_UNFAVORITED,
  )

  try {
    const resp = await favoriteClient.favoriteCharger(req, {})
    return resp.getFavorited()
  } catch (err) {
    mapError(err, `favoriteCharger(${chargerVariantId})`)
  }
}

export async function listFavorites(params: {
  pageSize: number
  pageToken?: string
}): Promise<FavoritesPage> {
  const req = new ListFavoritesRequest()
  req.setPageSize(params.pageSize)
  req.setPageToken(params.pageToken ?? '')

  try {
    const resp = await favoriteClient.listFavorites(req, {})
    return {
      favorites: resp.getFavoritesList().map((f): Favorite => ({
        charger: chargerVariantFromSummary(f.getSummary()!),
        favoritedAt: f.getFavoritedAt()?.toDate().toISOString() ?? '',
      })),
      nextPageToken: resp.getNextPageToken(),
      totalSize: resp.getTotalSize(),
    }
  } catch (err) {
    mapError(err, 'listFavorites')
  }
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const req = new CreateProjectRequest()
  req.setName(name)
  if (description !== undefined) req.setDescription(description)

  try {
    const resp = await projectClient.createProject(req, {})
    return projectFromProto(resp.getProject()!)
  } catch (err) {
    mapError(err, 'createProject')
  }
}

export async function updateProject(
  id: string,
  attrs: { name?: string; description?: string },
): Promise<Project> {
  const req = new UpdateProjectRequest()
  req.setId(id)
  if (attrs.name !== undefined) req.setName(attrs.name)
  if (attrs.description !== undefined) req.setDescription(attrs.description)

  try {
    const resp = await projectClient.updateProject(req, {})
    return projectFromProto(resp.getProject()!)
  } catch (err) {
    mapError(err, `updateProject(${id})`)
  }
}

export async function deleteProject(id: string): Promise<void> {
  const req = new DeleteProjectRequest()
  req.setId(id)

  try {
    await projectClient.deleteProject(req, {})
  } catch (err) {
    mapError(err, `deleteProject(${id})`)
  }
}

export async function listProjects(params: {
  pageSize: number
  pageToken?: string
}): Promise<ProjectsPage> {
  const req = new ListProjectsRequest()
  req.setPageSize(params.pageSize)
  req.setPageToken(params.pageToken ?? '')

  try {
    const resp = await projectClient.listProjects(req, {})
    return {
      projects: resp.getProjectsList().map(projectFromProto),
      nextPageToken: resp.getNextPageToken(),
      totalSize: resp.getTotalSize(),
    }
  } catch (err) {
    mapError(err, 'listProjects')
  }
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const req = new GetProjectRequest()
  req.setId(id)

  try {
    const resp = await projectClient.getProject(req, {})
    return {
      project: projectFromProto(resp.getProject()!),
      chargers: resp.getChargersList().map(projectChargerFromProto),
    }
  } catch (err) {
    mapError(err, `getProject(${id})`)
  }
}

export async function manageProjectChargers(
  projectId: string,
  changes: ProjectChargerChangeInput[],
  orderedChargerVariantIds?: string[],
): Promise<ProjectDetail> {
  const req = new ManageProjectChargersRequest()
  req.setProjectId(projectId)
  req.setChangesList(changes.map(changeToProto))
  if (orderedChargerVariantIds) req.setOrderedChargerVariantIdsList(orderedChargerVariantIds)

  try {
    const resp = await projectClient.manageProjectChargers(req, {})
    return {
      project: projectFromProto(resp.getProject()!),
      chargers: resp.getChargersList().map(projectChargerFromProto),
    }
  } catch (err) {
    mapError(err, `manageProjectChargers(${projectId})`)
  }
}

export async function submitRating(
  chargerVariantId: string,
  ratings: RatingScore[],
): Promise<void> {
  const req = new SubmitRatingRequest()
  req.setChargerVariantId(chargerVariantId)
  req.setRatingsList(
    ratings.map((r) => {
      const input = new RatingInput()
      input.setCategoryName(r.categoryName)
      input.setScore(r.score)
      return input
    }),
  )

  try {
    await ratingClient.submitRating(req, {})
  } catch (err) {
    mapError(err, `submitRating(${chargerVariantId})`)
  }
}

export async function listMyRatings(params: {
  pageSize: number
  pageToken?: string
}): Promise<MyRatingsPage> {
  const req = new ListMyRatingsRequest()
  req.setPageSize(params.pageSize)
  req.setPageToken(params.pageToken ?? '')

  try {
    const resp = await ratingClient.listMyRatings(req, {})
    return {
      ratings: resp.getRatingsList().map(myRatingFromProto),
      nextPageToken: resp.getNextPageToken(),
      totalSize: resp.getTotalSize(),
    }
  } catch (err) {
    mapError(err, 'listMyRatings')
  }
}
