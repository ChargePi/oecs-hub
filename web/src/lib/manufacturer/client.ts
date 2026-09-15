import { normalizeAndDispatch } from '@/lib/errors'
import { ManufacturerServiceClient } from '@/lib/registry/gen/manufacturer/v1/ManufacturerServiceClientPb'
import {
  CancelSubmissionRequest,
  EditSpecificationRequest,
  GetManufacturerChargersRequest,
  type ManufacturerChargerSummary,
} from '@/lib/registry/gen/manufacturer/v1/manufacturer_pb'
import { submissionStatusFromProto } from '@/lib/registry/grpc-mapping'

import type { ManufacturerCharger, ManufacturerChargersPage } from './types'

// This service is registered on the same public gRPC server as RegistryService, not a
// separate backend (unlike billing) - same base as registry/grpc-client.ts's BASE_URL.
const BASE_URL = '/api'

const client = new ManufacturerServiceClient(BASE_URL, null, null)

function mapError(err: unknown, context: string): never {
  normalizeAndDispatch(err, context, 'manufacturer request failed')
}

function manufacturerChargerFromProto(summary: ManufacturerChargerSummary): ManufacturerCharger {
  const s = summary.getSummary()

  return {
    id: s?.getId() ?? '',
    modelName: s?.getModelName() ?? '',
    manufacturerName: s?.getManufacturerName() ?? '',
    status: submissionStatusFromProto(s?.getStatus() ?? 0),
    submittedAt: summary.getSubmittedAt()?.toDate().toISOString() ?? '',
    reviewedAt: summary.getReviewedAt()?.toDate().toISOString() ?? undefined,
    spec: summary.getSpec_asU8(),
  }
}

export async function getManufacturerChargers(params: {
  pageSize: number
  pageToken?: string
}): Promise<ManufacturerChargersPage> {
  const req = new GetManufacturerChargersRequest()
  req.setPageSize(params.pageSize)
  req.setPageToken(params.pageToken ?? '')

  try {
    const resp = await client.getManufacturerChargers(req, {})
    return {
      chargers: resp.getChargersList().map(manufacturerChargerFromProto),
      nextPageToken: resp.getNextPageToken(),
      totalSize: resp.getTotalSize(),
    }
  } catch (err) {
    mapError(err, 'getManufacturerChargers')
  }
}

export async function cancelSubmission(id: string): Promise<ManufacturerCharger> {
  const req = new CancelSubmissionRequest()
  req.setId(id)

  try {
    const resp = await client.cancelSubmission(req, {})
    const charger = resp.getCharger()
    if (!charger) throw new Error('cancelSubmission: missing charger in response')

    return manufacturerChargerFromProto(charger)
  } catch (err) {
    mapError(err, 'cancelSubmission')
  }
}

export async function editSpecification(id: string, spec: Uint8Array): Promise<void> {
  const req = new EditSpecificationRequest()
  req.setId(id)
  req.setSpec(spec)

  try {
    await client.editSpecification(req, {})
  } catch (err) {
    mapError(err, 'editSpecification')
  }
}
