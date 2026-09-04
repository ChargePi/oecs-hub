import { type ChangeEvent, type DragEvent, useMemo, useRef, useState } from 'react'
import Editor, { type OnMount, type OnValidate } from '@monaco-editor/react'
import { CheckCircle2, Upload, XCircle } from 'lucide-react'

import { jsonDefaults } from 'monaco-editor/languages/features/json/register'

import { monaco } from '@/lib/monaco-setup'
import { registryClient } from '@/lib/registry/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import acWallboxExample from './example-specs/ac-wallbox-full.json?raw'
import dcFastChargerExample from './example-specs/dc-fast-charger-full.json?raw'
import { useOecsJsonSchemas } from './use-oecs-json-schemas'

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string }

export function SubmitChargerPage() {
  const { schema, error: schemasError } = useOecsJsonSchemas()
  const [value, setValue] = useState('')
  const [errorCount, setErrorCount] = useState(0)
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' })
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)

  const schemasLoaded = useMemo(() => {
    if (!schema) return false

    jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [{ uri: schema.uri, schema: schema.schema, fileMatch: ['*'] }],
    })

    return true
  }, [schema])

  const handleMount: OnMount = (editor) => {
    editor.focus()
  }

  const handleValidate: OnValidate = (markers) => {
    setErrorCount(markers.filter((m) => m.severity === monaco.MarkerSeverity.Error).length)
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setValue(await file.text())
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!e.dataTransfer.types.includes('Files')) return
    dragDepthRef.current += 1
    setIsDraggingFile(true)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDraggingFile(false)
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    dragDepthRef.current = 0
    setIsDraggingFile(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    setValue(await file.text())
  }

  async function handleSubmit() {
    try {
      JSON.parse(value)
    } catch {
      setSubmitState({ status: 'error', message: 'The editor does not contain valid JSON.' })
      return
    }

    setSubmitState({ status: 'submitting' })

    try {
      const result = await registryClient.submitChargerSpec(new TextEncoder().encode(value))
      setSubmitState({ status: 'success', id: result.id })
    } catch (err) {
      setSubmitState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Submission failed.',
      })
    }
  }

  const canSubmit =
    schemasLoaded &&
    value.trim().length > 0 &&
    errorCount === 0 &&
    submitState.status !== 'submitting'

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10 md:px-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Submit a charger spec</h1>
        <p className="text-sm text-muted-foreground">
          Paste or upload an OECS charger schema below. It's validated against the OECS 2.0.0 schema
          as you type; fix any errors before submitting.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload />
          Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button variant="outline" size="sm" onClick={() => setValue(acWallboxExample)}>
          Load AC wallbox example
        </Button>
        <Button variant="outline" size="sm" onClick={() => setValue(dcFastChargerExample)}>
          Load DC fast charger example
        </Button>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-border/60"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {schemasError ? (
          <div className="flex h-[480px] items-center justify-center text-sm text-muted-foreground">
            Couldn't load the OECS schema. Refresh to try again.
          </div>
        ) : !schemasLoaded ? (
          <Skeleton className="h-[480px] w-full rounded-none" />
        ) : (
          <Editor
            height="480px"
            defaultLanguage="json"
            theme="oecs-dark"
            path="oecs-charger-spec.json"
            value={value}
            onChange={(v) => setValue(v ?? '')}
            onMount={handleMount}
            onValidate={handleValidate}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        )}

        {isDraggingFile && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-primary bg-background/90">
            <p className="text-sm font-medium text-foreground">Drop the JSON file to load it</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {schemasLoaded &&
            (errorCount > 0
              ? `${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}`
              : value.trim().length > 0
                ? 'No validation errors'
                : '')}
        </p>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitState.status === 'submitting' ? 'Submitting…' : 'Submit'}
        </Button>
      </div>

      {submitState.status === 'success' && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Submitted</AlertTitle>
          <AlertDescription>
            Your spec was submitted for review (id: {submitState.id}). You'll see it listed as
            "submitted" until an admin verifies it.
          </AlertDescription>
        </Alert>
      )}

      {submitState.status === 'error' && (
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>Submission failed</AlertTitle>
          <AlertDescription>{submitState.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
