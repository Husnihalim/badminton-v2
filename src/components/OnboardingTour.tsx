import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui/button'
import { X, ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import type { TourPlacement, TourStep } from '../lib/onboarding/steps'

interface OnboardingTourProps {
  steps: TourStep[]
  isOpen: boolean
  onComplete: () => void
  onSkip: () => void
}

const HIGHLIGHT_PADDING = 8
const TOOLTIP_MARGIN = 16
const MIN_TOOLTIP_WIDTH = 280
const MAX_TOOLTIP_WIDTH = 360

function fitTooltip(
  placement: TourPlacement,
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  viewport: { width: number; height: number }
): { top: number; left: number; adjustedPlacement: TourPlacement } {
  const centerX = targetRect.left + targetRect.width / 2
  const centerY = targetRect.top + targetRect.height / 2

  let computedTop: number
  let computedLeft: number
  let adjustedPlacement = placement

  switch (placement) {
    case 'top':
      computedTop = targetRect.top - tooltipHeight - TOOLTIP_MARGIN
      computedLeft = centerX - tooltipWidth / 2
      break
    case 'bottom':
      computedTop = targetRect.bottom + TOOLTIP_MARGIN
      computedLeft = centerX - tooltipWidth / 2
      break
    case 'left':
      computedTop = centerY - tooltipHeight / 2
      computedLeft = targetRect.left - tooltipWidth - TOOLTIP_MARGIN
      break
    case 'right':
      computedTop = centerY - tooltipHeight / 2
      computedLeft = targetRect.right + TOOLTIP_MARGIN
      break
    case 'center':
    default:
      computedTop = centerY - tooltipHeight / 2
      computedLeft = centerX - tooltipWidth / 2
      break
  }

  // Flip vertically if overflowing
  if (computedTop < TOOLTIP_MARGIN) {
    computedTop = targetRect.bottom + TOOLTIP_MARGIN
    adjustedPlacement = placement === 'top' ? 'bottom' : adjustedPlacement
  }
  if (computedTop + tooltipHeight > viewport.height - TOOLTIP_MARGIN) {
    computedTop = targetRect.top - tooltipHeight - TOOLTIP_MARGIN
    adjustedPlacement = placement === 'bottom' ? 'top' : adjustedPlacement
  }

  // Flip horizontally if overflowing
  if (computedLeft < TOOLTIP_MARGIN) {
    computedLeft = TOOLTIP_MARGIN
    adjustedPlacement = placement === 'left' ? 'right' : adjustedPlacement
  }
  if (computedLeft + tooltipWidth > viewport.width - TOOLTIP_MARGIN) {
    computedLeft = viewport.width - tooltipWidth - TOOLTIP_MARGIN
    adjustedPlacement = placement === 'right' ? 'left' : adjustedPlacement
  }

  // Final clamp
  computedTop = Math.max(TOOLTIP_MARGIN, Math.min(computedTop, viewport.height - tooltipHeight - TOOLTIP_MARGIN))
  computedLeft = Math.max(TOOLTIP_MARGIN, Math.min(computedLeft, viewport.width - tooltipWidth - TOOLTIP_MARGIN))

  return { top: computedTop, left: computedLeft, adjustedPlacement }
}

function useElementRect(selector: string | undefined, isOpen: boolean) {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!isOpen || typeof window === 'undefined' || !selector) return () => {}

      const observer = new MutationObserver(callback)
      observer.observe(document.body, { childList: true, subtree: true, attributes: true })

      const handleResize = () => callback()
      const handleScroll = () => callback()

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)

      return () => {
        observer.disconnect()
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    },
    [selector, isOpen]
  )

  const getSnapshot = useCallback(() => {
    if (!isOpen || typeof document === 'undefined' || !selector) return null
    const el = document.querySelector(selector)
    return el ? el.getBoundingClientRect() : null
  }, [selector, isOpen])

  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

function useStateWithReset(isOpen: boolean): [number, React.Dispatch<React.SetStateAction<number>>] {
  const [currentIndex, setCurrentIndex] = useState(0)
  const prevIsOpenRef = useRef(isOpen)

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setCurrentIndex(0)
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen])

  return [currentIndex, setCurrentIndex]
}

function useStepTransition(currentStep: TourStep | undefined, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !currentStep?.onBeforeShow) return
    const timer = setTimeout(() => {
      currentStep.onBeforeShow?.()
    }, 0)
    return () => clearTimeout(timer)
  }, [isOpen, currentStep])
}

function useMeasuredSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const callbackRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return

    const update = () => {
      const rect = node.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  return { callbackRef, size }
}

export function OnboardingTour({ steps, isOpen, onComplete, onSkip }: OnboardingTourProps) {
  const [currentIndex, setCurrentIndex] = useStateWithReset(isOpen)
  const currentStep = steps[currentIndex]
  const targetRect = useElementRect(currentStep?.target, isOpen)

  useStepTransition(currentStep, isOpen)

  const { callbackRef: tooltipRefCallback, size: tooltipSize } = useMeasuredSize()

  const tooltipPosition = useMemo(() => {
    if (!targetRect || tooltipSize.width === 0 || tooltipSize.height === 0) return null
    return fitTooltip(
      currentStep.placement || 'bottom',
      targetRect,
      Math.min(Math.max(tooltipSize.width, MIN_TOOLTIP_WIDTH), MAX_TOOLTIP_WIDTH),
      tooltipSize.height,
      { width: window.innerWidth, height: window.innerHeight }
    )
  }, [targetRect, tooltipSize.width, tooltipSize.height, currentStep?.placement])

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  if (!isOpen || !currentStep) return null

  const progressPercent = ((currentIndex + 1) / steps.length) * 100

  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - HIGHLIGHT_PADDING,
        left: targetRect.left - HIGHLIGHT_PADDING,
        width: targetRect.width + HIGHLIGHT_PADDING * 2,
        height: targetRect.height + HIGHLIGHT_PADDING * 2,
      }
    : null

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      aria-modal="true"
      role="dialog"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      {/* Backdrop with cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Spotlight around target */}
      {spotlightStyle && (
        <div
          className="fixed rounded-xl border-2 border-[var(--arena-accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.6),0_0_24px_rgba(204,255,0,0.25)] transition-all duration-200 pointer-events-none"
          style={spotlightStyle}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[101] w-[min(calc(100vw-32px),360px)] rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)] p-4 shadow-[var(--arena-shadow)] transition-all duration-200"
        ref={tooltipRefCallback}
        style={
          tooltipPosition
            ? {
                top: tooltipPosition.top,
                left: tooltipPosition.left,
              }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }
        }
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3
            id="onboarding-title"
            className="text-sm font-black uppercase tracking-tight text-[var(--arena-text)]"
          >
            {currentStep.title}
          </h3>
          <button
            type="button"
            onClick={handleSkip}
            className="text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] transition-colors cursor-pointer"
            title="Skip tour"
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <p
          id="onboarding-description"
          className="mb-4 text-sm leading-relaxed text-[var(--arena-text-muted)]"
        >
          {currentStep.description}
        </p>

        {/* Progress bar */}
        <div className="mb-4 h-1 w-full rounded-full bg-[var(--arena-surface-muted)] overflow-hidden">
          <div
            className="h-full bg-[var(--arena-accent)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] transition-colors cursor-pointer"
          >
            <Flag size={12} />
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-8 px-3 text-xs"
            >
              {currentIndex === steps.length - 1 ? 'Finish' : 'Next'}
              {currentIndex < steps.length - 1 && <ChevronRight size={14} className="ml-1" />}
            </Button>
          </div>
        </div>

        {/* Step counter */}
        <div className="mt-3 text-center text-[10px] font-mono font-bold uppercase tracking-wide text-[var(--arena-text-dim)]">
          {currentIndex + 1} / {steps.length}
        </div>
      </div>
    </div>,
    document.body
  )
}
