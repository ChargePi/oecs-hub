import { useEffect, useState } from 'react'

// Served by the backend at /api/oecs-schema/bundled/charger.schema.json - a single,
// dependency-free file with every cross-file $ref already flattened to a local
// "#/$defs/<namespace>/..." pointer (see internal/oecsspec/schemabundle), rather than the
// 8 separate per-concern files it's generated from. Monaco's JSON language service can
// resolve $ref across multiple registered schemas, but that setup needed every file
// fetched individually and only the root schema given a fileMatch - fetching the one
// bundle and registering it as the sole schema is simpler and has one less moving part.
const BUNDLED_SCHEMA_URL = '/api/oecs-schema/bundled/charger.schema.json'

export interface LoadedSchema {
  uri: string
  schema: object
}

export function useOecsJsonSchemas() {
  const [schema, setSchema] = useState<LoadedSchema | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(BUNDLED_SCHEMA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`failed to load bundled schema: ${res.status}`)
        return res.json() as Promise<{ $id: string }>
      })
      .then((loaded) => {
        if (!cancelled) setSchema({ uri: loaded.$id, schema: loaded })
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { schema, error }
}
