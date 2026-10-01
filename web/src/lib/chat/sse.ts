export interface SseEvent {
  event: string
  data: string
}

/** Parses a fetch Response body as Server-Sent Events. Fetch rather than
 *  EventSource: EventSource can't see the response status and can't share
 *  streamChat's AbortController. */
export async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIndex: number
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)
        const event = parseEventBlock(raw)
        if (event) yield event
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function parseEventBlock(raw: string): SseEvent | null {
  let eventName = 'message'
  const dataLines: string[] = []

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line === '' || line.startsWith(':')) continue
    if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim())
  }

  if (dataLines.length === 0) return null
  return { event: eventName, data: dataLines.join('\n') }
}
