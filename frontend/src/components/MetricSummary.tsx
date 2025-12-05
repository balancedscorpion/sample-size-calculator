import { memo, useEffect, useRef, useState } from 'react'
import type { PowerCurveResponse, SampleSizeResponse } from '../types'

interface MetricSummaryProps {
  sampleSizeData: SampleSizeResponse | null
  powerCurveData: PowerCurveResponse | null
}

// Animated number component for the hero display
function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValue = useRef(value)

  useEffect(() => {
    if (previousValue.current === value) return

    const startValue = previousValue.current
    const endValue = value
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (endValue - startValue) * eased)
      
      setDisplayValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        previousValue.current = value
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <>{displayValue.toLocaleString()}</>
}

function MetricSummaryComponent({ sampleSizeData, powerCurveData }: MetricSummaryProps) {
  if (!sampleSizeData && !powerCurveData) {
    return null
  }

  const samplePerVariant = sampleSizeData?.sampleSizePerVariant ?? powerCurveData?.sampleSizePerVariant
  const totalSample = sampleSizeData?.totalSampleSize ?? (powerCurveData ? powerCurveData.sampleSizePerVariant * 2 : null)
  const power = powerCurveData?.power ?? sampleSizeData?.power
  const alpha = powerCurveData?.alpha ?? sampleSizeData?.alpha
  const exceedsMax = sampleSizeData?.exceedsMaxSampleSize ?? false

  const roundedPerVariant = samplePerVariant ? Math.round(samplePerVariant) : 0
  const roundedTotal = totalSample ? Math.round(totalSample) : 0

  return (
    <div className="metric-summary-wrapper">
      {/* Hero Result */}
      <div className={`hero-result ${exceedsMax ? 'hero-result--warning' : ''}`}>
        <div className="hero-result-label">
          {exceedsMax ? 'You need more than' : 'You need'}
        </div>
        <div className="hero-result-value">
          {samplePerVariant ? <AnimatedNumber value={roundedPerVariant} /> : '--'}
        </div>
        <div className="hero-result-unit">users per variant</div>
        <div className="hero-result-total">
          {totalSample ? (
            <>({<AnimatedNumber value={roundedTotal} />} total across both groups)</>
          ) : null}
        </div>
        {exceedsMax && (
          <div className="hero-result-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>This effect size is very small. Consider increasing your expected lift or accepting lower statistical power.</span>
          </div>
        )}
      </div>

      {/* Secondary Metrics */}
      <div className="secondary-metrics">
        <div className="secondary-metric">
          <div className="secondary-metric-icon secondary-metric-icon--power">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div className="secondary-metric-content">
            <div className="secondary-metric-value">
              {power ? `${(power * 100).toFixed(0)}%` : '--'}
            </div>
            <div className="secondary-metric-label">Statistical Power</div>
          </div>
        </div>

        <div className="secondary-metric">
          <div className="secondary-metric-icon secondary-metric-icon--alpha">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="secondary-metric-content">
            <div className="secondary-metric-value">
              {alpha ? `${(alpha * 100).toFixed(0)}%` : '--'}
            </div>
            <div className="secondary-metric-label">False Positive Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent flickering during updates
export const MetricSummary = memo(MetricSummaryComponent)

