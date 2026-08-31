import { RpcError, StatusCode } from 'grpc-web'
import type {
  CategoryRating,
  ChargerType,
  ChargerVariant,
  Contact,
  Manufacturer,
  ModelStatus,
} from '@/lib/oecs/types'
import * as registry_v1_registry_pb from './gen/registry/v1/registry_pb'
import type { ManufacturerSummary, SubmissionStatus } from './types'

const CHARGER_TYPE_FROM_PROTO: Partial<
  Record<registry_v1_registry_pb.ChargerType, ChargerType>
> = {
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_AC]: 'AC',
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_DC]: 'DC',
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_PORTABLE_EVSE]: 'portable-evse',
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_WIRELESS]: 'wireless',
}

export function chargerTypeFromProto(type: registry_v1_registry_pb.ChargerType): ChargerType {
  return CHARGER_TYPE_FROM_PROTO[type] ?? 'AC'
}

const MODEL_STATUS_FROM_PROTO: Partial<
  Record<registry_v1_registry_pb.ModelStatus, ModelStatus>
> = {
  [registry_v1_registry_pb.ModelStatus.MODEL_STATUS_PRE_RELEASE]: 'pre-release',
  [registry_v1_registry_pb.ModelStatus.MODEL_STATUS_ACTIVE]: 'active',
  [registry_v1_registry_pb.ModelStatus.MODEL_STATUS_DISCONTINUED]: 'discontinued',
  [registry_v1_registry_pb.ModelStatus.MODEL_STATUS_END_OF_LIFE]: 'end-of-life',
}

export function modelStatusFromProto(
  status: registry_v1_registry_pb.ModelStatus,
): ModelStatus | undefined {
  return MODEL_STATUS_FROM_PROTO[status]
}

export function contactFromProto(c: registry_v1_registry_pb.Contact): Contact {
  return {
    name: c.hasName() ? c.getName() : undefined,
    email: c.hasEmail() ? c.getEmail() : undefined,
    phone: c.hasPhone() ? c.getPhone() : undefined,
    website: c.hasWebsite() ? c.getWebsite() : undefined,
  }
}

export function manufacturerFromProto(m: registry_v1_registry_pb.Manufacturer): Manufacturer {
  return {
    id: m.getId(),
    name: m.getName(),
    country: m.hasCountry() ? m.getCountry() : undefined,
    contact: m.hasContact() ? contactFromProto(m.getContact()!) : undefined,
  }
}

export function categoryRatingFromProto(r: registry_v1_registry_pb.CategoryRating): CategoryRating {
  return {
    categoryName: r.getCategoryName(),
    average: r.getAverage(),
    count: r.getCount(),
  }
}

export function manufacturerSummaryFromProto(
  ms: registry_v1_registry_pb.ManufacturerSummary,
): ManufacturerSummary {
  const manufacturer = ms.getManufacturer()
  if (!manufacturer) throw new Error('ManufacturerSummary missing manufacturer')
  return {
    ...manufacturerFromProto(manufacturer),
    productCount: ms.getProductCount(),
    variantCount: ms.getVariantCount(),
  }
}

/**
 * Builds a placeholder ChargerVariant from a search-result summary, which carries only the
 * fields listed in the picker/search UI, not the full OECS spec — hardware.connectors and
 * software.protocols are left empty rather than fetching each variant's full spec individually.
 * Callers that need the full spec (comparison view) use `chargerVariantFromProto` on a
 * `GetCharger` response instead.
 */
export function chargerVariantFromSummary(
  summary: registry_v1_registry_pb.ChargerVariantSummary,
): ChargerVariant {
  return {
    id: summary.getId(),
    manufacturer: {
      id: summary.getManufacturerId(),
      name: summary.getManufacturerName(),
    },
    model: {
      name: summary.getModelName(),
      series: summary.hasSeries() ? summary.getSeries() : undefined,
      status: modelStatusFromProto(summary.getModelStatus()),
      type: chargerTypeFromProto(summary.getChargerType()),
      productImageUrl: summary.hasProductImageUrl() ? summary.getProductImageUrl() : undefined,
    },
    hardware: {
      connectors: [],
      electrical: summary.hasMaxPowerKw()
        ? { output: { maxPower: { value: summary.getMaxPowerKw(), unit: 'kW' } } }
        : undefined,
    },
    software: { protocols: [] },
    ratings: summary.getRatingsList().map(categoryRatingFromProto),
  }
}

/**
 * Builds the full ChargerVariant from a GetCharger response by decoding its raw OECS `spec`
 * bytes, which is the authoritative source for hardware/software/payment/pricing/metadata. The
 * raw spec has no `id` on itself or on `manufacturer` (those aren't part of the OECS schema), so
 * both are injected from the accompanying summary.
 */
export function chargerVariantFromProto(v: registry_v1_registry_pb.ChargerVariant): ChargerVariant {
  const summary = v.getSummary()
  if (!summary) throw new Error('ChargerVariant missing summary')

  const spec = JSON.parse(new TextDecoder().decode(v.getSpec_asU8())) as Omit<
    ChargerVariant,
    'id' | 'manufacturer' | 'ratings'
  > & { manufacturer: Omit<Manufacturer, 'id'> }

  return {
    ...spec,
    id: summary.getId(),
    manufacturer: { ...spec.manufacturer, id: summary.getManufacturerId() },
    ratings: summary.getRatingsList().map(categoryRatingFromProto),
  }
}

const SUBMISSION_STATUS_FROM_PROTO: Partial<
  Record<registry_v1_registry_pb.SubmissionStatus, SubmissionStatus>
> = {
  [registry_v1_registry_pb.SubmissionStatus.SUBMISSION_STATUS_UNSPECIFIED]: 'unspecified',
  [registry_v1_registry_pb.SubmissionStatus.SUBMISSION_STATUS_SUBMITTED]: 'submitted',
  [registry_v1_registry_pb.SubmissionStatus.SUBMISSION_STATUS_VERIFIED]: 'verified',
  [registry_v1_registry_pb.SubmissionStatus.SUBMISSION_STATUS_REJECTED]: 'rejected',
}

export function submissionStatusFromProto(
  status: registry_v1_registry_pb.SubmissionStatus,
): SubmissionStatus {
  return SUBMISSION_STATUS_FROM_PROTO[status] ?? 'unspecified'
}

export function isNotFound(err: unknown): boolean {
  return err instanceof RpcError && err.code === StatusCode.NOT_FOUND
}

export function mapGrpcError(err: unknown, context: string): never {
  if (err instanceof RpcError) {
    console.error(`registry request failed: ${context}`, StatusCode[err.code], err.message)
    throw new Error(err.message)
  }
  console.error(`registry request failed: ${context}`, err)
  throw err
}

/** Fetches every page of a paginated RPC by following next_page_token until it's empty. */
export async function collectAllPages<T>(
  fetchPage: (pageToken: string) => Promise<{ items: T[]; nextPageToken: string }>,
): Promise<T[]> {
  const all: T[] = []
  let pageToken = ''
  for (;;) {
    const { items, nextPageToken } = await fetchPage(pageToken)
    all.push(...items)
    if (!nextPageToken) return all
    pageToken = nextPageToken
  }
}
