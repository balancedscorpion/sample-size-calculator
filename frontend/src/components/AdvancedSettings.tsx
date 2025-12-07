import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

interface AdvancedSettingsProps {
  desiredPower: number
  onPowerChange: (power: number) => void
  alpha: number
  onAlphaChange: (alpha: number) => void
  twoSided: boolean
  onTwoSidedChange: (twoSided: boolean) => void
  sampleSizeOverride: number | null
  recommendedSampleSize: number | null
  onSampleSizeOverrideChange: (n: number | null) => void
  cupedEnabled: boolean
  onCupedEnabledChange: (enabled: boolean) => void
  preExperimentCorrelation: number
  onPreExperimentCorrelationChange: (correlation: number) => void
}

interface CupedPreset {
  name: string
  correlation: number
  description: string
}

interface Preset {
  name: string
  power: number
  alpha: number
  description: string
}

const PRESETS: Preset[] = [
  { name: 'Standard', power: 0.8, alpha: 0.05, description: '80% / 5%' },
  { name: 'Conservative', power: 0.9, alpha: 0.01, description: '90% / 1%' },
  { name: 'Quick', power: 0.7, alpha: 0.1, description: '70% / 10%' },
]

const CUPED_PRESETS: CupedPreset[] = [
  { name: 'Weak', correlation: 0.3, description: '~9% reduction' },
  { name: 'Moderate', correlation: 0.5, description: '~25% reduction' },
  { name: 'Strong', correlation: 0.7, description: '~51% reduction' },
]

export function AdvancedSettings({
  desiredPower,
  onPowerChange,
  alpha,
  onAlphaChange,
  twoSided,
  onTwoSidedChange,
  sampleSizeOverride,
  recommendedSampleSize,
  onSampleSizeOverrideChange,
  cupedEnabled,
  onCupedEnabledChange,
  preExperimentCorrelation,
  onPreExperimentCorrelationChange,
}: AdvancedSettingsProps) {
  const [showSampleOverride, setShowSampleOverride] = useState(false)
  const [powerInput, setPowerInput] = useState(desiredPower)
  const [alphaInput, setAlphaInput] = useState(alpha)
  const [correlationInput, setCorrelationInput] = useState(preExperimentCorrelation)

  // Track the last value we sent to parent to avoid sync loops
  const lastSentPower = useRef(desiredPower)
  const lastSentAlpha = useRef(alpha)
  const lastSentCorrelation = useRef(preExperimentCorrelation)

  // Check which preset is currently active
  const activePreset = PRESETS.find(
    p => Math.abs(p.power - desiredPower) < 0.01 && Math.abs(p.alpha - alpha) < 0.01
  )

  // Sync local slider states when parent values change externally
  // Only sync if the change didn't originate from us
  useEffect(() => {
    if (Math.abs(desiredPower - lastSentPower.current) > 1e-4) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from props
      setPowerInput(desiredPower)
    }
    lastSentPower.current = desiredPower
  }, [desiredPower])

  useEffect(() => {
    if (Math.abs(alpha - lastSentAlpha.current) > 1e-4) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from props
      setAlphaInput(alpha)
    }
    lastSentAlpha.current = alpha
  }, [alpha])

  useEffect(() => {
    if (Math.abs(preExperimentCorrelation - lastSentCorrelation.current) > 1e-4) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from props
      setCorrelationInput(preExperimentCorrelation)
    }
    lastSentCorrelation.current = preExperimentCorrelation
  }, [preExperimentCorrelation])

  // Debounce updates sent to parent to avoid flicker during drags
  useEffect(() => {
    if (Math.abs(powerInput - lastSentPower.current) < 1e-4) return

    const timeout = window.setTimeout(() => {
      lastSentPower.current = powerInput
      onPowerChange(powerInput)
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [powerInput, onPowerChange])

  useEffect(() => {
    if (Math.abs(alphaInput - lastSentAlpha.current) < 1e-4) return

    const timeout = window.setTimeout(() => {
      lastSentAlpha.current = alphaInput
      onAlphaChange(alphaInput)
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [alphaInput, onAlphaChange])

  useEffect(() => {
    if (Math.abs(correlationInput - lastSentCorrelation.current) < 1e-4) return

    const timeout = window.setTimeout(() => {
      lastSentCorrelation.current = correlationInput
      onPreExperimentCorrelationChange(correlationInput)
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [correlationInput, onPreExperimentCorrelationChange])

  const handleSampleSizeChange = (value: number) => {
    onSampleSizeOverrideChange(value)
  }

  const getAlphaLabel = (alpha: number) => {
    return `${(alpha * 100).toFixed(0)}%`
  }

  const resetSampleSize = () => {
    setShowSampleOverride(false)
    onSampleSizeOverrideChange(null)
  }

  const applyPreset = useCallback((preset: Preset) => {
    setPowerInput(preset.power)
    setAlphaInput(preset.alpha)
    lastSentPower.current = preset.power
    lastSentAlpha.current = preset.alpha
    onPowerChange(preset.power)
    onAlphaChange(preset.alpha)
  }, [onPowerChange, onAlphaChange])

  const applyCupedPreset = useCallback((preset: CupedPreset) => {
    setCorrelationInput(preset.correlation)
    lastSentCorrelation.current = preset.correlation
    onPreExperimentCorrelationChange(preset.correlation)
    if (!cupedEnabled) {
      onCupedEnabledChange(true)
    }
  }, [onPreExperimentCorrelationChange, onCupedEnabledChange, cupedEnabled])

  // Calculate variance reduction for display
  const varianceReductionPct = correlationInput * correlationInput * 100

  const minSample = recommendedSampleSize ? Math.max(100, Math.floor(recommendedSampleSize / 2)) : 100
  const maxSample = recommendedSampleSize ? Math.ceil(recommendedSampleSize * 3) : 100000
  const currentSample = sampleSizeOverride ?? recommendedSampleSize ?? 1000

  return (
    <details className="advanced-settings">
      <summary>
        <span className="summary-title">Advanced options</span>
        <span className="summary-subtitle">Fine-tune statistical parameters</span>
      </summary>

      <div className="advanced-content">
        {/* Preset Buttons */}
        <div className="preset-buttons">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`preset-btn ${activePreset?.name === preset.name ? 'preset-btn--active' : ''}`}
              onClick={() => applyPreset(preset)}
            >
              <span className="preset-btn-label">{preset.name}</span>
              <span className="preset-btn-values">{preset.description}</span>
            </button>
          ))}
        </div>

        <div className="form-group">
          <label htmlFor="power">
            <span className="label-text">Statistical power</span>
            <span className="helper-text">
              Chance of detecting a real effect
            </span>
          </label>
          <div className="slider-group">
            <input
              id="power"
              type="range"
              min="0.6"
              max="0.95"
              step="0.01"
              value={powerInput}
              onChange={(e) => setPowerInput(Number(e.target.value))}
            />
            <span className="slider-value">{(powerInput * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="alpha">
            <span className="label-text">Significance level (α)</span>
            <span className="helper-text">
              False positive risk threshold
            </span>
          </label>
          <div className="slider-group">
            <input
              id="alpha"
              type="range"
              min="0.01"
              max="0.20"
              step="0.01"
              value={alphaInput}
              onChange={(e) => setAlphaInput(Number(e.target.value))}
            />
            <span className="slider-value">{getAlphaLabel(alphaInput)}</span>
          </div>
        </div>

        <div className="form-group">
          <label>
            <span className="label-text">Hypothesis type</span>
          </label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${twoSided ? 'toggle-option--active' : ''}`}
              onClick={() => onTwoSidedChange(true)}
              aria-pressed={twoSided}
            >
              <span className="toggle-option-label">Two-tailed</span>
              <span className="toggle-option-tooltip">Detect changes in either direction. Standard choice for most A/B tests.</span>
            </button>
            <button
              type="button"
              className={`toggle-option ${!twoSided ? 'toggle-option--active' : ''}`}
              onClick={() => onTwoSidedChange(false)}
              aria-pressed={!twoSided}
            >
              <span className="toggle-option-label">One-tailed</span>
              <span className="toggle-option-tooltip">Only detect changes in the expected direction. Requires smaller sample but riskier.</span>
            </button>
          </div>
        </div>

        {/* CUPED Variance Reduction Section */}
        <div className="form-group">
          <div className="cuped-header-row">
            <label htmlFor="cuped-toggle">
              <span className="label-text">CUPED Variance Reduction</span>
              <span className="helper-text">
                Use pre-experiment data to reduce noise
              </span>
            </label>
            <label className="toggle-switch">
              <input
                id="cuped-toggle"
                type="checkbox"
                checked={cupedEnabled}
                onChange={(e) => onCupedEnabledChange(e.target.checked)}
              />
              <span className="toggle-switch-slider" />
            </label>
          </div>

          {cupedEnabled && (
            <div className="cuped-content">
              <div className="cuped-presets">
                {CUPED_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className={`cuped-preset-btn ${
                      Math.abs(correlationInput - preset.correlation) < 0.05 
                        ? 'cuped-preset-btn--active' 
                        : ''
                    }`}
                    onClick={() => applyCupedPreset(preset)}
                  >
                    <span className="cuped-preset-name">{preset.name}</span>
                    <span className="cuped-preset-desc">{preset.description}</span>
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label htmlFor="correlation">
                  <span className="label-text">Pre-experiment correlation (ρ)</span>
                  <span className="helper-text">
                    How strongly pre-experiment data predicts outcomes
                  </span>
                </label>
                <div className="slider-group">
                  <input
                    id="correlation"
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={correlationInput}
                    onChange={(e) => setCorrelationInput(Number(e.target.value))}
                  />
                  <span className="slider-value">{correlationInput.toFixed(2)}</span>
                </div>
              </div>

              <div className="cuped-impact-bar">
                <div className="cuped-impact-track">
                  <div 
                    className="cuped-impact-fill"
                    style={{ width: `${varianceReductionPct}%` }}
                  />
                </div>
                <div className="cuped-impact-info">
                  <span className="cuped-impact-value">~{varianceReductionPct.toFixed(0)}%</span>
                  <span className="cuped-impact-label">variance reduced</span>
                </div>
              </div>

              <Link to="/cuped" className="cuped-learn-link">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 6V10M7 4.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Learn how CUPED works
              </Link>
            </div>
          )}
        </div>

        {recommendedSampleSize && (
          <div className="form-group">
            <div className="sample-override-toggle">
              {!showSampleOverride ? (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setShowSampleOverride(true)}
                >
                  Override sample size
                </button>
              ) : (
                <>
                  <label>
                    <span className="label-text">Custom sample size</span>
                    <span className="helper-text">
                      Recommended: {Math.round(recommendedSampleSize).toLocaleString()} per variant
                    </span>
                  </label>
                  <div className="slider-group">
                    <input
                      type="range"
                      min={minSample}
                      max={maxSample}
                      step="50"
                      value={currentSample}
                      onChange={(e) => handleSampleSizeChange(Number(e.target.value))}
                    />
                    <span className="slider-value">{Math.round(currentSample).toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={resetSampleSize}
                  >
                    Use recommended
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

