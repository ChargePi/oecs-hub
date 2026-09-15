import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"
import * as registry_v1_registry_pb from '../../registry/v1/registry_pb'; // proto import: "registry/v1/registry.proto"


export class ManufacturerChargerSummary extends jspb.Message {
  getSummary(): registry_v1_registry_pb.ChargerVariantSummary | undefined;
  setSummary(value?: registry_v1_registry_pb.ChargerVariantSummary): ManufacturerChargerSummary;
  hasSummary(): boolean;
  clearSummary(): ManufacturerChargerSummary;

  getSubmittedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setSubmittedAt(value?: google_protobuf_timestamp_pb.Timestamp): ManufacturerChargerSummary;
  hasSubmittedAt(): boolean;
  clearSubmittedAt(): ManufacturerChargerSummary;

  getReviewedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setReviewedAt(value?: google_protobuf_timestamp_pb.Timestamp): ManufacturerChargerSummary;
  hasReviewedAt(): boolean;
  clearReviewedAt(): ManufacturerChargerSummary;

  getSpec(): Uint8Array | string;
  getSpec_asU8(): Uint8Array;
  getSpec_asB64(): string;
  setSpec(value: Uint8Array | string): ManufacturerChargerSummary;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ManufacturerChargerSummary.AsObject;
  static toObject(includeInstance: boolean, msg: ManufacturerChargerSummary): ManufacturerChargerSummary.AsObject;
  static serializeBinaryToWriter(message: ManufacturerChargerSummary, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ManufacturerChargerSummary;
  static deserializeBinaryFromReader(message: ManufacturerChargerSummary, reader: jspb.BinaryReader): ManufacturerChargerSummary;
}

export namespace ManufacturerChargerSummary {
  export type AsObject = {
    summary?: registry_v1_registry_pb.ChargerVariantSummary.AsObject;
    submittedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    reviewedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    spec: Uint8Array | string;
  };

  export enum ReviewedAtCase {
    _REVIEWED_AT_NOT_SET = 0,
    REVIEWED_AT = 3,
  }
}

export class GetManufacturerChargersRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): GetManufacturerChargersRequest;

  getPageToken(): string;
  setPageToken(value: string): GetManufacturerChargersRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetManufacturerChargersRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetManufacturerChargersRequest): GetManufacturerChargersRequest.AsObject;
  static serializeBinaryToWriter(message: GetManufacturerChargersRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetManufacturerChargersRequest;
  static deserializeBinaryFromReader(message: GetManufacturerChargersRequest, reader: jspb.BinaryReader): GetManufacturerChargersRequest;
}

export namespace GetManufacturerChargersRequest {
  export type AsObject = {
    pageSize: number;
    pageToken: string;
  };
}

export class GetManufacturerChargersResponse extends jspb.Message {
  getChargersList(): Array<ManufacturerChargerSummary>;
  setChargersList(value: Array<ManufacturerChargerSummary>): GetManufacturerChargersResponse;
  clearChargersList(): GetManufacturerChargersResponse;
  addChargers(value?: ManufacturerChargerSummary, index?: number): ManufacturerChargerSummary;

  getTotalSize(): number;
  setTotalSize(value: number): GetManufacturerChargersResponse;

  getNextPageToken(): string;
  setNextPageToken(value: string): GetManufacturerChargersResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetManufacturerChargersResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetManufacturerChargersResponse): GetManufacturerChargersResponse.AsObject;
  static serializeBinaryToWriter(message: GetManufacturerChargersResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetManufacturerChargersResponse;
  static deserializeBinaryFromReader(message: GetManufacturerChargersResponse, reader: jspb.BinaryReader): GetManufacturerChargersResponse;
}

export namespace GetManufacturerChargersResponse {
  export type AsObject = {
    chargersList: Array<ManufacturerChargerSummary.AsObject>;
    totalSize: number;
    nextPageToken: string;
  };
}

export class CancelSubmissionRequest extends jspb.Message {
  getId(): string;
  setId(value: string): CancelSubmissionRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CancelSubmissionRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CancelSubmissionRequest): CancelSubmissionRequest.AsObject;
  static serializeBinaryToWriter(message: CancelSubmissionRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CancelSubmissionRequest;
  static deserializeBinaryFromReader(message: CancelSubmissionRequest, reader: jspb.BinaryReader): CancelSubmissionRequest;
}

export namespace CancelSubmissionRequest {
  export type AsObject = {
    id: string;
  };
}

export class CancelSubmissionResponse extends jspb.Message {
  getCharger(): ManufacturerChargerSummary | undefined;
  setCharger(value?: ManufacturerChargerSummary): CancelSubmissionResponse;
  hasCharger(): boolean;
  clearCharger(): CancelSubmissionResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CancelSubmissionResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CancelSubmissionResponse): CancelSubmissionResponse.AsObject;
  static serializeBinaryToWriter(message: CancelSubmissionResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CancelSubmissionResponse;
  static deserializeBinaryFromReader(message: CancelSubmissionResponse, reader: jspb.BinaryReader): CancelSubmissionResponse;
}

export namespace CancelSubmissionResponse {
  export type AsObject = {
    charger?: ManufacturerChargerSummary.AsObject;
  };
}

export class EditSpecificationRequest extends jspb.Message {
  getId(): string;
  setId(value: string): EditSpecificationRequest;

  getSpec(): Uint8Array | string;
  getSpec_asU8(): Uint8Array;
  getSpec_asB64(): string;
  setSpec(value: Uint8Array | string): EditSpecificationRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditSpecificationRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EditSpecificationRequest): EditSpecificationRequest.AsObject;
  static serializeBinaryToWriter(message: EditSpecificationRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditSpecificationRequest;
  static deserializeBinaryFromReader(message: EditSpecificationRequest, reader: jspb.BinaryReader): EditSpecificationRequest;
}

export namespace EditSpecificationRequest {
  export type AsObject = {
    id: string;
    spec: Uint8Array | string;
  };
}

export class EditSpecificationResponse extends jspb.Message {
  getVariant(): registry_v1_registry_pb.ChargerVariant | undefined;
  setVariant(value?: registry_v1_registry_pb.ChargerVariant): EditSpecificationResponse;
  hasVariant(): boolean;
  clearVariant(): EditSpecificationResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditSpecificationResponse.AsObject;
  static toObject(includeInstance: boolean, msg: EditSpecificationResponse): EditSpecificationResponse.AsObject;
  static serializeBinaryToWriter(message: EditSpecificationResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditSpecificationResponse;
  static deserializeBinaryFromReader(message: EditSpecificationResponse, reader: jspb.BinaryReader): EditSpecificationResponse;
}

export namespace EditSpecificationResponse {
  export type AsObject = {
    variant?: registry_v1_registry_pb.ChargerVariant.AsObject;
  };
}

