import { memo, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PowerCurveResponse } from '../types'

interface PowerCurveChartProps {
  data: PowerCurveResponse | null
  loading: boolean
}

type ViewMode = 'simple' | 'detailed'

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: number
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <p className="tooltip-title">{label?.toFixed(2)}% conversion</p>
      <ul className="tooltip-list">
        {payload.map((item) => (
          <li key={item.dataKey} style={{ color: item.color }}>
            <span className="tooltip-label">
              {item.dataKey === 'nullPdf' ? 'No effect' : 'Effect exists'}
            </span>
            <span className="tooltip-value">{item.value.toFixed(3)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SimplePowerMeter({ data }: { data: PowerCurveResponse }) {
  const powerPct = data.power * 100
  const powerLevel = powerPct >= 80 ? 'high' : powerPct >= 60 ? 'medium' : 'low'
  
  const getPowerDescription = () => {
    if (powerPct >= 80) {
      return (
        <>
          <strong>Great!</strong> With {powerPct.toFixed(0)}% power, you have a strong chance of detecting a real 
          difference if your variant truly achieves {data.comparisonPct.toFixed(1)}% conversion.
        </>
      )
    } else if (powerPct >= 60) {
      return (
        <>
          <strong>Acceptable.</strong> With {powerPct.toFixed(0)}% power, you have a moderate chance of detecting 
          a real difference. Consider increasing your sample size for more confidence.
        </>
      )
    } else {
      return (
        <>
          <strong>Low power.</strong> With only {powerPct.toFixed(0)}% power, you may miss a real effect even if 
          it exists. Strongly consider increasing your sample size or expected lift.
        </>
      )
    }
  }

  return (
    <div className="power-meter">
      <div className="power-meter-header">
        <span className="power-meter-label">Statistical Power</span>
        <span className="power-meter-value">{powerPct.toFixed(0)}%</span>
      </div>
      <div className="power-meter-track">
        <div 
          className={`power-meter-fill power-meter-fill--${powerLevel}`}
          style={{ width: `${powerPct}%` }}
        />
      </div>
      <div className="power-meter-description">
        {getPowerDescription()}
      </div>
    </div>
  )
}

function DetailedChart({ data }: { data: PowerCurveResponse }) {
  const points = data.xPct.map((x, i) => ({
    x,
    nullPdf: data.nullPdf[i],
    altPdf: data.altPdf[i],
  }))

  const xMin = Math.min(...data.xPct)
  const xMax = Math.max(...data.xPct)

  return (
    <>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-swatch legend-swatch--null" />
          <span>No effect ({data.baselinePct.toFixed(1)}%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch legend-swatch--alt" />
          <span>Effect exists ({data.comparisonPct.toFixed(1)}%)</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <AreaChart data={points} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <defs>
            <linearGradient id="nullGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

          <XAxis
            dataKey="x"
            type="number"
            domain={[xMin, xMax]}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={{
              value: 'Observed Conversion Rate',
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 11, fill: '#64748b' },
            }}
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
          />

          <YAxis
            label={{
              value: 'Probability Density',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#64748b' },
            }}
            stroke="#94a3b8"
            tickFormatter={(v) => v.toFixed(1)}
            tick={{ fontSize: 11 }}
          />

          <Tooltip content={<ChartTooltip />} />

          {/* Decision threshold line(s) */}
          {data.critHighPct !== null && (
            <ReferenceLine
              x={data.critHighPct}
              stroke="#dc2626"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: data.critLowPct !== null 
                  ? `${data.critHighPct.toFixed(2)}%` 
                  : `Threshold: ${data.critHighPct.toFixed(2)}%`,
                position: 'top',
                fill: '#dc2626',
                fontSize: 10,
              }}
            />
          )}

          {data.critLowPct !== null && (
            <ReferenceLine
              x={data.critLowPct}
              stroke="#dc2626"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: data.critHighPct !== null 
                  ? `${data.critLowPct.toFixed(2)}%` 
                  : `Threshold: ${data.critLowPct.toFixed(2)}%`,
                position: 'top',
                fill: '#dc2626',
                fontSize: 10,
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="nullPdf"
            stroke="#0d9488"
            strokeWidth={2}
            fill="url(#nullGradient)"
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-in-out"
          />

          <Area
            type="monotone"
            dataKey="altPdf"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#altGradient)"
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  )
}

function PowerCurveChartComponent({ data, loading }: PowerCurveChartProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('simple')

  useEffect(() => {
    if (!loading) {
      setShowOverlay(false)
      return
    }
    const timeout = window.setTimeout(() => setShowOverlay(true), 200)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [loading])

  if (!data) {
    return (
      <div className="chart-placeholder">
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 3v18h18" />
          <path d="M18 17l-5-5-3 3-4-4" />
        </svg>
        <p>Enter your experiment parameters to see the power analysis</p>
      </div>
    )
  }

  return (
    <div className={`chart-container${showOverlay ? ' chart-container--updating' : ''}`}>
      {showOverlay && (
        <div className="chart-loading-overlay">
          <div className="spinner-small" />
          <span>Updating…</span>
        </div>
      )}
      
      <div className="chart-header">
        <h3 className="chart-title">
          {viewMode === 'simple' ? 'Power Analysis' : 'Distribution of Outcomes'}
        </h3>
        <div className="chart-view-toggle">
          <button
            type="button"
            className={`chart-view-btn ${viewMode === 'simple' ? 'chart-view-btn--active' : ''}`}
            onClick={() => setViewMode('simple')}
          >
            Simple
          </button>
          <button
            type="button"
            className={`chart-view-btn ${viewMode === 'detailed' ? 'chart-view-btn--active' : ''}`}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </button>
        </div>
      </div>

      {viewMode === 'simple' ? (
        <SimplePowerMeter data={data} />
      ) : (
        <DetailedChart data={data} />
      )}
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const PowerCurveChart = memo(PowerCurveChartComponent)
