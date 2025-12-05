import type { PowerCurveResponse } from '../types'

interface InterpretationProps {
  data: PowerCurveResponse | null
}

function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="help-tooltip">
      ?
      <span className="help-tooltip-content">{text}</span>
    </span>
  )
}

export function Interpretation({ data }: InterpretationProps) {
  if (!data) return null

  const powerPct = (data.power * 100).toFixed(0)
  const alphaPct = (data.alpha * 100).toFixed(0)
  const thresholdValue = data.alternative === 'less' ? data.critLowPct : data.critHighPct

  return (
    <div className="interpretation-panel">
      <h3>Quick Reference</h3>
      <ul>
        <li>
          <strong>Power ({powerPct}%)</strong>
          <HelpTooltip text="The probability of correctly detecting a real effect. Higher is better — 80% is the standard target." />
          {' '}— your chance of finding a real difference when one exists.
        </li>
        <li>
          <strong>False positive rate ({alphaPct}%)</strong>
          <HelpTooltip text="The probability of incorrectly declaring a winner when there's no real difference. 5% is the standard threshold." />
          {' '}— risk of a false alarm.
        </li>
        {thresholdValue !== null && (
          <li>
            <strong>Decision threshold: {thresholdValue.toFixed(2)}%</strong>
            <HelpTooltip text="If your observed conversion rate crosses this threshold, the result is statistically significant." />
          </li>
        )}
        {data.alternative === 'two-sided' && data.critLowPct !== null && data.critHighPct !== null && (
          <li>
            <strong>Two-tailed test</strong>
            <HelpTooltip text={`Testing for changes in either direction. Lower threshold: ${data.critLowPct.toFixed(2)}%, Upper: ${data.critHighPct.toFixed(2)}%`} />
            {' '}— detects both increases and decreases.
          </li>
        )}
      </ul>
    </div>
  )
}

