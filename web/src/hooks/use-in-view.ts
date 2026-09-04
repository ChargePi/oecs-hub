import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(options?: {
  threshold?: number
  rootMargin?: string
}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  const { threshold = 0.2, rootMargin = '0px' } = options ?? {}

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, inView }
}
