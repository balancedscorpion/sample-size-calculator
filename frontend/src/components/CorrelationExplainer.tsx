import { useMemo } from 'react'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import './CorrelationExplainer.css'

interface CorrelationExplainerProps {
  correlation: number
  onCorrelationChange: (value: number) => void
}

// Generate correlated data points
function generateCorrelatedData(
  correlation: number,
  numPoints: number = 80
): Array<{ pre: number; post: number }> {
  const data: Array<{ pre: number; post: number }> = []
  
  // Use a simple method to generate correlated data
  // For visual demonstration purposes
  for (let i = 0; i < numPoints; i++) {
    // Generate independent random values
    const u1 = Math.random()
    const u2 = Math.random()
    
    // Box-Muller transform for normal distribution
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
    
    // Create correlated pair
    const pre = z1
    const post = correlation * z1 + Math.sqrt(1 - correlation * correlation) * z2
    
    // Scale to percentage range (centered around 10%)
    data.push({
      pre: 10 + pre * 2.5,
      post: 12 + post * 2.5,
    })
  }
  
  return data
}

export function CorrelationExplainer({ correlation, onCorrelationChange }: CorrelationExplainerProps) {
  // Generate scatter data based on correlation
  const scatterData = useMemo(() => {
    // Use a seeded approach for consistent visualization
    return generateCorrelatedData(correlation, 60)
  }, [correlation])

  // Calculate the correlation strength description
  const getCorrelationDescription = () => {
    if (correlation < 0.4) return { label: 'Weak', color: 'var(--color-slate-500)' }
    if (correlation < 0.7) return { label: 'Moderate', color: 'var(--color-accent)' }
    return { label: 'Strong', color: 'var(--color-primary)' }
  }

  const correlationDesc = getCorrelationDescription()

  return (
    <div className="correlation-explainer">
      <div className="correlation-explainer-header">
        <div className="correlation-explainer-info">
          <span className="correlation-explainer-label">Correlation Strength</span>
          <span 
            className="correlation-explainer-strength"
            style={{ color: correlationDesc.color }}
          >
            {correlationDesc.label} (ρ = {correlation.toFixed(2)})
          </span>
        </div>
        <div className="correlation-explainer-slider">
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={correlation}
            onChange={(e) => onCorrelationChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="correlation-explainer-chart">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            
            <XAxis
              type="number"
              dataKey="pre"
              name="Pre-experiment"
              domain={[2, 18]}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              label={{
                value: 'Pre-experiment Conversion Rate',
                position: 'bottom',
                offset: 10,
                style: { fontSize: 11, fill: '#64748b' },
              }}
            />
            
            <YAxis
              type="number"
              dataKey="post"
              name="During experiment"
              domain={[4, 20]}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              label={{
                value: 'During Experiment',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fontSize: 11, fill: '#64748b' },
              }}
            />

            {/* Trend line (approximate) */}
            <ReferenceLine
              segment={[
                { x: 5, y: 7 + correlation * 5 },
                { x: 15, y: 12 + correlation * 5 },
              ]}
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const data = payload[0].payload
                return (
                  <div className="correlation-tooltip">
                    <p>Pre: {data.pre.toFixed(1)}%</p>
                    <p>During: {data.post.toFixed(1)}%</p>
                  </div>
                )
              }}
            />

            <Scatter
              data={scatterData}
              fill="var(--color-primary)"
              fillOpacity={0.6}
              stroke="var(--color-primary)"
              strokeWidth={1}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="correlation-explainer-legend">
        <div className="correlation-legend-item">
          <span className="correlation-legend-dot" />
          <span>Each dot = one user</span>
        </div>
        <div className="correlation-legend-item">
          <span className="correlation-legend-line" />
          <span>Trend line</span>
        </div>
      </div>

      <p className="correlation-explainer-description">
        {correlation >= 0.7 ? (
          <>
            <strong>High correlation!</strong> Users who converted more before the experiment 
            tend to convert more during it too. CUPED can "subtract out" this predictable 
            behavior, leaving only the effect of your experiment.
          </>
        ) : correlation >= 0.5 ? (
          <>
            <strong>Moderate correlation.</strong> There's a decent relationship between 
            pre and post behavior. CUPED will help reduce variance, but there's room for 
            improvement with better predictive data.
          </>
        ) : (
          <>
            <strong>Weak correlation.</strong> Pre-experiment data doesn't strongly predict 
            experiment outcomes. CUPED will help a little, but consider finding more 
            predictive covariates for better results.
          </>
        )}
      </p>
    </div>
  )
}

