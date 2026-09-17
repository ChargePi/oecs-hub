import * as jspb from 'google-protobuf'

import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb'; // proto import: "google/protobuf/empty.proto"
import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"
import * as registry_v1_registry_pb from '../../registry/v1/registry_pb'; // proto import: "registry/v1/registry.proto"


export class FavoriteChargerRequest extends jspb.Message {
  getChargerVariantId(): string;
  setChargerVariantId(value: string): FavoriteChargerRequest;

  getState(): FavoriteState;
  setState(value: FavoriteState): FavoriteChargerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FavoriteChargerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: FavoriteChargerRequest): FavoriteChargerRequest.AsObject;
  static serializeBinaryToWriter(message: FavoriteChargerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FavoriteChargerRequest;
  static deserializeBinaryFromReader(message: FavoriteChargerRequest, reader: jspb.BinaryReader): FavoriteChargerRequest;
}

export namespace FavoriteChargerRequest {
  export type AsObject = {
    chargerVariantId: string;
    state: FavoriteState;
  };
}

export class FavoriteChargerResponse extends jspb.Message {
  getChargerVariantId(): string;
  setChargerVariantId(value: string): FavoriteChargerResponse;

  getFavorited(): boolean;
  setFavorited(value: boolean): FavoriteChargerResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): FavoriteChargerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: FavoriteChargerResponse): FavoriteChargerResponse.AsObject;
  static serializeBinaryToWriter(message: FavoriteChargerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): FavoriteChargerResponse;
  static deserializeBinaryFromReader(message: FavoriteChargerResponse, reader: jspb.BinaryReader): FavoriteChargerResponse;
}

export namespace FavoriteChargerResponse {
  export type AsObject = {
    chargerVariantId: string;
    favorited: boolean;
  };
}

export class ListFavoritesRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): ListFavoritesRequest;

  getPageToken(): string;
  setPageToken(value: string): ListFavoritesRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListFavoritesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListFavoritesRequest): ListFavoritesRequest.AsObject;
  static serializeBinaryToWriter(message: ListFavoritesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListFavoritesRequest;
  static deserializeBinaryFromReader(message: ListFavoritesRequest, reader: jspb.BinaryReader): ListFavoritesRequest;
}

export namespace ListFavoritesRequest {
  export type AsObject = {
    pageSize: number;
    pageToken: string;
  };
}

export class Favorite extends jspb.Message {
  getSummary(): registry_v1_registry_pb.ChargerVariantSummary | undefined;
  setSummary(value?: registry_v1_registry_pb.ChargerVariantSummary): Favorite;
  hasSummary(): boolean;
  clearSummary(): Favorite;

  getFavoritedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setFavoritedAt(value?: google_protobuf_timestamp_pb.Timestamp): Favorite;
  hasFavoritedAt(): boolean;
  clearFavoritedAt(): Favorite;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Favorite.AsObject;
  static toObject(includeInstance: boolean, msg: Favorite): Favorite.AsObject;
  static serializeBinaryToWriter(message: Favorite, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Favorite;
  static deserializeBinaryFromReader(message: Favorite, reader: jspb.BinaryReader): Favorite;
}

export namespace Favorite {
  export type AsObject = {
    summary?: registry_v1_registry_pb.ChargerVariantSummary.AsObject;
    favoritedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
  };
}

export class ListFavoritesResponse extends jspb.Message {
  getFavoritesList(): Array<Favorite>;
  setFavoritesList(value: Array<Favorite>): ListFavoritesResponse;
  clearFavoritesList(): ListFavoritesResponse;
  addFavorites(value?: Favorite, index?: number): Favorite;

  getTotalSize(): number;
  setTotalSize(value: number): ListFavoritesResponse;

  getNextPageToken(): string;
  setNextPageToken(value: string): ListFavoritesResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListFavoritesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListFavoritesResponse): ListFavoritesResponse.AsObject;
  static serializeBinaryToWriter(message: ListFavoritesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListFavoritesResponse;
  static deserializeBinaryFromReader(message: ListFavoritesResponse, reader: jspb.BinaryReader): ListFavoritesResponse;
}

export namespace ListFavoritesResponse {
  export type AsObject = {
    favoritesList: Array<Favorite.AsObject>;
    totalSize: number;
    nextPageToken: string;
  };
}

export class Project extends jspb.Message {
  getId(): string;
  setId(value: string): Project;

  getName(): string;
  setName(value: string): Project;

  getDescription(): string;
  setDescription(value: string): Project;
  hasDescription(): boolean;
  clearDescription(): Project;

  getChargerCount(): number;
  setChargerCount(value: number): Project;

  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Project;
  hasCreatedAt(): boolean;
  clearCreatedAt(): Project;

  getUpdatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdatedAt(value?: google_protobuf_timestamp_pb.Timestamp): Project;
  hasUpdatedAt(): boolean;
  clearUpdatedAt(): Project;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Project.AsObject;
  static toObject(includeInstance: boolean, msg: Project): Project.AsObject;
  static serializeBinaryToWriter(message: Project, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Project;
  static deserializeBinaryFromReader(message: Project, reader: jspb.BinaryReader): Project;
}

export namespace Project {
  export type AsObject = {
    id: string;
    name: string;
    description?: string;
    chargerCount: number;
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    updatedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
  };

  export enum DescriptionCase {
    _DESCRIPTION_NOT_SET = 0,
    DESCRIPTION = 3,
  }
}

export class ProjectCharger extends jspb.Message {
  getSummary(): registry_v1_registry_pb.ChargerVariantSummary | undefined;
  setSummary(value?: registry_v1_registry_pb.ChargerVariantSummary): ProjectCharger;
  hasSummary(): boolean;
  clearSummary(): ProjectCharger;

  getNote(): string;
  setNote(value: string): ProjectCharger;
  hasNote(): boolean;
  clearNote(): ProjectCharger;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProjectCharger.AsObject;
  static toObject(includeInstance: boolean, msg: ProjectCharger): ProjectCharger.AsObject;
  static serializeBinaryToWriter(message: ProjectCharger, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProjectCharger;
  static deserializeBinaryFromReader(message: ProjectCharger, reader: jspb.BinaryReader): ProjectCharger;
}

export namespace ProjectCharger {
  export type AsObject = {
    summary?: registry_v1_registry_pb.ChargerVariantSummary.AsObject;
    note?: string;
  };

  export enum NoteCase {
    _NOTE_NOT_SET = 0,
    NOTE = 2,
  }
}

export class CreateProjectRequest extends jspb.Message {
  getName(): string;
  setName(value: string): CreateProjectRequest;

  getDescription(): string;
  setDescription(value: string): CreateProjectRequest;
  hasDescription(): boolean;
  clearDescription(): CreateProjectRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateProjectRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateProjectRequest): CreateProjectRequest.AsObject;
  static serializeBinaryToWriter(message: CreateProjectRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateProjectRequest;
  static deserializeBinaryFromReader(message: CreateProjectRequest, reader: jspb.BinaryReader): CreateProjectRequest;
}

export namespace CreateProjectRequest {
  export type AsObject = {
    name: string;
    description?: string;
  };

  export enum DescriptionCase {
    _DESCRIPTION_NOT_SET = 0,
    DESCRIPTION = 2,
  }
}

export class CreateProjectResponse extends jspb.Message {
  getProject(): Project | undefined;
  setProject(value?: Project): CreateProjectResponse;
  hasProject(): boolean;
  clearProject(): CreateProjectResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateProjectResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateProjectResponse): CreateProjectResponse.AsObject;
  static serializeBinaryToWriter(message: CreateProjectResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateProjectResponse;
  static deserializeBinaryFromReader(message: CreateProjectResponse, reader: jspb.BinaryReader): CreateProjectResponse;
}

export namespace CreateProjectResponse {
  export type AsObject = {
    project?: Project.AsObject;
  };
}

export class UpdateProjectRequest extends jspb.Message {
  getId(): string;
  setId(value: string): UpdateProjectRequest;

  getName(): string;
  setName(value: string): UpdateProjectRequest;
  hasName(): boolean;
  clearName(): UpdateProjectRequest;

  getDescription(): string;
  setDescription(value: string): UpdateProjectRequest;
  hasDescription(): boolean;
  clearDescription(): UpdateProjectRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateProjectRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateProjectRequest): UpdateProjectRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateProjectRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateProjectRequest;
  static deserializeBinaryFromReader(message: UpdateProjectRequest, reader: jspb.BinaryReader): UpdateProjectRequest;
}

export namespace UpdateProjectRequest {
  export type AsObject = {
    id: string;
    name?: string;
    description?: string;
  };

  export enum NameCase {
    _NAME_NOT_SET = 0,
    NAME = 2,
  }

  export enum DescriptionCase {
    _DESCRIPTION_NOT_SET = 0,
    DESCRIPTION = 3,
  }
}

export class UpdateProjectResponse extends jspb.Message {
  getProject(): Project | undefined;
  setProject(value?: Project): UpdateProjectResponse;
  hasProject(): boolean;
  clearProject(): UpdateProjectResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateProjectResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateProjectResponse): UpdateProjectResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateProjectResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateProjectResponse;
  static deserializeBinaryFromReader(message: UpdateProjectResponse, reader: jspb.BinaryReader): UpdateProjectResponse;
}

export namespace UpdateProjectResponse {
  export type AsObject = {
    project?: Project.AsObject;
  };
}

export class DeleteProjectRequest extends jspb.Message {
  getId(): string;
  setId(value: string): DeleteProjectRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteProjectRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteProjectRequest): DeleteProjectRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteProjectRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteProjectRequest;
  static deserializeBinaryFromReader(message: DeleteProjectRequest, reader: jspb.BinaryReader): DeleteProjectRequest;
}

export namespace DeleteProjectRequest {
  export type AsObject = {
    id: string;
  };
}

export class ListProjectsRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): ListProjectsRequest;

  getPageToken(): string;
  setPageToken(value: string): ListProjectsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListProjectsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListProjectsRequest): ListProjectsRequest.AsObject;
  static serializeBinaryToWriter(message: ListProjectsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListProjectsRequest;
  static deserializeBinaryFromReader(message: ListProjectsRequest, reader: jspb.BinaryReader): ListProjectsRequest;
}

export namespace ListProjectsRequest {
  export type AsObject = {
    pageSize: number;
    pageToken: string;
  };
}

export class ListProjectsResponse extends jspb.Message {
  getProjectsList(): Array<Project>;
  setProjectsList(value: Array<Project>): ListProjectsResponse;
  clearProjectsList(): ListProjectsResponse;
  addProjects(value?: Project, index?: number): Project;

  getTotalSize(): number;
  setTotalSize(value: number): ListProjectsResponse;

  getNextPageToken(): string;
  setNextPageToken(value: string): ListProjectsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListProjectsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListProjectsResponse): ListProjectsResponse.AsObject;
  static serializeBinaryToWriter(message: ListProjectsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListProjectsResponse;
  static deserializeBinaryFromReader(message: ListProjectsResponse, reader: jspb.BinaryReader): ListProjectsResponse;
}

export namespace ListProjectsResponse {
  export type AsObject = {
    projectsList: Array<Project.AsObject>;
    totalSize: number;
    nextPageToken: string;
  };
}

export class GetProjectRequest extends jspb.Message {
  getId(): string;
  setId(value: string): GetProjectRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetProjectRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetProjectRequest): GetProjectRequest.AsObject;
  static serializeBinaryToWriter(message: GetProjectRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetProjectRequest;
  static deserializeBinaryFromReader(message: GetProjectRequest, reader: jspb.BinaryReader): GetProjectRequest;
}

export namespace GetProjectRequest {
  export type AsObject = {
    id: string;
  };
}

export class GetProjectResponse extends jspb.Message {
  getProject(): Project | undefined;
  setProject(value?: Project): GetProjectResponse;
  hasProject(): boolean;
  clearProject(): GetProjectResponse;

  getChargersList(): Array<ProjectCharger>;
  setChargersList(value: Array<ProjectCharger>): GetProjectResponse;
  clearChargersList(): GetProjectResponse;
  addChargers(value?: ProjectCharger, index?: number): ProjectCharger;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetProjectResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetProjectResponse): GetProjectResponse.AsObject;
  static serializeBinaryToWriter(message: GetProjectResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetProjectResponse;
  static deserializeBinaryFromReader(message: GetProjectResponse, reader: jspb.BinaryReader): GetProjectResponse;
}

export namespace GetProjectResponse {
  export type AsObject = {
    project?: Project.AsObject;
    chargersList: Array<ProjectCharger.AsObject>;
  };
}

export class ProjectChargerChange extends jspb.Message {
  getChargerVariantId(): string;
  setChargerVariantId(value: string): ProjectChargerChange;

  getAction(): ProjectChargerAction;
  setAction(value: ProjectChargerAction): ProjectChargerChange;

  getNote(): string;
  setNote(value: string): ProjectChargerChange;
  hasNote(): boolean;
  clearNote(): ProjectChargerChange;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProjectChargerChange.AsObject;
  static toObject(includeInstance: boolean, msg: ProjectChargerChange): ProjectChargerChange.AsObject;
  static serializeBinaryToWriter(message: ProjectChargerChange, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProjectChargerChange;
  static deserializeBinaryFromReader(message: ProjectChargerChange, reader: jspb.BinaryReader): ProjectChargerChange;
}

export namespace ProjectChargerChange {
  export type AsObject = {
    chargerVariantId: string;
    action: ProjectChargerAction;
    note?: string;
  };

  export enum NoteCase {
    _NOTE_NOT_SET = 0,
    NOTE = 3,
  }
}

export class ManageProjectChargersRequest extends jspb.Message {
  getProjectId(): string;
  setProjectId(value: string): ManageProjectChargersRequest;

  getChangesList(): Array<ProjectChargerChange>;
  setChangesList(value: Array<ProjectChargerChange>): ManageProjectChargersRequest;
  clearChangesList(): ManageProjectChargersRequest;
  addChanges(value?: ProjectChargerChange, index?: number): ProjectChargerChange;

  getOrderedChargerVariantIdsList(): Array<string>;
  setOrderedChargerVariantIdsList(value: Array<string>): ManageProjectChargersRequest;
  clearOrderedChargerVariantIdsList(): ManageProjectChargersRequest;
  addOrderedChargerVariantIds(value: string, index?: number): ManageProjectChargersRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ManageProjectChargersRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ManageProjectChargersRequest): ManageProjectChargersRequest.AsObject;
  static serializeBinaryToWriter(message: ManageProjectChargersRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ManageProjectChargersRequest;
  static deserializeBinaryFromReader(message: ManageProjectChargersRequest, reader: jspb.BinaryReader): ManageProjectChargersRequest;
}

export namespace ManageProjectChargersRequest {
  export type AsObject = {
    projectId: string;
    changesList: Array<ProjectChargerChange.AsObject>;
    orderedChargerVariantIdsList: Array<string>;
  };
}

export class ManageProjectChargersResponse extends jspb.Message {
  getProject(): Project | undefined;
  setProject(value?: Project): ManageProjectChargersResponse;
  hasProject(): boolean;
  clearProject(): ManageProjectChargersResponse;

  getChargersList(): Array<ProjectCharger>;
  setChargersList(value: Array<ProjectCharger>): ManageProjectChargersResponse;
  clearChargersList(): ManageProjectChargersResponse;
  addChargers(value?: ProjectCharger, index?: number): ProjectCharger;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ManageProjectChargersResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ManageProjectChargersResponse): ManageProjectChargersResponse.AsObject;
  static serializeBinaryToWriter(message: ManageProjectChargersResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ManageProjectChargersResponse;
  static deserializeBinaryFromReader(message: ManageProjectChargersResponse, reader: jspb.BinaryReader): ManageProjectChargersResponse;
}

export namespace ManageProjectChargersResponse {
  export type AsObject = {
    project?: Project.AsObject;
    chargersList: Array<ProjectCharger.AsObject>;
  };
}

export class RatingInput extends jspb.Message {
  getCategoryName(): string;
  setCategoryName(value: string): RatingInput;

  getScore(): number;
  setScore(value: number): RatingInput;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RatingInput.AsObject;
  static toObject(includeInstance: boolean, msg: RatingInput): RatingInput.AsObject;
  static serializeBinaryToWriter(message: RatingInput, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RatingInput;
  static deserializeBinaryFromReader(message: RatingInput, reader: jspb.BinaryReader): RatingInput;
}

export namespace RatingInput {
  export type AsObject = {
    categoryName: string;
    score: number;
  };
}

export class SubmitRatingRequest extends jspb.Message {
  getChargerVariantId(): string;
  setChargerVariantId(value: string): SubmitRatingRequest;

  getRatingsList(): Array<RatingInput>;
  setRatingsList(value: Array<RatingInput>): SubmitRatingRequest;
  clearRatingsList(): SubmitRatingRequest;
  addRatings(value?: RatingInput, index?: number): RatingInput;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubmitRatingRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SubmitRatingRequest): SubmitRatingRequest.AsObject;
  static serializeBinaryToWriter(message: SubmitRatingRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubmitRatingRequest;
  static deserializeBinaryFromReader(message: SubmitRatingRequest, reader: jspb.BinaryReader): SubmitRatingRequest;
}

export namespace SubmitRatingRequest {
  export type AsObject = {
    chargerVariantId: string;
    ratingsList: Array<RatingInput.AsObject>;
  };
}

export class SubmitRatingResponse extends jspb.Message {
  getChargerVariantId(): string;
  setChargerVariantId(value: string): SubmitRatingResponse;

  getRatingsList(): Array<registry_v1_registry_pb.CategoryRating>;
  setRatingsList(value: Array<registry_v1_registry_pb.CategoryRating>): SubmitRatingResponse;
  clearRatingsList(): SubmitRatingResponse;
  addRatings(value?: registry_v1_registry_pb.CategoryRating, index?: number): registry_v1_registry_pb.CategoryRating;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubmitRatingResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SubmitRatingResponse): SubmitRatingResponse.AsObject;
  static serializeBinaryToWriter(message: SubmitRatingResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubmitRatingResponse;
  static deserializeBinaryFromReader(message: SubmitRatingResponse, reader: jspb.BinaryReader): SubmitRatingResponse;
}

export namespace SubmitRatingResponse {
  export type AsObject = {
    chargerVariantId: string;
    ratingsList: Array<registry_v1_registry_pb.CategoryRating.AsObject>;
  };
}

export class ListMyRatingsRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): ListMyRatingsRequest;

  getPageToken(): string;
  setPageToken(value: string): ListMyRatingsRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListMyRatingsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListMyRatingsRequest): ListMyRatingsRequest.AsObject;
  static serializeBinaryToWriter(message: ListMyRatingsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListMyRatingsRequest;
  static deserializeBinaryFromReader(message: ListMyRatingsRequest, reader: jspb.BinaryReader): ListMyRatingsRequest;
}

export namespace ListMyRatingsRequest {
  export type AsObject = {
    pageSize: number;
    pageToken: string;
  };
}

export class MyRating extends jspb.Message {
  getSummary(): registry_v1_registry_pb.ChargerVariantSummary | undefined;
  setSummary(value?: registry_v1_registry_pb.ChargerVariantSummary): MyRating;
  hasSummary(): boolean;
  clearSummary(): MyRating;

  getMyScoresList(): Array<RatingInput>;
  setMyScoresList(value: Array<RatingInput>): MyRating;
  clearMyScoresList(): MyRating;
  addMyScores(value?: RatingInput, index?: number): RatingInput;

  getAggregateList(): Array<registry_v1_registry_pb.CategoryRating>;
  setAggregateList(value: Array<registry_v1_registry_pb.CategoryRating>): MyRating;
  clearAggregateList(): MyRating;
  addAggregate(value?: registry_v1_registry_pb.CategoryRating, index?: number): registry_v1_registry_pb.CategoryRating;

  getRatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setRatedAt(value?: google_protobuf_timestamp_pb.Timestamp): MyRating;
  hasRatedAt(): boolean;
  clearRatedAt(): MyRating;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MyRating.AsObject;
  static toObject(includeInstance: boolean, msg: MyRating): MyRating.AsObject;
  static serializeBinaryToWriter(message: MyRating, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MyRating;
  static deserializeBinaryFromReader(message: MyRating, reader: jspb.BinaryReader): MyRating;
}

export namespace MyRating {
  export type AsObject = {
    summary?: registry_v1_registry_pb.ChargerVariantSummary.AsObject;
    myScoresList: Array<RatingInput.AsObject>;
    aggregateList: Array<registry_v1_registry_pb.CategoryRating.AsObject>;
    ratedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
  };
}

export class ListMyRatingsResponse extends jspb.Message {
  getRatingsList(): Array<MyRating>;
  setRatingsList(value: Array<MyRating>): ListMyRatingsResponse;
  clearRatingsList(): ListMyRatingsResponse;
  addRatings(value?: MyRating, index?: number): MyRating;

  getTotalSize(): number;
  setTotalSize(value: number): ListMyRatingsResponse;

  getNextPageToken(): string;
  setNextPageToken(value: string): ListMyRatingsResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListMyRatingsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListMyRatingsResponse): ListMyRatingsResponse.AsObject;
  static serializeBinaryToWriter(message: ListMyRatingsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListMyRatingsResponse;
  static deserializeBinaryFromReader(message: ListMyRatingsResponse, reader: jspb.BinaryReader): ListMyRatingsResponse;
}

export namespace ListMyRatingsResponse {
  export type AsObject = {
    ratingsList: Array<MyRating.AsObject>;
    totalSize: number;
    nextPageToken: string;
  };
}

export enum FavoriteState {
  FAVORITE_STATE_UNSPECIFIED = 0,
  FAVORITE_STATE_FAVORITED = 1,
  FAVORITE_STATE_UNFAVORITED = 2,
}
export enum ProjectChargerAction {
  PROJECT_CHARGER_ACTION_UNSPECIFIED = 0,
  PROJECT_CHARGER_ACTION_ADD = 1,
  PROJECT_CHARGER_ACTION_REMOVE = 2,
  PROJECT_CHARGER_ACTION_SET_NOTE = 3,
}
