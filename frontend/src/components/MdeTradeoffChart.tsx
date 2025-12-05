import { memo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
} from 'recharts'
import type { MdeCurveResponse, SampleSizeResponse } from '../types'

interface SensitivityChartProps {
  data: MdeCurveResponse | null
  sampleSizeData: SampleSizeResponse | null
}

type LiftViewMode = 'relative' | 'absolute'

function ChartTooltip({
  active,
  payload,
  liftMode,
}: {
  active?: boolean
  payload?: Array<{ payload: { relativeLiftPct: number; absoluteLiftPct: number; sampleSizePerVariant: number; isCurrentPoint?: boolean } }>
  liftMode: LiftViewMode
}) {
  if (!active || !payload?.length) return null

  const point = payload[0].payload
  const liftValue = liftMode === 'relative' 
    ? `${point.relativeLiftPct.toFixed(1)}%` 
    : `${point.absoluteLiftPct.toFixed(2)}pp`
  const isCurrentPoint = point.isCurrentPoint

  return (
    <div className={`chart-tooltip ${isCurrentPoint ? 'chart-tooltip--current' : ''}`}>
      {isCurrentPoint && (
        <div className="tooltip-badge">Your Settings</div>
      )}
      <p className="tooltip-title">
        {Math.round(point.sampleSizePerVariant).toLocaleString()} users/variant
      </p>
      <ul className="tooltip-list">
        <li>
          <span className="tooltip-label">Detectable effect</span>
          <span className="tooltip-value">{liftValue}</span>
        </li>
        <li>
          <span className="tooltip-label">Total sample size</span>
          <span className="tooltip-value">{Math.round(point.sampleSizePerVariant * 2).toLocaleString()}</span>
        </li>
      </ul>
    </div>
  )
}

/**
 * Embeddable sensitivity chart (no container wrapper).
 * Shows "If I have X users, what effect can I detect?"
 * Inverted axes: X = sample size, Y = MDE
 */
function SensitivityChartComponent({ data, sampleSizeData }: SensitivityChartProps) {
  const [liftMode, setLiftMode] = useState<LiftViewMode>('relative')

  if (!data || data.points.length === 0) {
    return (
      <div className="sensitivity-empty">
        <p>Not enough data to show sensitivity analysis</p>
      </div>
    )
  }

  // Current user settings
  const currentSampleSize = sampleSizeData?.sampleSizePerVariant ?? 0
  const currentLift = liftMode === 'relative' 
    ? sampleSizeData?.relativeLiftPct ?? 0
    : sampleSizeData?.absoluteLiftPct ?? 0

  // Calculate zoomed domain: 0.25x to 4x of current sample size
  const minSampleSize = Math.max(100, Math.floor(currentSampleSize * 0.25))
  const maxSampleSize = Math.ceil(currentSampleSize * 4)

  // Filter and transform data for inverted axes
  // X = sample size, Y = MDE (lift)
  const chartData = data.points
    .filter(point => 
      point.sampleSizePerVariant >= minSampleSize && 
      point.sampleSizePerVariant <= maxSampleSize
    )
    .map((point) => ({
      ...point,
      xValue: point.sampleSizePerVariant,
      yValue: liftMode === 'relative' ? point.relativeLiftPct : point.absoluteLiftPct,
    }))
    .sort((a, b) => a.xValue - b.xValue) // Sort by sample size ascending

  // If we don't have enough filtered data, use all data
  const baseChartData = chartData.length >= 3 ? chartData : data.points.map((point) => ({
    ...point,
    xValue: point.sampleSizePerVariant,
    yValue: liftMode === 'relative' ? point.relativeLiftPct : point.absoluteLiftPct,
  })).sort((a, b) => a.xValue - b.xValue)

  // Inject the current point into the data so it's hoverable
  // This ensures the tooltip works even if the current point falls between data intervals
  const finalChartData = sampleSizeData ? (() => {
    const currentPoint = {
      relativeLiftPct: sampleSizeData.relativeLiftPct,
      absoluteLiftPct: sampleSizeData.absoluteLiftPct,
      sampleSizePerVariant: sampleSizeData.sampleSizePerVariant,
      comparisonPct: sampleSizeData.comparisonPct,
      xValue: sampleSizeData.sampleSizePerVariant,
      yValue: liftMode === 'relative' ? sampleSizeData.relativeLiftPct : sampleSizeData.absoluteLiftPct,
      isCurrentPoint: true,
    }
    // Add current point and re-sort
    const withCurrentPoint = [...baseChartData.map(p => ({ ...p, isCurrentPoint: false })), currentPoint]
    return withCurrentPoint.sort((a, b) => a.xValue - b.xValue)
  })() : baseChartData.map(p => ({ ...p, isCurrentPoint: false }))

  const yAxisLabel = liftMode === 'relative' ? 'Detectable Effect (%)' : 'Detectable Effect (pp)'
  const formatYAxis = (value: number) => 
    liftMode === 'relative' ? `${value.toFixed(0)}%` : `${value.toFixed(1)}pp`
  const formatXAxis = (value: number) => 
    value >= 1000 ? `${Math.round(value / 1000)}k` : Math.round(value).toString()

  // Calculate Y domain with some padding
  const yValues = finalChartData.map(d => d.yValue)
  const yMin = Math.max(0, Math.min(...yValues) * 0.8)
  const yMax = Math.max(...yValues) * 1.1

  return (
    <div className="sensitivity-chart">
      <div className="sensitivity-header">
        <p className="sensitivity-description">
          Shows what effect size you can reliably detect based on your traffic. 
          More traffic lets you detect smaller effects.
        </p>
        <div className="chart-view-toggle">
          <button
            type="button"
            className={`chart-view-btn ${liftMode === 'relative' ? 'chart-view-btn--active' : ''}`}
            onClick={() => setLiftMode('relative')}
          >
            Relative %
          </button>
          <button
            type="button"
            className={`chart-view-btn ${liftMode === 'absolute' ? 'chart-view-btn--active' : ''}`}
            onClick={() => setLiftMode('absolute')}
          >
            Absolute pp
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={finalChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <defs>
            <linearGradient id="sensitivityGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

          <XAxis
            dataKey="xValue"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxis}
            label={{
              value: 'Sample Size per Variant',
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 11, fill: '#64748b' },
            }}
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
          />

          <YAxis
            dataKey="yValue"
            type="number"
            domain={[yMin, yMax]}
            tickFormatter={formatYAxis}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#64748b' },
            }}
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
          />

          <Tooltip content={<ChartTooltip liftMode={liftMode} />} />

          {/* Current position reference lines */}
          {sampleSizeData && (
            <>
              <ReferenceLine
                x={currentSampleSize}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={currentLift}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            </>
          )}

          <Line
            type="monotone"
            dataKey="yValue"
            stroke="url(#sensitivityGradient)"
            strokeWidth={3}
            dot={(props) => {
              const { cx, cy, payload } = props
              if (payload?.isCurrentPoint) {
                // Render the orange current point marker
                return (
                  <circle
                    key={`current-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={3}
                    style={{ cursor: 'pointer' }}
                  />
                )
              }
              // No dot for regular points
              return <circle key={`dot-${cx}-${cy}`} r={0} />
            }}
            activeDot={(props) => {
              const { cx, cy, payload } = props
              if (payload?.isCurrentPoint) {
                // Larger active state for current point
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={3}
                    style={{ cursor: 'pointer' }}
                  />
                )
              }
              // Show a small dot on hover for other points
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#0d9488"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )
            }}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>

      {sampleSizeData && (
        <div className="sensitivity-current">
          <div className="sensitivity-current-marker" />
          <span className="sensitivity-current-text">
            <strong>Your settings:</strong>{' '}
            {Math.round(sampleSizeData.sampleSizePerVariant).toLocaleString()} users/variant{' '}
            detects{' '}
            {liftMode === 'relative' 
              ? `${sampleSizeData.relativeLiftPct.toFixed(1)}%`
              : `${sampleSizeData.absoluteLiftPct.toFixed(2)}pp`
            }{' '}lift
          </span>
        </div>
      )}

      <div className="sensitivity-hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M2 12h20" />
        </svg>
        <span>Move right on the curve to see what smaller effects you could detect with more traffic</span>
      </div>
    </div>
  )
}

export const SensitivityChart = memo(SensitivityChartComponent)
