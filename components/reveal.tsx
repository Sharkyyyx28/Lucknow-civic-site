import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'

type Props = {
  children: React.ReactNode
  className?: string
  /** Fraction of the element that has to be on screen before it reveals. */
  threshold?: number
}

/**
 * Fades and lifts its children into place the first time they scroll into
 * view, then stops watching. Sections reveal once — re-animating on the way
 * back up makes a page feel restless rather than alive.
 *
 * The visible state is also set immediately when IntersectionObserver is
 * missing, so an old browser gets the content rather than a blank column.
 * `styles/index.css` neutralises the transform under prefers-reduced-motion.
 */
const Reveal = ({ children, className, threshold = 0.15 }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return (
    <div
      ref={ref}
      className={cn(visible ? 'reveal-visible' : 'reveal-hidden', className)}
    >
      {children}
    </div>
  )
}

export default Reveal
