/** One parsed Server-Sent Event: `event:` defaults to "message" per the SSE spec
 *  when the stream omits it, same as EventSource would report it. */
export interface SseEvent {
  event: string
  data: string
}

/**
 * Parses a fetch Response body as Server-Sent Events, yielding each event as it
 * completes. Used instead of the built-in EventSource because: EventSource can't
 * see the response status (a 401/404 just retries silently), can't be fed a
 * `fetch` already in flight (so it can't share streamChat's AbortController), and
 * can't send a non-GET request - none of which matter today, but fetch keeps this
 * endpoint on the same footing as every other chat.client.ts call.
 *
 * Lines are split on bare "\n" (a `\r` suffix, if the server used CRLF, is
 * trimmed off each line) and grouped into events on a blank line, per the SSE
 * wire format - https://html.spec.whatwg.org/multipage/server-sent-events.html.
 * A `:`-prefixed line (StreamHandler's heartbeat) is a comment and never
 * produces an event.
 */
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
