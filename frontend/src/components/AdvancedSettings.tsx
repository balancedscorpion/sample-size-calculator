import { useEffect, useRef, useState, useCallback } from 'react'

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
}: AdvancedSettingsProps) {
  const [showSampleOverride, setShowSampleOverride] = useState(false)
  const [powerInput, setPowerInput] = useState(desiredPower)
  const [alphaInput, setAlphaInput] = useState(alpha)

  // Track the last value we sent to parent to avoid sync loops
  const lastSentPower = useRef(desiredPower)
  const lastSentAlpha = useRef(alpha)

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

