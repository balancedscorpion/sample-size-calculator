import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './CupedDemo.css'

interface CupedDemoProps {
  correlation: number
  onCorrelationChange: (value: number) => void
}

// Generate normal distribution PDF points
function normalPDF(x: number, mean: number, stdDev: number): number {
  const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2)
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent)
}

export function CupedDemo({ correlation, onCorrelationChange }: CupedDemoProps) {
  // Calculate variance reduction
  const varianceReductionFactor = Math.sqrt(1 - correlation * correlation)
  const varianceReductionPct = (1 - varianceReductionFactor * varianceReductionFactor) * 100
  
  // Generate distribution data
  const distributionData = useMemo(() => {
    const baseStdDev = 0.02 // Base standard deviation (without CUPED)
    const cupedStdDev = baseStdDev * varianceReductionFactor
    
    const mean = 0.12 // 12% conversion rate
    const points: Array<{
      x: number
      xPct: string
      withoutCuped: number
      withCuped: number
    }> = []
    
    // Generate points across the range
    const range = 0.08 // ±4% from mean
    const numPoints = 100
    
    for (let i = 0; i <= numPoints; i++) {
      const x = mean - range / 2 + (range * i) / numPoints
      points.push({
        x,
        xPct: `${(x * 100).toFixed(1)}%`,
        withoutCuped: normalPDF(x, mean, baseStdDev),
        withCuped: normalPDF(x, mean, cupedStdDev),
      })
    }
    
    return points
  }, [varianceReductionFactor])

  // Calculate sample size savings
  const baseSampleSize = 10000
  const cupedSampleSize = Math.round(baseSampleSize * (1 - correlation * correlation))
  const sampleSavingsPct = Math.round((1 - cupedSampleSize / baseSampleSize) * 100)

  return (
    <div className="cuped-demo">
      <div className="cuped-demo-controls">
        <div className="cuped-demo-slider">
          <label htmlFor="demo-correlation">
            <span className="cuped-demo-slider-label">Pre-experiment Correlation (ρ)</span>
            <span className="cuped-demo-slider-value">{correlation.toFixed(2)}</span>
          </label>
          <input
            id="demo-correlation"
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={correlation}
            onChange={(e) => onCorrelationChange(Number(e.target.value))}
          />
          <div className="cuped-demo-slider-marks">
            <span>Weak</span>
            <span>Moderate</span>
            <span>Strong</span>
          </div>
        </div>
      </div>

      <div className="cuped-demo-chart">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="withoutCupedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="withCupedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              label={{
                value: 'Observed Conversion Rate',
                position: 'bottom',
                offset: 0,
                style: { fontSize: 11, fill: '#64748b' },
              }}
            />

            <YAxis
              stroke="#94a3b8"
              tickFormatter={() => ''}
              tick={{ fontSize: 11 }}
              label={{
                value: 'Probability',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#64748b' },
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="cuped-demo-tooltip">
                    <p className="cuped-demo-tooltip-title">
                      {payload[0]?.payload?.xPct} conversion
                    </p>
                  </div>
                )
              }}
            />

            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span style={{ color: '#475569', fontSize: '0.8125rem' }}>
                  {value === 'withoutCuped' ? 'Without CUPED' : 'With CUPED'}
                </span>
              )}
            />

            <Area
              type="monotone"
              dataKey="withoutCuped"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#withoutCupedGradient)"
              isAnimationActive={true}
              animationDuration={500}
            />

            <Area
              type="monotone"
              dataKey="withCuped"
              stroke="#0d9488"
              strokeWidth={2.5}
              fill="url(#withCupedGradient)"
              isAnimationActive={true}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="cuped-demo-stats">
        <div className="cuped-demo-stat">
          <span className="cuped-demo-stat-value">{varianceReductionPct.toFixed(0)}%</span>
          <span className="cuped-demo-stat-label">Variance Reduced</span>
        </div>
        <div className="cuped-demo-stat-divider" />
        <div className="cuped-demo-stat">
          <span className="cuped-demo-stat-value">{sampleSavingsPct}%</span>
          <span className="cuped-demo-stat-label">Fewer Users Needed</span>
        </div>
        <div className="cuped-demo-stat-divider" />
        <div className="cuped-demo-stat">
          <span className="cuped-demo-stat-value">
            {cupedSampleSize.toLocaleString()}
          </span>
          <span className="cuped-demo-stat-label">
            vs {baseSampleSize.toLocaleString()} users
          </span>
        </div>
      </div>

      <div className="cuped-demo-insight">
        <div className="cuped-demo-insight-icon">💡</div>
        <div className="cuped-demo-insight-text">
          <strong>What this means:</strong> The tighter green curve shows your experiment results 
          with CUPED. Because there's less noise, you can detect smaller differences between 
          control and treatment—or reach the same confidence with fewer users.
        </div>
      </div>
    </div>
  )
}

