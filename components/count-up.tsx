import { useEffect, useRef, useState } from 'react'

type Props = {
  /** A figure as it should finally read, e.g. "369" or "41k+". */
  value: string
  className?: string
  durationMs?: number
}

/** Splits "41k+" into 41 and "k+". Returns null if there is no leading number. */
function splitFigure(value: string): { target: number; suffix: string } | null {
  const match = /^(\d+)(.*)$/.exec(value.trim())
  if (!match) return null
  return { target: Number(match[1]), suffix: match[2] }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Counts a stat up from zero the first time it scrolls into view. The figure is
 * rendered as text from the start, so it is correct for search engines, for
 * anyone without JS, and for anyone who has asked for less motion — the
 * animation only ever replaces a value that is already right.
 */
const CountUp = ({ value, className, durationMs = 1400 }: Props) => {
  const parsed = splitFigure(value)
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const node = ref.current
    if (!node || !parsed) return
    if (prefersReducedMotion()) return
    if (typeof IntersectionObserver === 'undefined') return

    let frame = 0
    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1)
        // easeOutCubic — quick off the mark, settles gently on the real number.
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(`${Math.round(eased * parsed.target)}${parsed.suffix}`)
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect()
            setDisplay(`0${parsed.suffix}`)
            run()
          }
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
    // `parsed` is derived from `value`; depending on it directly would re-run
    // the effect on every render because it is a fresh object each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

export default CountUp
