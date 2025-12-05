import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { fetchMdeCurve, fetchPowerCurve, fetchSampleSize } from './api'
import { AdvancedSettings } from './components/AdvancedSettings'
import { ExperimentForm } from './components/ExperimentForm'
import { MetricSummary } from './components/MetricSummary'
import { PowerCurveChart } from './components/PowerCurveChart'
import type { Alternative, MdeCurveResponse, PowerCurveResponse, SampleSizeResponse } from './types'

// Derive the alternative hypothesis from twoSided flag and comparison direction
function getAlternative(twoSided: boolean, baselinePct: number, comparisonPct: number): Alternative {
  if (twoSided) return 'two-sided'
  return comparisonPct > baselinePct ? 'greater' : 'less'
}

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [baselinePct, setBaselinePct] = useState(10)
  const [comparisonPct, setComparisonPct] = useState(12)
  const [desiredPower, setDesiredPower] = useState(0.8)
  const [alpha, setAlpha] = useState(0.05)
  const [twoSided, setTwoSided] = useState(true)

  // Results
  const [sampleSizeData, setSampleSizeData] = useState<SampleSizeResponse | null>(null)
  const [powerCurveData, setPowerCurveData] = useState<PowerCurveResponse | null>(null)
  const [mdeCurveData, setMdeCurveData] = useState<MdeCurveResponse | null>(null)
  const [recommendedN, setRecommendedN] = useState<number | null>(null)
  const [sampleSizeOverride, setSampleSizeOverride] = useState<number | null>(null)

  // Auto-calculate when inputs change
  const handleCalculate = useCallback(async () => {
    // Validate inputs
    if (baselinePct <= 0 || baselinePct >= 100) return
    if (comparisonPct <= 0 || comparisonPct >= 100) return
    if (comparisonPct === baselinePct) return

    const alternative = getAlternative(twoSided, baselinePct, comparisonPct)

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Get recommended sample size
      const sampleResult = await fetchSampleSize({
        baselinePct,
        comparisonPct,
        alpha,
        power: desiredPower,
        alternative,
      })

      setSampleSizeData(sampleResult)
      const n = Math.round(sampleResult.sampleSizePerVariant)
      setRecommendedN(n)
      setSampleSizeOverride(null)

      // Step 2: Get power curve with recommended sample size
      const powerResult = await fetchPowerCurve({
        baselinePct,
        comparisonPct,
        sampleSizePerVariant: n,
        alpha,
        alternative,
      })

      setPowerCurveData(powerResult)

      // Step 3: Get MDE trade-off curve
      const mdeResult = await fetchMdeCurve({
        baselinePct,
        alpha,
        power: desiredPower,
        alternative,
        numPoints: 25,
      })

      setMdeCurveData(mdeResult)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while contacting the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [baselinePct, comparisonPct, desiredPower, alpha, twoSided])

  // Trigger calculation when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculate()
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timer)
  }, [handleCalculate])

  const handleSampleSizeOverride = async (newN: number | null) => {
    setSampleSizeOverride(newN)

    if (newN && sampleSizeData) {
      const alternative = getAlternative(twoSided, sampleSizeData.baselinePct, sampleSizeData.comparisonPct)
      
      setIsLoading(true)
      try {
        const powerResult = await fetchPowerCurve({
          baselinePct: sampleSizeData.baselinePct,
          comparisonPct: sampleSizeData.comparisonPct,
          sampleSizePerVariant: newN,
          alpha,
          alternative,
        })
        setPowerCurveData(powerResult)
      } catch {
        setError('Failed to update power curve with new sample size.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>A/B Test Sample Size Calculator</h1>
        <p className="app-subtitle">
          Figure out how many users you need to run a statistically valid experiment.
        </p>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar">
          <div className="sidebar-content">
            <h2>Experiment Setup</h2>
            {error && <div className="error-banner">{error}</div>}

            <ExperimentForm
              baselinePct={baselinePct}
              comparisonPct={comparisonPct}
              onBaselineChange={setBaselinePct}
              onComparisonChange={setComparisonPct}
            />

            <AdvancedSettings
              desiredPower={desiredPower}
              onPowerChange={setDesiredPower}
              alpha={alpha}
              onAlphaChange={setAlpha}
              twoSided={twoSided}
              onTwoSidedChange={setTwoSided}
              sampleSizeOverride={sampleSizeOverride}
              recommendedSampleSize={recommendedN}
              onSampleSizeOverrideChange={handleSampleSizeOverride}
            />
          </div>
        </aside>

        <main className="app-main">
          <MetricSummary sampleSizeData={sampleSizeData} powerCurveData={powerCurveData} />

          <PowerCurveChart 
            data={powerCurveData} 
            mdeCurveData={mdeCurveData}
            sampleSizeData={sampleSizeData}
            loading={isLoading} 
          />
        </main>
      </div>
    </div>
  )
}

export default App
