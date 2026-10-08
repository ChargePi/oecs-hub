import { useResizableWidth } from '@/hooks/use-resizable-width'

export const DEFAULT_WIDTH = 420
const MIN_WIDTH = 320
const MAX_WIDTH = 960
/** Room always left for the page beside the drawer. */
const MIN_PAGE_WIDTH = 480

/** Below this the drawer can't dock without crushing the page, so it becomes a sheet. */
export const DOCKED_QUERY = `(min-width: ${MIN_WIDTH + MIN_PAGE_WIDTH}px)`

/** Width of the docked assistant drawer plus handlers for its resize handle. */
export function useDrawerWidth() {
  return useResizableWidth({
    storageKey: 'oecs.chat-drawer.width',
    defaultWidth: DEFAULT_WIDTH,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    minPageWidth: MIN_PAGE_WIDTH,
    edge: 'left',
    // Fixed-position widgets (e.g. the comparison pill) sit clear of the drawer.
    cssVar: '--chat-drawer-width',
  })
}
