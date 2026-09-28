import * as jspb from 'google-protobuf'



export class GetIdentityRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetIdentityRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetIdentityRequest): GetIdentityRequest.AsObject;
  static serializeBinaryToWriter(message: GetIdentityRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetIdentityRequest;
  static deserializeBinaryFromReader(message: GetIdentityRequest, reader: jspb.BinaryReader): GetIdentityRequest;
}

export namespace GetIdentityRequest {
  export type AsObject = {
  };
}

export class GetIdentityResponse extends jspb.Message {
  getIdentifier(): string;
  setIdentifier(value: string): GetIdentityResponse;

  getIdentifierHash(): string;
  setIdentifierHash(value: string): GetIdentityResponse;

  getPlanTier(): string;
  setPlanTier(value: string): GetIdentityResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetIdentityResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetIdentityResponse): GetIdentityResponse.AsObject;
  static serializeBinaryToWriter(message: GetIdentityResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetIdentityResponse;
  static deserializeBinaryFromReader(message: GetIdentityResponse, reader: jspb.BinaryReader): GetIdentityResponse;
}

export namespace GetIdentityResponse {
  export type AsObject = {
    identifier: string;
    identifierHash: string;
    planTier: string;
  };
}

