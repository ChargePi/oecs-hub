import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

const STORAGE_KEY = 'oecs.chat-drawer.width'
export const DEFAULT_WIDTH = 420
const MIN_WIDTH = 320
const MAX_WIDTH = 960
/** Room always left for the page beside the drawer. */
const MIN_PAGE_WIDTH = 480
const STEP = 24
/** Published on <html> so fixed-position widgets can sit clear of the drawer. */
const WIDTH_VAR = '--chat-drawer-width'

/** Below this the drawer can't dock without crushing the page, so it becomes a sheet. */
export const DOCKED_QUERY = `(min-width: ${MIN_WIDTH + MIN_PAGE_WIDTH}px)`

function clamp(width: number, viewport: number) {
  const max = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, viewport - MIN_PAGE_WIDTH))
  return Math.min(max, Math.max(MIN_WIDTH, Math.round(width)))
}

function read(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY))
    return stored ? clamp(stored, window.innerWidth) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

function persist(width: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(width))
  } catch {
    // Storage blocked; the width just won't be remembered.
  }
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function useViewportWidth() {
  return useSyncExternalStore(subscribeResize, () => window.innerWidth)
}

/** Width of the docked drawer plus pointer/keyboard handlers for its resize handle.
 *  The preferred width is kept as set and clamped to the viewport on every render,
 *  so shrinking the window narrows the drawer and widening it restores the preference. */
export function useDrawerWidth() {
  const viewport = useViewportWidth()
  const [preferred, setPreferred] = useState(read)
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, width: 0 })
  const width = clamp(preferred, viewport)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty(WIDTH_VAR, `${width}px`)
    return () => {
      root.style.removeProperty(WIDTH_VAR)
    }
  }, [width])

  const set = useCallback((next: number) => {
    const clamped = clamp(next, window.innerWidth)
    setPreferred(clamped)
    persist(clamped)
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, width }
    setDragging(true)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setPreferred(clamp(start.current.width + start.current.x - e.clientX, viewport))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    set(start.current.width + start.current.x - e.clientX)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        set(width + STEP)
        break
      case 'ArrowRight':
        set(width - STEP)
        break
      case 'Home':
        set(DEFAULT_WIDTH)
        break
      default:
        return
    }
    e.preventDefault()
  }

  return {
    width,
    dragging,
    handle: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
      onDoubleClick: () => set(DEFAULT_WIDTH),
    },
  }
}
