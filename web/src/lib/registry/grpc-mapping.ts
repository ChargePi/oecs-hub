import { RpcError, StatusCode } from 'grpc-web'
import type {
  CategoryRating,
  ChargerType,
  ChargerVariant,
  ConnectorType,
  Contact,
  Manufacturer,
  ModelStatus,
} from '@/lib/oecs/types'
import * as registry_v1_registry_pb from './gen/registry/v1/registry_pb'
import type { ManufacturerSummary, SubmissionStatus, SubmitVariantRatingInput } from './types'

const CHARGER_TYPE_FROM_PROTO: Partial<Record<registry_v1_registry_pb.ChargerType, ChargerType>> = {
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_AC]: 'AC',
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_DC]: 'DC',
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_PORTABLE_EVSE]: 'portable-evse',
  [registry_v1_registry_pb.ChargerType.CHARGER_TYPE_WIRELESS]: 'wireless',
}

export function chargerTypeFromProto(type: registry_v1_registry_pb.ChargerType): ChargerType {
  return CHARGER_TYPE_FROM_PROTO[type] ?? 'AC'
}

const CONNECTOR_TYPE_FROM_PROTO: Partial<
  Record<registry_v1_registry_pb.ConnectorType, ConnectorType>
> = {
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_TYPE1_J1772]: 'Type1_J1772',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_TYPE2_MENNEKES]: 'Type2_Mennekes',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_TYPE3A]: 'Type3A',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_CCS1_COMBO1]: 'CCS1_Combo1',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_CCS2_COMBO2]: 'CCS2_Combo2',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_CHADEMO]: 'CHAdeMO',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_GBT_AC]: 'GBT_AC',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_GBT_DC]: 'GBT_DC',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_NACS_TESLA]: 'NACS_Tesla',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_DOMESTIC_SOCKET]: 'Domestic_Socket',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_INDUSTRIAL_IEC60309]: 'Industrial_IEC60309',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_MCS_MEGAWATT_CHARGING_SYSTEM]:
    'MCS_MegawattChargingSystem',
  [registry_v1_registry_pb.ConnectorType.CONNECTOR_TYPE_OTHER]: 'Other',
}

export function connectorTypeFromProto(
  type: registry_v1_registry_pb.ConnectorType,
): ConnectorType | undefined {
  return CONNECTOR_TYPE_FROM_PROTO[type]
}

const MODEL_STATUS_FROM_PROTO: Partial<Record<registry_v1_registry_pb.ModelStatus, ModelStatus>> = {
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

export function variantRatingInputToProto(
  input: SubmitVariantRatingInput,
): registry_v1_registry_pb.VariantRatingInput {
  const proto = new registry_v1_registry_pb.VariantRatingInput()
  proto.setCategoryName(input.categoryName)
  proto.setScore(input.score)
  return proto
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
 * fields listed in the picker/search/grid UI, not the full OECS spec — connectors are
 * stubbed from the summary's connector_types (currentType is a best-effort guess from the
 * charger's own type, since the summary doesn't carry it per-connector) and
 * software.protocols is left empty, rather than fetching each variant's full spec
 * individually. Callers that need the full spec (comparison view, detail drawer) use
 * `chargerVariantFromProto` on a `GetCharger` response instead.
 */
export function chargerVariantFromSummary(
  summary: registry_v1_registry_pb.ChargerVariantSummary,
): ChargerVariant {
  const chargerType = chargerTypeFromProto(summary.getChargerType())

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
      type: chargerType,
      productImageUrl: summary.hasProductImageUrl() ? summary.getProductImageUrl() : undefined,
    },
    hardware: {
      connectors: summary
        .getConnectorTypesList()
        .map(connectorTypeFromProto)
        .filter((type) => type != null)
        .map((type) => ({ type, currentType: chargerType === 'DC' ? 'DC' : 'AC' })),
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
