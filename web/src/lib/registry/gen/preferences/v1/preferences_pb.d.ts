import * as jspb from 'google-protobuf'

import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb'; // proto import: "google/protobuf/empty.proto"


export class Preferences extends jspb.Message {
  getCurrency(): string;
  setCurrency(value: string): Preferences;

  getUnitSystem(): UnitSystem;
  setUnitSystem(value: UnitSystem): Preferences;

  getViewMode(): ViewMode;
  setViewMode(value: ViewMode): Preferences;

  getChatLayout(): ChatLayout;
  setChatLayout(value: ChatLayout): Preferences;

  getLanguage(): string;
  setLanguage(value: string): Preferences;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Preferences.AsObject;
  static toObject(includeInstance: boolean, msg: Preferences): Preferences.AsObject;
  static serializeBinaryToWriter(message: Preferences, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Preferences;
  static deserializeBinaryFromReader(message: Preferences, reader: jspb.BinaryReader): Preferences;
}

export namespace Preferences {
  export type AsObject = {
    currency: string;
    unitSystem: UnitSystem;
    viewMode: ViewMode;
    chatLayout: ChatLayout;
    language: string;
  };
}

export class GetPreferencesResponse extends jspb.Message {
  getPreferences(): Preferences | undefined;
  setPreferences(value?: Preferences): GetPreferencesResponse;
  hasPreferences(): boolean;
  clearPreferences(): GetPreferencesResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPreferencesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetPreferencesResponse): GetPreferencesResponse.AsObject;
  static serializeBinaryToWriter(message: GetPreferencesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPreferencesResponse;
  static deserializeBinaryFromReader(message: GetPreferencesResponse, reader: jspb.BinaryReader): GetPreferencesResponse;
}

export namespace GetPreferencesResponse {
  export type AsObject = {
    preferences?: Preferences.AsObject;
  };
}

export class UpdatePreferencesRequest extends jspb.Message {
  getPreferences(): Preferences | undefined;
  setPreferences(value?: Preferences): UpdatePreferencesRequest;
  hasPreferences(): boolean;
  clearPreferences(): UpdatePreferencesRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdatePreferencesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdatePreferencesRequest): UpdatePreferencesRequest.AsObject;
  static serializeBinaryToWriter(message: UpdatePreferencesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdatePreferencesRequest;
  static deserializeBinaryFromReader(message: UpdatePreferencesRequest, reader: jspb.BinaryReader): UpdatePreferencesRequest;
}

export namespace UpdatePreferencesRequest {
  export type AsObject = {
    preferences?: Preferences.AsObject;
  };
}

export class UpdatePreferencesResponse extends jspb.Message {
  getPreferences(): Preferences | undefined;
  setPreferences(value?: Preferences): UpdatePreferencesResponse;
  hasPreferences(): boolean;
  clearPreferences(): UpdatePreferencesResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdatePreferencesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdatePreferencesResponse): UpdatePreferencesResponse.AsObject;
  static serializeBinaryToWriter(message: UpdatePreferencesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdatePreferencesResponse;
  static deserializeBinaryFromReader(message: UpdatePreferencesResponse, reader: jspb.BinaryReader): UpdatePreferencesResponse;
}

export namespace UpdatePreferencesResponse {
  export type AsObject = {
    preferences?: Preferences.AsObject;
  };
}

export enum UnitSystem {
  UNIT_SYSTEM_UNSPECIFIED = 0,
  UNIT_SYSTEM_METRIC = 1,
  UNIT_SYSTEM_IMPERIAL = 2,
}
export enum ViewMode {
  VIEW_MODE_UNSPECIFIED = 0,
  VIEW_MODE_SIMPLIFIED = 1,
  VIEW_MODE_ADVANCED = 2,
}
export enum ChatLayout {
  CHAT_LAYOUT_UNSPECIFIED = 0,
  CHAT_LAYOUT_DRAWER = 1,
  CHAT_LAYOUT_PAGE = 2,
}
