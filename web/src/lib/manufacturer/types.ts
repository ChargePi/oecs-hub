import type { SubmissionStatus } from '@/lib/registry/types'

export interface ManufacturerCharger {
  id: string
  modelName: string
  manufacturerName: string
  status: SubmissionStatus
  submittedAt: string
  reviewedAt?: string
  /** The raw OECS spec, used to prefill the editor when editing this submission. */
  spec: Uint8Array
}

export interface ManufacturerChargersPage {
  chargers: ManufacturerCharger[]
  nextPageToken: string
  totalSize: number
}
