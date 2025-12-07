import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CupedDemo } from '../components/CupedDemo'
import { CorrelationExplainer } from '../components/CorrelationExplainer'
import './CupedEducation.css'

export function CupedEducation() {
  const [correlation, setCorrelation] = useState(0.7)

  return (
    <div className="cuped-page">
      {/* Navigation */}
      <nav className="cuped-nav">
        <Link to="/" className="cuped-nav-back">
          ← Back to Calculator
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="cuped-hero">
        <div className="cuped-hero-content">
          <h1 className="cuped-hero-title">
            What is <span className="cuped-highlight">CUPED</span>?
          </h1>
          <p className="cuped-hero-subtitle">
            A powerful technique that uses what you already know about your users
            to detect smaller effects faster—without needing more traffic.
          </p>
        </div>
        <div className="cuped-hero-visual">
          <div className="cuped-hero-curves">
            <svg viewBox="0 0 400 200" className="cuped-hero-svg">
              {/* Wide distribution (without CUPED) */}
              <path
                d="M 50,180 Q 100,180 150,100 Q 200,20 250,100 Q 300,180 350,180"
                fill="none"
                stroke="var(--color-slate-300)"
                strokeWidth="3"
                strokeDasharray="8 4"
                className="curve-without"
              />
              {/* Narrow distribution (with CUPED) */}
              <path
                d="M 120,180 Q 150,180 175,80 Q 200,0 225,80 Q 250,180 280,180"
                fill="url(#cuped-gradient)"
                stroke="var(--color-primary)"
                strokeWidth="3"
                className="curve-with"
              />
              <defs>
                <linearGradient id="cuped-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.05" />
                </linearGradient>
              </defs>
            </svg>
            <div className="cuped-hero-labels">
              <span className="cuped-hero-label cuped-hero-label--without">Without CUPED</span>
              <span className="cuped-hero-label cuped-hero-label--with">With CUPED</span>
            </div>
          </div>
        </div>
      </header>

      {/* The Problem Section */}
      <section className="cuped-section">
        <div className="cuped-section-header">
          <span className="cuped-section-number">01</span>
          <h2 className="cuped-section-title">The Problem: Noise Hides Real Effects</h2>
        </div>
        <div className="cuped-section-content">
          <p className="cuped-prose">
            When you run an A/B test, you're trying to detect a signal (the real effect of your change) 
            in a sea of noise (random variation in user behavior).
          </p>
          <div className="cuped-callout">
            <div className="cuped-callout-icon">💡</div>
            <div className="cuped-callout-text">
              <strong>The challenge:</strong> Some users just naturally convert more than others—regardless 
              of which variant they see. This natural variation makes it harder to tell if your change 
              actually made a difference.
            </div>
          </div>
          <p className="cuped-prose">
            Traditional approaches to this problem? Run longer experiments or get more users. 
            But what if you could simply <em>remove</em> some of that noise?
          </p>
        </div>
      </section>

      {/* The Insight Section */}
      <section className="cuped-section cuped-section--alt">
        <div className="cuped-section-header">
          <span className="cuped-section-number">02</span>
          <h2 className="cuped-section-title">The Insight: You Already Know Your Users</h2>
        </div>
        <div className="cuped-section-content">
          <p className="cuped-prose">
            Here's the key insight: you have <strong>pre-experiment data</strong> about your users. 
            You know how they behaved before the experiment started.
          </p>
          <div className="cuped-examples">
            <div className="cuped-example">
              <div className="cuped-example-icon">📊</div>
              <div className="cuped-example-text">
                <strong>Last week's conversion rate</strong>
                <span>Users who converted last week are likely to convert this week too</span>
              </div>
            </div>
            <div className="cuped-example">
              <div className="cuped-example-icon">👆</div>
              <div className="cuped-example-text">
                <strong>Historical engagement</strong>
                <span>Active users tend to stay active; inactive ones tend to stay inactive</span>
              </div>
            </div>
            <div className="cuped-example">
              <div className="cuped-example-icon">💰</div>
              <div className="cuped-example-text">
                <strong>Past revenue</strong>
                <span>Big spenders tend to keep spending; frugal users stay frugal</span>
              </div>
            </div>
          </div>
          <p className="cuped-prose">
            CUPED uses this historical data to "explain away" the variation that would have 
            happened regardless of your experiment. What remains is a cleaner signal of your 
            treatment effect.
          </p>
        </div>
      </section>

      {/* Interactive Correlation Section */}
      <section className="cuped-section">
        <div className="cuped-section-header">
          <span className="cuped-section-number">03</span>
          <h2 className="cuped-section-title">How Correlation Powers CUPED</h2>
        </div>
        <div className="cuped-section-content">
          <p className="cuped-prose">
            The magic of CUPED depends on how well your pre-experiment data predicts user behavior 
            during the experiment. We measure this with <strong>correlation (ρ)</strong>.
          </p>
          
          <CorrelationExplainer correlation={correlation} onCorrelationChange={setCorrelation} />
          
          <div className="cuped-formula-simple">
            <div className="cuped-formula-label">Variance Reduction</div>
            <div className="cuped-formula-value">
              ~{Math.round(correlation * correlation * 100)}%
            </div>
            <div className="cuped-formula-explanation">
              With ρ = {correlation.toFixed(2)}, you can remove about {Math.round(correlation * correlation * 100)}% 
              of the noise from your experiment
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="cuped-section cuped-section--alt">
        <div className="cuped-section-header">
          <span className="cuped-section-number">04</span>
          <h2 className="cuped-section-title">See CUPED in Action</h2>
        </div>
        <div className="cuped-section-content">
          <p className="cuped-prose">
            Watch how CUPED tightens your distributions, making it easier to detect real effects. 
            Adjust the correlation to see how stronger pre-experiment predictors give you more power.
          </p>
          
          <CupedDemo correlation={correlation} onCorrelationChange={setCorrelation} />
        </div>
      </section>

      {/* Practical Guidance Section */}
      <section className="cuped-section">
        <div className="cuped-section-header">
          <span className="cuped-section-number">05</span>
          <h2 className="cuped-section-title">When to Use CUPED</h2>
        </div>
        <div className="cuped-section-content">
          <div className="cuped-guidance-grid">
            <div className="cuped-guidance-card cuped-guidance-card--good">
              <h3>✓ Great for CUPED</h3>
              <ul>
                <li>Returning users with behavioral history</li>
                <li>Metrics with stable user-level patterns</li>
                <li>E-commerce with repeat customers</li>
                <li>SaaS with engagement data</li>
              </ul>
            </div>
            <div className="cuped-guidance-card cuped-guidance-card--bad">
              <h3>✗ Less Suitable</h3>
              <ul>
                <li>Brand new users with no history</li>
                <li>Highly volatile metrics</li>
                <li>One-time conversion events</li>
                <li>Experiments on new features with no baseline</li>
              </ul>
            </div>
          </div>
          
          <div className="cuped-typical-values">
            <h3>Typical Correlation Values</h3>
            <div className="cuped-typical-grid">
              <div className="cuped-typical-item">
                <span className="cuped-typical-range">0.3 - 0.5</span>
                <span className="cuped-typical-desc">Weak predictive power</span>
              </div>
              <div className="cuped-typical-item">
                <span className="cuped-typical-range">0.5 - 0.7</span>
                <span className="cuped-typical-desc">Moderate (common)</span>
              </div>
              <div className="cuped-typical-item cuped-typical-item--highlight">
                <span className="cuped-typical-range">0.7 - 0.9</span>
                <span className="cuped-typical-desc">Strong (ideal)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cuped-cta">
        <h2>Ready to reduce your sample sizes?</h2>
        <p>Enable CUPED in the calculator to see how much faster you can run experiments.</p>
        <Link to="/?cuped=true" className="cuped-cta-btn">
          Try it in the Calculator →
        </Link>
      </section>

      {/* Footer */}
      <footer className="cuped-footer">
        <p>
          Based on the paper: "Improving the Sensitivity of Online Controlled Experiments 
          by Utilizing Pre-Experiment Data" by Deng et al. (Microsoft, 2013)
        </p>
      </footer>
    </div>
  )
}

