import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb'; // proto import: "google/protobuf/timestamp.proto"


export class GetPlansRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPlansRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPlansRequest): GetPlansRequest.AsObject;
  static serializeBinaryToWriter(message: GetPlansRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPlansRequest;
  static deserializeBinaryFromReader(message: GetPlansRequest, reader: jspb.BinaryReader): GetPlansRequest;
}

export namespace GetPlansRequest {
  export type AsObject = {
  };
}

export class Plan extends jspb.Message {
  getCode(): string;
  setCode(value: string): Plan;

  getDisplayName(): string;
  setDisplayName(value: string): Plan;

  getAmountCents(): number;
  setAmountCents(value: number): Plan;

  getCurrency(): string;
  setCurrency(value: string): Plan;

  getInterval(): string;
  setInterval(value: string): Plan;

  getAccountType(): AccountType;
  setAccountType(value: AccountType): Plan;

  getTier(): PlanTier;
  setTier(value: PlanTier): Plan;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Plan.AsObject;
  static toObject(includeInstance: boolean, msg: Plan): Plan.AsObject;
  static serializeBinaryToWriter(message: Plan, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Plan;
  static deserializeBinaryFromReader(message: Plan, reader: jspb.BinaryReader): Plan;
}

export namespace Plan {
  export type AsObject = {
    code: string;
    displayName: string;
    amountCents: number;
    currency: string;
    interval: string;
    accountType: AccountType;
    tier: PlanTier;
  };
}

export class GetPlansResponse extends jspb.Message {
  getPlansList(): Array<Plan>;
  setPlansList(value: Array<Plan>): GetPlansResponse;
  clearPlansList(): GetPlansResponse;
  addPlans(value?: Plan, index?: number): Plan;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPlansResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetPlansResponse): GetPlansResponse.AsObject;
  static serializeBinaryToWriter(message: GetPlansResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPlansResponse;
  static deserializeBinaryFromReader(message: GetPlansResponse, reader: jspb.BinaryReader): GetPlansResponse;
}

export namespace GetPlansResponse {
  export type AsObject = {
    plansList: Array<Plan.AsObject>;
  };
}

export class GetUsageRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetUsageRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetUsageRequest): GetUsageRequest.AsObject;
  static serializeBinaryToWriter(message: GetUsageRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetUsageRequest;
  static deserializeBinaryFromReader(message: GetUsageRequest, reader: jspb.BinaryReader): GetUsageRequest;
}

export namespace GetUsageRequest {
  export type AsObject = {
  };
}

export class UsageMetric extends jspb.Message {
  getCode(): string;
  setCode(value: string): UsageMetric;

  getName(): string;
  setName(value: string): UsageMetric;

  getUnits(): string;
  setUnits(value: string): UsageMetric;

  getConsumedUnits(): number;
  setConsumedUnits(value: number): UsageMetric;

  getIncludedUnits(): number;
  setIncludedUnits(value: number): UsageMetric;
  hasIncludedUnits(): boolean;
  clearIncludedUnits(): UsageMetric;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UsageMetric.AsObject;
  static toObject(includeInstance: boolean, msg: UsageMetric): UsageMetric.AsObject;
  static serializeBinaryToWriter(message: UsageMetric, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UsageMetric;
  static deserializeBinaryFromReader(message: UsageMetric, reader: jspb.BinaryReader): UsageMetric;
}

export namespace UsageMetric {
  export type AsObject = {
    code: string;
    name: string;
    units: string;
    consumedUnits: number;
    includedUnits?: number;
  };

  export enum IncludedUnitsCase {
    _INCLUDED_UNITS_NOT_SET = 0,
    INCLUDED_UNITS = 5,
  }
}

export class GetUsageResponse extends jspb.Message {
  getPlanName(): string;
  setPlanName(value: string): GetUsageResponse;

  getMetricsList(): Array<UsageMetric>;
  setMetricsList(value: Array<UsageMetric>): GetUsageResponse;
  clearMetricsList(): GetUsageResponse;
  addMetrics(value?: UsageMetric, index?: number): UsageMetric;

  getPeriodStart(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPeriodStart(value?: google_protobuf_timestamp_pb.Timestamp): GetUsageResponse;
  hasPeriodStart(): boolean;
  clearPeriodStart(): GetUsageResponse;

  getPeriodEnd(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPeriodEnd(value?: google_protobuf_timestamp_pb.Timestamp): GetUsageResponse;
  hasPeriodEnd(): boolean;
  clearPeriodEnd(): GetUsageResponse;

  getTier(): PlanTier;
  setTier(value: PlanTier): GetUsageResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetUsageResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetUsageResponse): GetUsageResponse.AsObject;
  static serializeBinaryToWriter(message: GetUsageResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetUsageResponse;
  static deserializeBinaryFromReader(message: GetUsageResponse, reader: jspb.BinaryReader): GetUsageResponse;
}

export namespace GetUsageResponse {
  export type AsObject = {
    planName: string;
    metricsList: Array<UsageMetric.AsObject>;
    periodStart?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    periodEnd?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    tier: PlanTier;
  };
}

export class ListInvoicesRequest extends jspb.Message {
  getPageSize(): number;
  setPageSize(value: number): ListInvoicesRequest;

  getPageToken(): string;
  setPageToken(value: string): ListInvoicesRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListInvoicesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListInvoicesRequest): ListInvoicesRequest.AsObject;
  static serializeBinaryToWriter(message: ListInvoicesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListInvoicesRequest;
  static deserializeBinaryFromReader(message: ListInvoicesRequest, reader: jspb.BinaryReader): ListInvoicesRequest;
}

export namespace ListInvoicesRequest {
  export type AsObject = {
    pageSize: number;
    pageToken: string;
  };
}

export class Invoice extends jspb.Message {
  getId(): string;
  setId(value: string): Invoice;

  getNumber(): string;
  setNumber(value: string): Invoice;

  getStatus(): string;
  setStatus(value: string): Invoice;

  getAmountCents(): number;
  setAmountCents(value: number): Invoice;

  getCurrency(): string;
  setCurrency(value: string): Invoice;

  getIssuedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setIssuedAt(value?: google_protobuf_timestamp_pb.Timestamp): Invoice;
  hasIssuedAt(): boolean;
  clearIssuedAt(): Invoice;

  getPdfUrl(): string;
  setPdfUrl(value: string): Invoice;
  hasPdfUrl(): boolean;
  clearPdfUrl(): Invoice;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Invoice.AsObject;
  static toObject(includeInstance: boolean, msg: Invoice): Invoice.AsObject;
  static serializeBinaryToWriter(message: Invoice, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Invoice;
  static deserializeBinaryFromReader(message: Invoice, reader: jspb.BinaryReader): Invoice;
}

export namespace Invoice {
  export type AsObject = {
    id: string;
    number: string;
    status: string;
    amountCents: number;
    currency: string;
    issuedAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    pdfUrl?: string;
  };

  export enum PdfUrlCase {
    _PDF_URL_NOT_SET = 0,
    PDF_URL = 7,
  }
}

export class ListInvoicesResponse extends jspb.Message {
  getInvoicesList(): Array<Invoice>;
  setInvoicesList(value: Array<Invoice>): ListInvoicesResponse;
  clearInvoicesList(): ListInvoicesResponse;
  addInvoices(value?: Invoice, index?: number): Invoice;

  getNextPageToken(): string;
  setNextPageToken(value: string): ListInvoicesResponse;

  getTotalSize(): number;
  setTotalSize(value: number): ListInvoicesResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListInvoicesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListInvoicesResponse): ListInvoicesResponse.AsObject;
  static serializeBinaryToWriter(message: ListInvoicesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListInvoicesResponse;
  static deserializeBinaryFromReader(message: ListInvoicesResponse, reader: jspb.BinaryReader): ListInvoicesResponse;
}

export namespace ListInvoicesResponse {
  export type AsObject = {
    invoicesList: Array<Invoice.AsObject>;
    nextPageToken: string;
    totalSize: number;
  };
}

export class GetPaymentPortalUrlRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPaymentPortalUrlRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetPaymentPortalUrlRequest): GetPaymentPortalUrlRequest.AsObject;
  static serializeBinaryToWriter(message: GetPaymentPortalUrlRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPaymentPortalUrlRequest;
  static deserializeBinaryFromReader(message: GetPaymentPortalUrlRequest, reader: jspb.BinaryReader): GetPaymentPortalUrlRequest;
}

export namespace GetPaymentPortalUrlRequest {
  export type AsObject = {
  };
}

export class GetPaymentPortalUrlResponse extends jspb.Message {
  getUrl(): string;
  setUrl(value: string): GetPaymentPortalUrlResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetPaymentPortalUrlResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetPaymentPortalUrlResponse): GetPaymentPortalUrlResponse.AsObject;
  static serializeBinaryToWriter(message: GetPaymentPortalUrlResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetPaymentPortalUrlResponse;
  static deserializeBinaryFromReader(message: GetPaymentPortalUrlResponse, reader: jspb.BinaryReader): GetPaymentPortalUrlResponse;
}

export namespace GetPaymentPortalUrlResponse {
  export type AsObject = {
    url: string;
  };
}

export enum AccountType {
  ACCOUNT_TYPE_UNSPECIFIED = 0,
  ACCOUNT_TYPE_INDIVIDUAL = 1,
  ACCOUNT_TYPE_MANUFACTURER = 2,
}
export enum PlanTier {
  PLAN_TIER_UNSPECIFIED = 0,
  PLAN_TIER_FREE = 1,
  PLAN_TIER_PAID = 2,
}
