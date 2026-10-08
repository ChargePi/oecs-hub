import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

const STEP = 24

export interface ResizableWidthOptions {
  /** localStorage key the chosen width is remembered under. */
  storageKey: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
  /** Room always left for the page beside the column. */
  minPageWidth: number
  /** Which edge of the column the handle sits on: 'left' for a right-docked column. */
  edge: 'left' | 'right'
  /** Published on <html> so fixed-position widgets can sit clear of the column. */
  cssVar?: string
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function useViewportWidth() {
  return useSyncExternalStore(subscribeResize, () => window.innerWidth)
}

/** Width of a docked, resizable column plus pointer/keyboard handlers for its resize handle.
 *  The preferred width is kept as set and clamped to the viewport on every render,
 *  so shrinking the window narrows the column and widening it restores the preference. */
export function useResizableWidth({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  minPageWidth,
  edge,
  cssVar,
}: ResizableWidthOptions) {
  const clamp = useCallback(
    (width: number, viewport: number) => {
      const max = Math.max(minWidth, Math.min(maxWidth, viewport - minPageWidth))
      return Math.min(max, Math.max(minWidth, Math.round(width)))
    },
    [minWidth, maxWidth, minPageWidth],
  )

  const viewport = useViewportWidth()
  const [preferred, setPreferred] = useState(() => {
    try {
      const stored = Number(window.localStorage.getItem(storageKey))
      return stored ? clamp(stored, window.innerWidth) : defaultWidth
    } catch {
      return defaultWidth
    }
  })
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, width: 0 })
  const width = clamp(preferred, viewport)
  // Dragging away from the column's docked side grows it.
  const direction = edge === 'left' ? -1 : 1

  useEffect(() => {
    if (!cssVar) return
    const root = document.documentElement
    root.style.setProperty(cssVar, `${width}px`)
    return () => {
      root.style.removeProperty(cssVar)
    }
  }, [cssVar, width])

  const set = useCallback(
    (next: number) => {
      const clamped = clamp(next, window.innerWidth)
      setPreferred(clamped)
      try {
        window.localStorage.setItem(storageKey, String(clamped))
      } catch {
        // Storage blocked; the width just won't be remembered.
      }
    },
    [clamp, storageKey],
  )

  const dragged = (clientX: number) => start.current.width + direction * (clientX - start.current.x)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, width }
    setDragging(true)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setPreferred(clamp(dragged(e.clientX), viewport))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    set(dragged(e.clientX))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        set(width - direction * STEP)
        break
      case 'ArrowRight':
        set(width + direction * STEP)
        break
      case 'Home':
        set(defaultWidth)
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
      onDoubleClick: () => set(defaultWidth),
    },
  }
}
