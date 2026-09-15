import { registryClient } from '@/lib/registry/client'
import { SpecEditor } from './spec-editor'

export function SubmitNewSegment() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold">Submit a new charger spec</h2>
        <p className="text-sm text-muted-foreground">
          Paste or upload an OECS charger schema below. It's validated against the OECS 2.0.0
          schema as you type; fix any errors before submitting.
        </p>
      </div>

      <SpecEditor
        onSubmit={(raw) => registryClient.submitChargerSpec(new TextEncoder().encode(raw))}
        submitLabel="Submit"
        submittingLabel="Submitting…"
        successMessage="Your spec was submitted for review. You'll see it listed as “submitted” in Submissions until an admin verifies it."
      />
    </div>
  )
}
