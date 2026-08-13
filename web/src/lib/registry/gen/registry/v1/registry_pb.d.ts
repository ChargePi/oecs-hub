import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"


export class Contact extends jspb.Message {
  getName(): string;
  setName(value: string): Contact;
  hasName(): boolean;
  clearName(): Contact;

  getEmail(): string;
  setEmail(value: string): Contact;
  hasEmail(): boolean;
  clearEmail(): Contact;

  getPhone(): string;
  setPhone(value: string): Contact;
  hasPhone(): boolean;
  clearPhone(): Contact;

  getWebsite(): string;
  setWebsite(value: string): Contact;
  hasWebsite(): boolean;
  clearWebsite(): Contact;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Contact.AsObject;
  static toObject(includeInstance: boolean, msg: Contact): Contact.AsObject;
  static serializeBinaryToWriter(message: Contact, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Contact;
  static deserializeBinaryFromReader(message: Contact, reader: jspb.BinaryReader): Contact;
}

export namespace Contact {
  export type AsObject = {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
  };

  export enum NameCase {
    _NAME_NOT_SET = 0,
    NAME = 1,
  }

  export enum EmailCase {
    _EMAIL_NOT_SET = 0,
    EMAIL = 2,
  }

  export enum PhoneCase {
    _PHONE_NOT_SET = 0,
    PHONE = 3,
  }

  export enum WebsiteCase {
    _WEBSITE_NOT_SET = 0,
    WEBSITE = 4,
  }
}

export class Manufacturer extends jspb.Message {
  getId(): string;
  setId(value: string): Manufacturer;

  getName(): string;
  setName(value: string): Manufacturer;

  getCountry(): string;
  setCountry(value: string): Manufacturer;
  hasCountry(): boolean;
  clearCountry(): Manufacturer;

  getContact(): Contact | undefined;
  setContact(value?: Contact): Manufacturer;
  hasContact(): boolean;
  clearContact(): Manufacturer;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Manufacturer.AsObject;
  static toObject(includeInstance: boolean, msg: Manufacturer): Manufacturer.AsObject;
  static serializeBinaryToWriter(message: Manufacturer, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Manufacturer;
  static deserializeBinaryFromReader(message: Manufacturer, reader: jspb.BinaryReader): Manufacturer;
}

export namespace Manufacturer {
  export type AsObject = {
    id: string;
    name: string;
    country?: string;
    contact?: Contact.AsObject;
  };

  export enum CountryCase {
    _COUNTRY_NOT_SET = 0,
    COUNTRY = 3,
  }
}

export class ManufacturerSummary extends jspb.Message {
  getManufacturer(): Manufacturer | undefined;
  setManufacturer(value?: Manufacturer): ManufacturerSummary;
  hasManufacturer(): boolean;
  clearManufacturer(): ManufacturerSummary;

  getProductCount(): number;
  setProductCount(value: number): ManufacturerSummary;

  getVariantCount(): number;
  setVariantCount(value: number): ManufacturerSummary;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ManufacturerSummary.AsObject;
  static toObject(includeInstance: boolean, msg: ManufacturerSummary): ManufacturerSummary.AsObject;
  static serializeBinaryToWriter(message: ManufacturerSummary, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ManufacturerSummary;
  static deserializeBinaryFromReader(message: ManufacturerSummary, reader: jspb.BinaryReader): ManufacturerSummary;
}

export namespace ManufacturerSummary {
  export type AsObject = {
    manufacturer?: Manufacturer.AsObject;
    productCount: number;
    variantCount: number;
  };
}

export class ChargerVariantSummary extends jspb.Message {
  getId(): string;
  setId(value: string): ChargerVariantSummary;

  getManufacturerId(): string;
  setManufacturerId(value: string): ChargerVariantSummary;

  getManufacturerName(): string;
  setManufacturerName(value: string): ChargerVariantSummary;

  getSeries(): string;
  setSeries(value: string): ChargerVariantSummary;
  hasSeries(): boolean;
  clearSeries(): ChargerVariantSummary;

  getModelName(): string;
  setModelName(value: string): ChargerVariantSummary;

  getModelStatus(): ModelStatus;
  setModelStatus(value: ModelStatus): ChargerVariantSummary;

  getChargerType(): ChargerType;
  setChargerType(value: ChargerType): ChargerVariantSummary;

  getConnectorTypesList(): Array<ConnectorType>;
  setConnectorTypesList(value: Array<ConnectorType>): ChargerVariantSummary;
  clearConnectorTypesList(): ChargerVariantSummary;
  addConnectorTypes(value: ConnectorType, index?: number): ChargerVariantSummary;

  getMaxPowerKw(): number;
  setMaxPowerKw(value: number): ChargerVariantSummary;
  hasMaxPowerKw(): boolean;
  clearMaxPowerKw(): ChargerVariantSummary;

  getProductImageUrl(): string;
  setProductImageUrl(value: string): ChargerVariantSummary;
  hasProductImageUrl(): boolean;
  clearProductImageUrl(): ChargerVariantSummary;

  getStatus(): SubmissionStatus;
  setStatus(value: SubmissionStatus): ChargerVariantSummary;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChargerVariantSummary.AsObject;
  static toObject(includeInstance: boolean, msg: ChargerVariantSummary): ChargerVariantSummary.AsObject;
  static serializeBinaryToWriter(message: ChargerVariantSummary, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChargerVariantSummary;
  static deserializeBinaryFromReader(message: ChargerVariantSummary, reader: jspb.BinaryReader): ChargerVariantSummary;
}

export namespace ChargerVariantSummary {
  export type AsObject = {
    id: string;
    manufacturerId: string;
    manufacturerName: string;
    series?: string;
    modelName: string;
    modelStatus: ModelStatus;
    chargerType: ChargerType;
    connectorTypesList: Array<ConnectorType>;
    maxPowerKw?: number;
    productImageUrl?: string;
    status: SubmissionStatus;
  };

  export enum SeriesCase {
    _SERIES_NOT_SET = 0,
    SERIES = 4,
  }

  export enum MaxPowerKwCase {
    _MAX_POWER_KW_NOT_SET = 0,
    MAX_POWER_KW = 9,
  }

  export enum ProductImageUrlCase {
    _PRODUCT_IMAGE_URL_NOT_SET = 0,
    PRODUCT_IMAGE_URL = 10,
  }
}

export class ChargerVariant extends jspb.Message {
  getSummary(): ChargerVariantSummary | undefined;
  setSummary(value?: ChargerVariantSummary): ChargerVariant;
  hasSummary(): boolean;
  clearSummary(): ChargerVariant;

  getSpec(): Uint8Array | string;
  getSpec_asU8(): Uint8Array;
  getSpec_asB64(): string;
  setSpec(value: Uint8Array | string): ChargerVariant;

  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): ChargerVariant;
  hasCreatedAt(): boolean;
  clearCreatedAt(): ChargerVariant;

  getUpdatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdatedAt(value?: google_protobuf_timestamp_pb.Timestamp): ChargerVariant;
  hasUpdatedAt(): boolean;
  clearUpdatedAt(): ChargerVariant;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChargerVariant.AsObject;
  static toObject(includeInstance: boolean, msg: ChargerVariant): ChargerVariant.AsObject;
  static serializeBinaryToWriter(message: ChargerVariant, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChargerVariant;
  static deserializeBinaryFromReader(message: ChargerVariant, reader: jspb.BinaryReader): ChargerVariant;
}

export namespace ChargerVariant {
  export type AsObject = {
    summary?: ChargerVariantSummary.AsObject;
    spec: Uint8Array | string;
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    updatedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
  };
}

export class Product extends jspb.Message {
  getId(): string;
  setId(value: string): Product;

  getManufacturerId(): string;
  setManufacturerId(value: string): Product;

  getSeries(): string;
  setSeries(value: string): Product;

  getVariantsList(): Array<ChargerVariantSummary>;
  setVariantsList(value: Array<ChargerVariantSummary>): Product;
  clearVariantsList(): Product;
  addVariants(value?: ChargerVariantSummary, index?: number): ChargerVariantSummary;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Product.AsObject;
  static toObject(includeInstance: boolean, msg: Product): Product.AsObject;
  static serializeBinaryToWriter(message: Product, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Product;
  static deserializeBinaryFromReader(message: Product, reader: jspb.BinaryReader): Product;
}

export namespace Product {
  export type AsObject = {
    id: string;
    manufacturerId: string;
    series: string;
    variantsList: Array<ChargerVariantSummary.AsObject>;
  };
}

export class SearchChargersRequest extends jspb.Message {
  getQuery(): string;
  setQuery(value: string): SearchChargersRequest;
  hasQuery(): boolean;
  clearQuery(): SearchChargersRequest;

  getManufacturerId(): string;
  setManufacturerId(value: string): SearchChargersRequest;
  hasManufacturerId(): boolean;
  clearManufacturerId(): SearchChargersRequest;

  getChargerType(): ChargerType;
  setChargerType(value: ChargerType): SearchChargersRequest;

  getConnectorTypesList(): Array<ConnectorType>;
  setConnectorTypesList(value: Array<ConnectorType>): SearchChargersRequest;
  clearConnectorTypesList(): SearchChargersRequest;
  addConnectorTypes(value: ConnectorType, index?: number): SearchChargersRequest;

  getMinPowerKw(): number;
  setMinPowerKw(value: number): SearchChargersRequest;
  hasMinPowerKw(): boolean;
  clearMinPowerKw(): SearchChargersRequest;

  getMaxPowerKw(): number;
  setMaxPowerKw(value: number): SearchChargersRequest;
  hasMaxPowerKw(): boolean;
  clearMaxPowerKw(): SearchChargersRequest;

  getCountry(): string;
  setCountry(value: string): SearchChargersRequest;
  hasCountry(): boolean;
  clearCountry(): SearchChargersRequest;

  getProtocolsList(): Array<string>;
  setProtocolsList(value: Array<string>): SearchChargersRequest;
  clearProtocolsList(): SearchChargersRequest;
  addProtocols(value: string, index?: number): SearchChargersRequest;

  getPageSize(): number;
  setPageSize(value: number): SearchChargersRequest;

  getPageToken(): string;
  setPageToken(value: string): SearchChargersRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SearchChargersRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SearchChargersRequest): SearchChargersRequest.AsObject;
  static serializeBinaryToWriter(message: SearchChargersRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SearchChargersRequest;
  static deserializeBinaryFromReader(message: SearchChargersRequest, reader: jspb.BinaryReader): SearchChargersRequest;
}

export namespace SearchChargersRequest {
  export type AsObject = {
    query?: string;
    manufacturerId?: string;
    chargerType: ChargerType;
    connectorTypesList: Array<ConnectorType>;
    minPowerKw?: number;
    maxPowerKw?: number;
    country?: string;
    protocolsList: Array<string>;
    pageSize: number;
    pageToken: string;
  };

  export enum QueryCase {
    _QUERY_NOT_SET = 0,
    QUERY = 1,
  }

  export enum ManufacturerIdCase {
    _MANUFACTURER_ID_NOT_SET = 0,
    MANUFACTURER_ID = 2,
  }

  export enum MinPowerKwCase {
    _MIN_POWER_KW_NOT_SET = 0,
    MIN_POWER_KW = 5,
  }

  export enum MaxPowerKwCase {
    _MAX_POWER_KW_NOT_SET = 0,
    MAX_POWER_KW = 6,
  }

  export enum CountryCase {
    _COUNTRY_NOT_SET = 0,
    COUNTRY = 7,
  }
}

export class SearchChargersResponse extends jspb.Message {
  getVariantsList(): Array<ChargerVariantSummary>;
  setVariantsList(value: Array<ChargerVariantSummary>): SearchChargersResponse;
  clearVariantsList(): SearchChargersResponse;
  addVariants(value?: ChargerVariantSummary, index?: number): ChargerVariantSummary;

  getTotalSize(): number;
  setTotalSize(value: number): SearchChargersResponse;

  getNextPageToken(): string;
  setNextPageToken(value: string): SearchChargersResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SearchChargersResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SearchChargersResponse): SearchChargersResponse.AsObject;
  static serializeBinaryToWriter(message: SearchChargersResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SearchChargersResponse;
  static deserializeBinaryFromReader(message: SearchChargersResponse, reader: jspb.BinaryReader): SearchChargersResponse;
}

export namespace SearchChargersResponse {
  export type AsObject = {
    variantsList: Array<ChargerVariantSummary.AsObject>;
    totalSize: number;
    nextPageToken: string;
  };
}

export class GetManufacturersRequest extends jspb.Message {
  getQuery(): string;
  setQuery(value: string): GetManufacturersRequest;
  hasQuery(): boolean;
  clearQuery(): GetManufacturersRequest;

  getCountry(): string;
  setCountry(value: string): GetManufacturersRequest;
  hasCountry(): boolean;
  clearCountry(): GetManufacturersRequest;

  getPageSize(): number;
  setPageSize(value: number): GetManufacturersRequest;

  getPageToken(): string;
  setPageToken(value: string): GetManufacturersRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetManufacturersRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetManufacturersRequest): GetManufacturersRequest.AsObject;
  static serializeBinaryToWriter(message: GetManufacturersRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetManufacturersRequest;
  static deserializeBinaryFromReader(message: GetManufacturersRequest, reader: jspb.BinaryReader): GetManufacturersRequest;
}

export namespace GetManufacturersRequest {
  export type AsObject = {
    query?: string;
    country?: string;
    pageSize: number;
    pageToken: string;
  };

  export enum QueryCase {
    _QUERY_NOT_SET = 0,
    QUERY = 1,
  }

  export enum CountryCase {
    _COUNTRY_NOT_SET = 0,
    COUNTRY = 2,
  }
}

export class GetManufacturersResponse extends jspb.Message {
  getManufacturersList(): Array<ManufacturerSummary>;
  setManufacturersList(value: Array<ManufacturerSummary>): GetManufacturersResponse;
  clearManufacturersList(): GetManufacturersResponse;
  addManufacturers(value?: ManufacturerSummary, index?: number): ManufacturerSummary;

  getTotalSize(): number;
  setTotalSize(value: number): GetManufacturersResponse;

  getNextPageToken(): string;
  setNextPageToken(value: string): GetManufacturersResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetManufacturersResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetManufacturersResponse): GetManufacturersResponse.AsObject;
  static serializeBinaryToWriter(message: GetManufacturersResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetManufacturersResponse;
  static deserializeBinaryFromReader(message: GetManufacturersResponse, reader: jspb.BinaryReader): GetManufacturersResponse;
}

export namespace GetManufacturersResponse {
  export type AsObject = {
    manufacturersList: Array<ManufacturerSummary.AsObject>;
    totalSize: number;
    nextPageToken: string;
  };
}

export class GetChargerRequest extends jspb.Message {
  getId(): string;
  setId(value: string): GetChargerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetChargerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetChargerRequest): GetChargerRequest.AsObject;
  static serializeBinaryToWriter(message: GetChargerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetChargerRequest;
  static deserializeBinaryFromReader(message: GetChargerRequest, reader: jspb.BinaryReader): GetChargerRequest;
}

export namespace GetChargerRequest {
  export type AsObject = {
    id: string;
  };
}

export class GetChargerResponse extends jspb.Message {
  getVariant(): ChargerVariant | undefined;
  setVariant(value?: ChargerVariant): GetChargerResponse;
  hasVariant(): boolean;
  clearVariant(): GetChargerResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetChargerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetChargerResponse): GetChargerResponse.AsObject;
  static serializeBinaryToWriter(message: GetChargerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetChargerResponse;
  static deserializeBinaryFromReader(message: GetChargerResponse, reader: jspb.BinaryReader): GetChargerResponse;
}

export namespace GetChargerResponse {
  export type AsObject = {
    variant?: ChargerVariant.AsObject;
  };
}

export class GetManufacturerRequest extends jspb.Message {
  getId(): string;
  setId(value: string): GetManufacturerRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetManufacturerRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetManufacturerRequest): GetManufacturerRequest.AsObject;
  static serializeBinaryToWriter(message: GetManufacturerRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetManufacturerRequest;
  static deserializeBinaryFromReader(message: GetManufacturerRequest, reader: jspb.BinaryReader): GetManufacturerRequest;
}

export namespace GetManufacturerRequest {
  export type AsObject = {
    id: string;
  };
}

export class GetManufacturerResponse extends jspb.Message {
  getManufacturer(): Manufacturer | undefined;
  setManufacturer(value?: Manufacturer): GetManufacturerResponse;
  hasManufacturer(): boolean;
  clearManufacturer(): GetManufacturerResponse;

  getProductsList(): Array<Product>;
  setProductsList(value: Array<Product>): GetManufacturerResponse;
  clearProductsList(): GetManufacturerResponse;
  addProducts(value?: Product, index?: number): Product;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetManufacturerResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetManufacturerResponse): GetManufacturerResponse.AsObject;
  static serializeBinaryToWriter(message: GetManufacturerResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetManufacturerResponse;
  static deserializeBinaryFromReader(message: GetManufacturerResponse, reader: jspb.BinaryReader): GetManufacturerResponse;
}

export namespace GetManufacturerResponse {
  export type AsObject = {
    manufacturer?: Manufacturer.AsObject;
    productsList: Array<Product.AsObject>;
  };
}

export class SubmitChargerSpecRequest extends jspb.Message {
  getSpec(): Uint8Array | string;
  getSpec_asU8(): Uint8Array;
  getSpec_asB64(): string;
  setSpec(value: Uint8Array | string): SubmitChargerSpecRequest;

  getSubmittedBy(): string;
  setSubmittedBy(value: string): SubmitChargerSpecRequest;
  hasSubmittedBy(): boolean;
  clearSubmittedBy(): SubmitChargerSpecRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubmitChargerSpecRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SubmitChargerSpecRequest): SubmitChargerSpecRequest.AsObject;
  static serializeBinaryToWriter(message: SubmitChargerSpecRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubmitChargerSpecRequest;
  static deserializeBinaryFromReader(message: SubmitChargerSpecRequest, reader: jspb.BinaryReader): SubmitChargerSpecRequest;
}

export namespace SubmitChargerSpecRequest {
  export type AsObject = {
    spec: Uint8Array | string;
    submittedBy?: string;
  };

  export enum SubmittedByCase {
    _SUBMITTED_BY_NOT_SET = 0,
    SUBMITTED_BY = 2,
  }
}

export class SubmitChargerSpecResponse extends jspb.Message {
  getId(): string;
  setId(value: string): SubmitChargerSpecResponse;

  getStatus(): SubmissionStatus;
  setStatus(value: SubmissionStatus): SubmitChargerSpecResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubmitChargerSpecResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SubmitChargerSpecResponse): SubmitChargerSpecResponse.AsObject;
  static serializeBinaryToWriter(message: SubmitChargerSpecResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubmitChargerSpecResponse;
  static deserializeBinaryFromReader(message: SubmitChargerSpecResponse, reader: jspb.BinaryReader): SubmitChargerSpecResponse;
}

export namespace SubmitChargerSpecResponse {
  export type AsObject = {
    id: string;
    status: SubmissionStatus;
  };
}

export enum ChargerType {
  CHARGER_TYPE_UNSPECIFIED = 0,
  CHARGER_TYPE_AC = 1,
  CHARGER_TYPE_DC = 2,
  CHARGER_TYPE_PORTABLE_EVSE = 3,
  CHARGER_TYPE_WIRELESS = 4,
}
export enum ModelStatus {
  MODEL_STATUS_UNSPECIFIED = 0,
  MODEL_STATUS_PRE_RELEASE = 1,
  MODEL_STATUS_ACTIVE = 2,
  MODEL_STATUS_DISCONTINUED = 3,
  MODEL_STATUS_END_OF_LIFE = 4,
}
export enum ConnectorType {
  CONNECTOR_TYPE_UNSPECIFIED = 0,
  CONNECTOR_TYPE_TYPE1_J1772 = 1,
  CONNECTOR_TYPE_TYPE2_MENNEKES = 2,
  CONNECTOR_TYPE_TYPE3A = 3,
  CONNECTOR_TYPE_CCS1_COMBO1 = 4,
  CONNECTOR_TYPE_CCS2_COMBO2 = 5,
  CONNECTOR_TYPE_CHADEMO = 6,
  CONNECTOR_TYPE_GBT_AC = 7,
  CONNECTOR_TYPE_GBT_DC = 8,
  CONNECTOR_TYPE_NACS_TESLA = 9,
  CONNECTOR_TYPE_DOMESTIC_SOCKET = 10,
  CONNECTOR_TYPE_INDUSTRIAL_IEC60309 = 11,
  CONNECTOR_TYPE_MCS_MEGAWATT_CHARGING_SYSTEM = 12,
  CONNECTOR_TYPE_OTHER = 13,
}
export enum SubmissionStatus {
  SUBMISSION_STATUS_UNSPECIFIED = 0,
  SUBMISSION_STATUS_SUBMITTED = 1,
  SUBMISSION_STATUS_VERIFIED = 2,
  SUBMISSION_STATUS_REJECTED = 3,
}
