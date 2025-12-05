import { useState, useEffect } from 'react'

interface ExperimentFormProps {
  baselinePct: number
  comparisonPct: number
  onBaselineChange: (value: number) => void
  onComparisonChange: (value: number) => void
}

function LiftBadge({ baseline, comparison }: { baseline: number; comparison: number }) {
  const absoluteLift = comparison - baseline
  const relativeLift = baseline > 0 ? ((comparison - baseline) / baseline) * 100 : 0
  const isPositive = absoluteLift > 0
  const isValid = baseline > 0 && comparison > 0 && baseline !== comparison

  if (!isValid) return null

  return (
    <div className="lift-badge">
      <div className="lift-badge-item">
        <div className={`lift-badge-value ${isPositive ? 'lift-badge-value--positive' : 'lift-badge-value--negative'}`}>
          {isPositive ? '+' : ''}{absoluteLift.toFixed(1)}pp
        </div>
        <div className="lift-badge-label">Absolute</div>
      </div>
      <div className="lift-badge-divider" />
      <div className="lift-badge-item">
        <div className={`lift-badge-value ${isPositive ? 'lift-badge-value--positive' : 'lift-badge-value--negative'}`}>
          {isPositive ? '+' : ''}{relativeLift.toFixed(1)}%
        </div>
        <div className="lift-badge-label">Relative</div>
      </div>
    </div>
  )
}

export function ExperimentForm({
  baselinePct,
  comparisonPct,
  onBaselineChange,
  onComparisonChange,
}: ExperimentFormProps) {
  const [baselineInput, setBaselineInput] = useState(baselinePct.toString())
  const [comparisonInput, setComparisonInput] = useState(comparisonPct.toString())
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync input fields with props
  useEffect(() => {
    setBaselineInput(baselinePct.toString())
  }, [baselinePct])

  useEffect(() => {
    setComparisonInput(comparisonPct.toString())
  }, [comparisonPct])

  const validate = (baseline: number, comparison: number) => {
    const newErrors: Record<string, string> = {}

    if (isNaN(baseline) || baseline <= 0 || baseline >= 100) {
      newErrors.baseline = 'Enter a value between 0% and 100%'
    }
    if (isNaN(comparison) || comparison <= 0 || comparison >= 100) {
      newErrors.comparison = 'Enter a value between 0% and 100%'
    }
    if (comparison === baseline) {
      newErrors.comparison = 'Must differ from current rate'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleBaselineChange = (value: string) => {
    setBaselineInput(value)
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      validate(numValue, comparisonPct)
      onBaselineChange(numValue)
    }
  }

  const handleComparisonChange = (value: string) => {
    setComparisonInput(value)
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      validate(baselinePct, numValue)
      onComparisonChange(numValue)
    }
  }

  return (
    <div className="experiment-form">
      <div className="form-group">
        <label htmlFor="baseline">
          <span className="label-text">What's your current conversion rate?</span>
          <span className="helper-text">
            The baseline rate your control group achieves today
          </span>
        </label>
        <div className="input-with-suffix">
          <input
            id="baseline"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={baselineInput}
            onChange={(e) => handleBaselineChange(e.target.value)}
            className={errors.baseline ? 'input-error' : ''}
            placeholder="e.g. 10"
          />
          <span className="input-suffix">%</span>
        </div>
        {errors.baseline && <span className="error-text">{errors.baseline}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="comparison">
          <span className="label-text">What rate do you expect to achieve?</span>
          <span className="helper-text">
            The conversion rate you hope your variant will hit
          </span>
        </label>
        <div className="input-with-suffix">
          <input
            id="comparison"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={comparisonInput}
            onChange={(e) => handleComparisonChange(e.target.value)}
            className={errors.comparison ? 'input-error' : ''}
            placeholder="e.g. 12"
          />
          <span className="input-suffix">%</span>
        </div>
        {errors.comparison && <span className="error-text">{errors.comparison}</span>}
      </div>

      <LiftBadge baseline={baselinePct} comparison={comparisonPct} />
    </div>
  )
}

