"""
Core power / sample-size calculations for an A/B proportion test.

This version works in the ORIGINAL METRIC (conversion rate) instead of
test-statistic space. The power curve is drawn over possible observed
conversion rates, with one curve for the null mean (baseline) and one
for the alternative mean (comparison).

All percentages are exposed as 0–100 in the public API, but internal
calculations use proportions in 0–1.

The `alternative` parameter controls the type of test:
- "two-sided": detect any change (increase or decrease)
- "greater": one-sided test detecting an increase (p1 > p0)
- "less": one-sided test detecting a decrease (p1 < p0)
"""

from dataclasses import dataclass
from statistics import NormalDist
from typing import Optional, Dict, Literal
import math

import numpy as np

Alternative = Literal["two-sided", "greater", "less"]


@dataclass
class PowerCurveResult:
    # x-axis in proportion units (0–1)
    x: np.ndarray
    null_pdf: np.ndarray
    alt_pdf: np.ndarray

    # decision thresholds in proportion units (0–1)
    crit_low: Optional[float]
    crit_high: float

    # scalar summary
    power: float
    beta: float
    alpha: float

    baseline: float          # p0 in 0–1
    comparison: float        # p1 in 0–1
    sample_size_per_variant: int


# ---------------------------------------------------------------------------
# Sample size calculator (per variant) for an A/B proportion test
# ---------------------------------------------------------------------------


def ab_test_sample_size(
    baseline_pct: float,
    comparison_pct: float,
    alpha: float = 0.05,
    power: float = 0.8,
    alternative: Alternative = "two-sided",
) -> float:
    """
    Sample size per variant for a two-sample proportion test.

    This function uses binary search to find the minimum sample size
    that achieves the target power, using the same statistical model
    as power_curve_proportions to ensure consistency.

    Parameters
    ----------
    baseline_pct : float
        Baseline conversion rate in percent (e.g. 10 for 10%).
    comparison_pct : float
        Expected conversion rate for the variant in percent.
    alpha : float
        Type I error rate.
    power : float
        Desired power (1 - beta).
    alternative : str
        Type of test: "two-sided", "greater" (detect increase), 
        or "less" (detect decrease).

    Returns
    -------
    float
        Required sample size per variant.
    """
    baseline = baseline_pct / 100.0
    comparison = comparison_pct / 100.0

    if not (0.0 < baseline < 1.0):
        raise ValueError("baseline_pct must be between 0 and 100 (exclusive)")
    if not (0.0 < comparison < 1.0):
        raise ValueError("comparison_pct must be between 0 and 100 (exclusive)")

    # Binary search to find n that gives target power
    target_power = power
    MAX_SAMPLE_SIZE = 1_000_000.0
    low, high = 10.0, MAX_SAMPLE_SIZE  # reasonable bounds for per-variant n
    
    # Binary search with 40 iterations gives precision of ~1000000 / 2^40 ≈ 0.001
    for _ in range(40):
        mid = (low + high) / 2.0
        
        # Compute power with this sample size using the same model as power_curve
        result = power_curve_proportions(
            baseline_pct=baseline_pct,
            comparison_pct=comparison_pct,
            sample_size_per_variant=int(mid),
            alpha=alpha,
            alternative=alternative,
            num_points=51,  # fewer points for speed during search
        )
        
        if result.power >= target_power:
            high = mid
        else:
            low = mid
    
    return high  # smallest n that reaches target power


# ---------------------------------------------------------------------------
# Power curve in "conversion rate" space
# ---------------------------------------------------------------------------


def power_curve_proportions(
    baseline_pct: float,
    comparison_pct: float,
    sample_size_per_variant: int,
    alpha: float = 0.05,
    alternative: Alternative = "two-sided",
    num_points: int = 201,
) -> PowerCurveResult:
    """
    Compute power curve for an A/B proportion test, expressed in terms of
    the observed conversion rate (proportion) rather than the standardized
    test statistic.

    We model:
        p_hat | H0 ~ N(p0, p0(1-p0)/n)
        p_hat | H1 ~ N(p1, p1(1-p1)/n)

    Critical region is defined in z-space and mapped back to conversion
    rate units.

    Parameters
    ----------
    baseline_pct : float
        Baseline conversion rate in percent.
    comparison_pct : float
        Expected variant conversion rate in percent.
    sample_size_per_variant : int
        Number of observations per variant (n).
    alpha : float
        Significance level.
    alternative : str
        Type of test: "two-sided", "greater" (detect increase), 
        or "less" (detect decrease).
    num_points : int
        Number of x points to compute for the curve.

    Returns
    -------
    PowerCurveResult
    """
    if sample_size_per_variant <= 0:
        raise ValueError("sample_size_per_variant must be positive")

    p0 = baseline_pct / 100.0
    p1 = comparison_pct / 100.0

    if not (0.0 < p0 < 1.0):
        raise ValueError("baseline_pct must be between 0 and 100 (exclusive)")
    if not (0.0 < p1 < 1.0):
        raise ValueError("comparison_pct must be between 0 and 100 (exclusive)")

    n = float(sample_size_per_variant)

    # Standard errors of the sample proportion under H0 and H1
    se0 = np.sqrt(p0 * (1.0 - p0) / n)
    se1 = np.sqrt(p1 * (1.0 - p1) / n)

    # Critical value(s) in z-space
    std_norm = NormalDist(0, 1)
    if alternative == "two-sided":
        z_crit = std_norm.inv_cdf(1.0 - alpha / 2.0)
    else:
        z_crit = std_norm.inv_cdf(1.0 - alpha)

    # Map critical region back into conversion-rate space
    # and compute beta/power based on alternative hypothesis
    alt_dist = NormalDist(p1, se1)
    
    if alternative == "two-sided":
        # Two-tailed: reject if observed is far from p0 in either direction
        crit_low = p0 - z_crit * se0
        crit_high = p0 + z_crit * se0
        # Beta = P(not rejecting | H1) = P(crit_low < observed < crit_high | H1)
        beta = alt_dist.cdf(crit_high) - alt_dist.cdf(crit_low)
    elif alternative == "greater":
        # Right-tailed: reject if observed > crit_high (detecting increase)
        crit_low = None
        crit_high = p0 + z_crit * se0
        # Beta = P(not rejecting | H1) = P(observed <= crit_high | H1)
        beta = alt_dist.cdf(crit_high)
    else:  # alternative == "less"
        # Left-tailed: reject if observed < crit_low (detecting decrease)
        crit_low = p0 - z_crit * se0
        crit_high = None
        # Beta = P(not rejecting | H1) = P(observed >= crit_low | H1) = 1 - P(observed < crit_low | H1)
        beta = 1.0 - alt_dist.cdf(crit_low)

    # Numerical safety
    beta = float(np.clip(beta, 0.0, 1.0))
    power = 1.0 - beta

    # x-axis range in proportion units
    se_max = max(se0, se1)
    x_min = max(0.0, min(p0, p1) - 4.0 * se_max)
    x_max = min(1.0, max(p0, p1) + 4.0 * se_max)

    x = np.linspace(x_min, x_max, num_points)
    
    # Compute PDF using the normal distribution formula
    # PDF(x) = (1 / (σ * sqrt(2π))) * exp(-0.5 * ((x - μ) / σ)²)
    null_pdf = np.array([
        (1 / (se0 * math.sqrt(2 * math.pi))) * math.exp(-0.5 * ((xi - p0) / se0) ** 2)
        for xi in x
    ])
    alt_pdf = np.array([
        (1 / (se1 * math.sqrt(2 * math.pi))) * math.exp(-0.5 * ((xi - p1) / se1) ** 2)
        for xi in x
    ])

    return PowerCurveResult(
        x=x,
        null_pdf=null_pdf,
        alt_pdf=alt_pdf,
        crit_low=crit_low,
        crit_high=crit_high,
        power=power,
        beta=beta,
        alpha=alpha,
        baseline=p0,
        comparison=p1,
        sample_size_per_variant=sample_size_per_variant,
    )


def power_curve_payload(
    baseline_pct: float,
    comparison_pct: float,
    sample_size_per_variant: int,
    alpha: float = 0.05,
    alternative: Alternative = "two-sided",
    num_points: int = 201,
) -> Dict:
    """
    Convenience wrapper returning a JSON-serializable dict for APIs/front-end.
    All values that represent rates are exposed in percent (0–100).
    """
    result = power_curve_proportions(
        baseline_pct=baseline_pct,
        comparison_pct=comparison_pct,
        sample_size_per_variant=sample_size_per_variant,
        alpha=alpha,
        alternative=alternative,
        num_points=num_points,
    )

    def to_pct(v: Optional[float]) -> Optional[float]:
        return None if v is None else v * 100.0

    return {
        "alpha": result.alpha,
        "baselinePct": baseline_pct,
        "comparisonPct": comparison_pct,
        "sampleSizePerVariant": result.sample_size_per_variant,
        "power": result.power,
        "beta": result.beta,
        "critLowPct": to_pct(result.crit_low),
        "critHighPct": to_pct(result.crit_high),
        "xPct": (result.x * 100.0).tolist(),
        "nullPdf": result.null_pdf.tolist(),
        "altPdf": result.alt_pdf.tolist(),
        "alternative": alternative,
    }
