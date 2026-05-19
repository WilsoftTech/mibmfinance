'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ============================================================
// Easing function - ease out cubic for natural feel
// ============================================================
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// ============================================================
// Animated Number Component
// ============================================================

interface AnimatedNumberProps {
  value: number
  format?: 'number' | 'currency' | 'percent'
  duration?: number // in ms, default 1500
  className?: string
  delay?: number // delay before starting animation
}

export function AnimatedNumber({
  value,
  format = 'number',
  duration = 1500,
  className = '',
  delay = 0,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const animationRef = useRef<number | null>(null)
  const hasAnimated = useRef(false)

  // Format the display value based on format type
  const formatDisplay = useCallback(
    (num: number): string => {
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(num)
        case 'percent':
          return `${num.toFixed(1)}%`
        case 'number':
        default:
          return new Intl.NumberFormat('en-US').format(Math.round(num))
      }
    },
    [format]
  )

  // IntersectionObserver to detect when element is in viewport
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsVisible(true)
          hasAnimated.current = true
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Animate when visible
  useEffect(() => {
    if (!isVisible) return

    let startTime: number | null = null
    const startDelay = delay

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp + startDelay
      }

      const elapsed = timestamp - startTime

      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const currentValue = easedProgress * value

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, value, duration, delay])

  return (
    <span ref={ref} className={className}>
      {formatDisplay(displayValue)}
    </span>
  )
}
