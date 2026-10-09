import { useEffect, useState } from 'react'

import { useMediaQuery } from './use-media-query'

const DURATION_MS = 900

export function useCountUp(target: number | undefined): number | undefined {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [value, setValue] = useState<number>()

  useEffect(() => {
    if (target == null || reducedMotion) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1)
      setValue(Math.round(target * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reducedMotion])

  return reducedMotion ? target : value
}
