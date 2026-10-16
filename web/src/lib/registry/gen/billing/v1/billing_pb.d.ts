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

  getIncludedUnits(): number;
  setIncludedUnits(value: number): Plan;
  hasIncludedUnits(): boolean;
  clearIncludedUnits(): Plan;

  getKind(): PlanKind;
  setKind(value: PlanKind): Plan;

  getAddonKey(): string;
  setAddonKey(value: string): Plan;

  getRequiresTier(): PlanTier;
  setRequiresTier(value: PlanTier): Plan;

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
    includedUnits?: number;
    kind: PlanKind;
    addonKey: string;
    requiresTier: PlanTier;
  };

  export enum IncludedUnitsCase {
    _INCLUDED_UNITS_NOT_SET = 0,
    INCLUDED_UNITS = 8,
  }
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

  getPlanCode(): string;
  setPlanCode(value: string): GetUsageResponse;

  getNextPlanCode(): string;
  setNextPlanCode(value: string): GetUsageResponse;
  hasNextPlanCode(): boolean;
  clearNextPlanCode(): GetUsageResponse;

  getNextPlanAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setNextPlanAt(value?: google_protobuf_timestamp_pb.Timestamp): GetUsageResponse;
  hasNextPlanAt(): boolean;
  clearNextPlanAt(): GetUsageResponse;

  getAddonsList(): Array<AddonSubscription>;
  setAddonsList(value: Array<AddonSubscription>): GetUsageResponse;
  clearAddonsList(): GetUsageResponse;
  addAddons(value?: AddonSubscription, index?: number): AddonSubscription;

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
    planCode: string;
    nextPlanCode?: string;
    nextPlanAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    addonsList: Array<AddonSubscription.AsObject>;
  };

  export enum NextPlanCodeCase {
    _NEXT_PLAN_CODE_NOT_SET = 0,
    NEXT_PLAN_CODE = 7,
  }

  export enum NextPlanAtCase {
    _NEXT_PLAN_AT_NOT_SET = 0,
    NEXT_PLAN_AT = 8,
  }
}

export class AddonSubscription extends jspb.Message {
  getAddonKey(): string;
  setAddonKey(value: string): AddonSubscription;

  getPlanCode(): string;
  setPlanCode(value: string): AddonSubscription;

  getPlanName(): string;
  setPlanName(value: string): AddonSubscription;

  getStatus(): AddonStatus;
  setStatus(value: AddonStatus): AddonSubscription;

  getEndsAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setEndsAt(value?: google_protobuf_timestamp_pb.Timestamp): AddonSubscription;
  hasEndsAt(): boolean;
  clearEndsAt(): AddonSubscription;

  getMetricsList(): Array<UsageMetric>;
  setMetricsList(value: Array<UsageMetric>): AddonSubscription;
  clearMetricsList(): AddonSubscription;
  addMetrics(value?: UsageMetric, index?: number): UsageMetric;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddonSubscription.AsObject;
  static toObject(includeInstance: boolean, msg: AddonSubscription): AddonSubscription.AsObject;
  static serializeBinaryToWriter(message: AddonSubscription, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddonSubscription;
  static deserializeBinaryFromReader(message: AddonSubscription, reader: jspb.BinaryReader): AddonSubscription;
}

export namespace AddonSubscription {
  export type AsObject = {
    addonKey: string;
    planCode: string;
    planName: string;
    status: AddonStatus;
    endsAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
    metricsList: Array<UsageMetric.AsObject>;
  };

  export enum EndsAtCase {
    _ENDS_AT_NOT_SET = 0,
    ENDS_AT = 5,
  }
}

export class GetEntitlementsRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetEntitlementsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetEntitlementsRequest): GetEntitlementsRequest.AsObject;
  static serializeBinaryToWriter(message: GetEntitlementsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetEntitlementsRequest;
  static deserializeBinaryFromReader(message: GetEntitlementsRequest, reader: jspb.BinaryReader): GetEntitlementsRequest;
}

export namespace GetEntitlementsRequest {
  export type AsObject = {
  };
}

export class GetEntitlementsResponse extends jspb.Message {
  getTier(): PlanTier;
  setTier(value: PlanTier): GetEntitlementsResponse;

  getAddonsList(): Array<AddonSubscription>;
  setAddonsList(value: Array<AddonSubscription>): GetEntitlementsResponse;
  clearAddonsList(): GetEntitlementsResponse;
  addAddons(value?: AddonSubscription, index?: number): AddonSubscription;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetEntitlementsResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetEntitlementsResponse): GetEntitlementsResponse.AsObject;
  static serializeBinaryToWriter(message: GetEntitlementsResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetEntitlementsResponse;
  static deserializeBinaryFromReader(message: GetEntitlementsResponse, reader: jspb.BinaryReader): GetEntitlementsResponse;
}

export namespace GetEntitlementsResponse {
  export type AsObject = {
    tier: PlanTier;
    addonsList: Array<AddonSubscription.AsObject>;
  };
}

export class SubscribeAddonRequest extends jspb.Message {
  getPlanCode(): string;
  setPlanCode(value: string): SubscribeAddonRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscribeAddonRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SubscribeAddonRequest): SubscribeAddonRequest.AsObject;
  static serializeBinaryToWriter(message: SubscribeAddonRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscribeAddonRequest;
  static deserializeBinaryFromReader(message: SubscribeAddonRequest, reader: jspb.BinaryReader): SubscribeAddonRequest;
}

export namespace SubscribeAddonRequest {
  export type AsObject = {
    planCode: string;
  };
}

export class SubscribeAddonResponse extends jspb.Message {
  getStatus(): PlanChangeStatus;
  setStatus(value: PlanChangeStatus): SubscribeAddonResponse;

  getActionUrl(): string;
  setActionUrl(value: string): SubscribeAddonResponse;
  hasActionUrl(): boolean;
  clearActionUrl(): SubscribeAddonResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SubscribeAddonResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SubscribeAddonResponse): SubscribeAddonResponse.AsObject;
  static serializeBinaryToWriter(message: SubscribeAddonResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SubscribeAddonResponse;
  static deserializeBinaryFromReader(message: SubscribeAddonResponse, reader: jspb.BinaryReader): SubscribeAddonResponse;
}

export namespace SubscribeAddonResponse {
  export type AsObject = {
    status: PlanChangeStatus;
    actionUrl?: string;
  };

  export enum ActionUrlCase {
    _ACTION_URL_NOT_SET = 0,
    ACTION_URL = 2,
  }
}

export class CancelAddonRequest extends jspb.Message {
  getPlanCode(): string;
  setPlanCode(value: string): CancelAddonRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CancelAddonRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CancelAddonRequest): CancelAddonRequest.AsObject;
  static serializeBinaryToWriter(message: CancelAddonRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CancelAddonRequest;
  static deserializeBinaryFromReader(message: CancelAddonRequest, reader: jspb.BinaryReader): CancelAddonRequest;
}

export namespace CancelAddonRequest {
  export type AsObject = {
    planCode: string;
  };
}

export class CancelAddonResponse extends jspb.Message {
  getEffectiveAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setEffectiveAt(value?: google_protobuf_timestamp_pb.Timestamp): CancelAddonResponse;
  hasEffectiveAt(): boolean;
  clearEffectiveAt(): CancelAddonResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CancelAddonResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CancelAddonResponse): CancelAddonResponse.AsObject;
  static serializeBinaryToWriter(message: CancelAddonResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CancelAddonResponse;
  static deserializeBinaryFromReader(message: CancelAddonResponse, reader: jspb.BinaryReader): CancelAddonResponse;
}

export namespace CancelAddonResponse {
  export type AsObject = {
    effectiveAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
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

export class ChangePlanRequest extends jspb.Message {
  getPlanCode(): string;
  setPlanCode(value: string): ChangePlanRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChangePlanRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ChangePlanRequest): ChangePlanRequest.AsObject;
  static serializeBinaryToWriter(message: ChangePlanRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChangePlanRequest;
  static deserializeBinaryFromReader(message: ChangePlanRequest, reader: jspb.BinaryReader): ChangePlanRequest;
}

export namespace ChangePlanRequest {
  export type AsObject = {
    planCode: string;
  };
}

export class ChangePlanResponse extends jspb.Message {
  getStatus(): PlanChangeStatus;
  setStatus(value: PlanChangeStatus): ChangePlanResponse;

  getActionUrl(): string;
  setActionUrl(value: string): ChangePlanResponse;
  hasActionUrl(): boolean;
  clearActionUrl(): ChangePlanResponse;

  getEffectiveAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setEffectiveAt(value?: google_protobuf_timestamp_pb.Timestamp): ChangePlanResponse;
  hasEffectiveAt(): boolean;
  clearEffectiveAt(): ChangePlanResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ChangePlanResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ChangePlanResponse): ChangePlanResponse.AsObject;
  static serializeBinaryToWriter(message: ChangePlanResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ChangePlanResponse;
  static deserializeBinaryFromReader(message: ChangePlanResponse, reader: jspb.BinaryReader): ChangePlanResponse;
}

export namespace ChangePlanResponse {
  export type AsObject = {
    status: PlanChangeStatus;
    actionUrl?: string;
    effectiveAt?: google_protobuf_timestamp_pb.Timestamp.AsObject;
  };

  export enum ActionUrlCase {
    _ACTION_URL_NOT_SET = 0,
    ACTION_URL = 2,
  }

  export enum EffectiveAtCase {
    _EFFECTIVE_AT_NOT_SET = 0,
    EFFECTIVE_AT = 3,
  }
}

export enum PlanKind {
  PLAN_KIND_UNSPECIFIED = 0,
  PLAN_KIND_BASE = 1,
  PLAN_KIND_ADDON = 2,
}
export enum AddonStatus {
  ADDON_STATUS_UNSPECIFIED = 0,
  ADDON_STATUS_ACTIVE = 1,
  ADDON_STATUS_ENDING = 2,
}
export enum AccountType {
  ACCOUNT_TYPE_UNSPECIFIED = 0,
  ACCOUNT_TYPE_INDIVIDUAL = 1,
  ACCOUNT_TYPE_MANUFACTURER = 2,
  ACCOUNT_TYPE_BUSINESS = 3,
}
export enum PlanTier {
  PLAN_TIER_UNSPECIFIED = 0,
  PLAN_TIER_FREE = 1,
  PLAN_TIER_PAID = 2,
}
export enum PlanChangeStatus {
  PLAN_CHANGE_STATUS_UNSPECIFIED = 0,
  PLAN_CHANGE_STATUS_APPLIED = 1,
  PLAN_CHANGE_STATUS_SCHEDULED = 2,
  PLAN_CHANGE_STATUS_OUTSTANDING_INVOICES = 3,
  PLAN_CHANGE_STATUS_PAYMENT_METHOD_REQUIRED = 4,
}
