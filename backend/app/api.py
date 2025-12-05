"""
FastAPI layer exposing the power / sample-size calculations
from power_calculator.py.

Endpoints
---------
POST /power-curve
    -> data for plotting null & alternative distributions over conversion rate.

POST /sample-size
    -> required sample size per variant + lift summaries.

POST /mde-curve
    -> data for plotting sample size vs MDE trade-off curve.
"""

from typing import List, Literal, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.powercalculator import (
    ab_test_sample_size,
    power_curve_payload,
)

Alternative = Literal["two-sided", "greater", "less"]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class PowerCurveRequest(BaseModel):
    baselinePct: float = Field(..., gt=0, lt=100)
    comparisonPct: float = Field(..., gt=0, lt=100)
    sampleSizePerVariant: int = Field(..., gt=0)
    alpha: float = Field(0.05, gt=0, lt=1)
    alternative: Alternative = "two-sided"


class PowerCurveResponse(BaseModel):
    alpha: float
    baselinePct: float
    comparisonPct: float
    sampleSizePerVariant: int
    power: float
    beta: float
    critLowPct: Optional[float]
    critHighPct: Optional[float]
    xPct: List[float]
    nullPdf: List[float]
    altPdf: List[float]
    alternative: Alternative


class SampleSizeRequest(BaseModel):
    baselinePct: float = Field(..., gt=0, lt=100)
    comparisonPct: float = Field(..., gt=0, lt=100)
    alpha: float = Field(0.05, gt=0, lt=1)
    power: float = Field(0.8, gt=0, lt=1)
    alternative: Alternative = "two-sided"


class SampleSizeResponse(BaseModel):
    baselinePct: float
    comparisonPct: float
    alpha: float
    power: float
    sampleSizePerVariant: float
    totalSampleSize: float
    absoluteLiftPct: float
    relativeLiftPct: float
    exceedsMaxSampleSize: bool = False  # True if >1M per variant would be needed


class MdeCurveRequest(BaseModel):
    baselinePct: float = Field(..., gt=0, lt=100)
    alpha: float = Field(0.05, gt=0, lt=1)
    power: float = Field(0.8, gt=0, lt=1)
    alternative: Alternative = "two-sided"
    numPoints: int = Field(20, ge=5, le=50)


class MdeCurvePoint(BaseModel):
    relativeLiftPct: float  # e.g., 5, 10, 20
    absoluteLiftPct: float  # e.g., 0.5, 1.0, 2.0
    comparisonPct: float
    sampleSizePerVariant: float


class MdeCurveResponse(BaseModel):
    baselinePct: float
    alpha: float
    power: float
    points: List[MdeCurvePoint]


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="A/B Power & Sample Size API", version="0.2.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/power-curve", response_model=PowerCurveResponse)
def get_power_curve(payload: PowerCurveRequest):
    """
    Returns data needed to plot two distributions over the observed
    conversion rate:

    - H0: distribution of observed conversion if baseline is true
    - H1: distribution if comparison change is true

    The x-axis (`xPct`) is in percent units, matching baseline /
    comparison inputs.
    """
    result = power_curve_payload(
        baseline_pct=payload.baselinePct,
        comparison_pct=payload.comparisonPct,
        sample_size_per_variant=payload.sampleSizePerVariant,
        alpha=payload.alpha,
        alternative=payload.alternative,
    )
    return result


MAX_SAMPLE_SIZE_PER_VARIANT = 1_000_000


@app.post("/sample-size", response_model=SampleSizeResponse)
def calculate_sample_size(req: SampleSizeRequest):
    """
    Returns required sample size per variant for an A/B proportion test,
    plus absolute and relative lift summaries.

    If the required sample size exceeds 1,000,000 per variant, the response
    will indicate this via the exceedsMaxSampleSize flag.
    """
    n_per_variant = ab_test_sample_size(
        baseline_pct=req.baselinePct,
        comparison_pct=req.comparisonPct,
        alpha=req.alpha,
        power=req.power,
        alternative=req.alternative,
    )

    absolute_lift = req.comparisonPct - req.baselinePct
    relative_lift = (req.comparisonPct / req.baselinePct - 1.0) * 100.0

    # Check if sample size exceeds the practical maximum
    exceeds_max = n_per_variant >= MAX_SAMPLE_SIZE_PER_VARIANT * 0.99  # 99% threshold

    return SampleSizeResponse(
        baselinePct=req.baselinePct,
        comparisonPct=req.comparisonPct,
        alpha=req.alpha,
        power=req.power,
        sampleSizePerVariant=n_per_variant,
        totalSampleSize=n_per_variant * 2.0,
        absoluteLiftPct=absolute_lift,
        relativeLiftPct=relative_lift,
        exceedsMaxSampleSize=exceeds_max,
    )


@app.post("/mde-curve", response_model=MdeCurveResponse)
def get_mde_curve(req: MdeCurveRequest):
    """
    Returns data for plotting the trade-off between MDE (Minimum Detectable Effect)
    and required sample size.

    Computes sample sizes for a range of relative lifts from 1% to 100%,
    showing how sample size requirements decrease as MDE increases.
    """
    import numpy as np

    # Generate relative lift percentages from 1% to 100% (logarithmic scale for better distribution)
    relative_lifts = np.geomspace(1, 100, req.numPoints).tolist()

    points = []
    for rel_lift in relative_lifts:
        # Calculate comparison rate from relative lift
        comparison_pct = req.baselinePct * (1 + rel_lift / 100.0)

        # Skip if comparison would exceed 100%
        if comparison_pct >= 100:
            continue

        # Calculate required sample size
        n_per_variant = ab_test_sample_size(
            baseline_pct=req.baselinePct,
            comparison_pct=comparison_pct,
            alpha=req.alpha,
            power=req.power,
            alternative=req.alternative,
        )

        # Skip if sample size exceeds practical maximum
        if n_per_variant >= MAX_SAMPLE_SIZE_PER_VARIANT:
            continue

        absolute_lift = comparison_pct - req.baselinePct

        points.append(
            MdeCurvePoint(
                relativeLiftPct=rel_lift,
                absoluteLiftPct=absolute_lift,
                comparisonPct=comparison_pct,
                sampleSizePerVariant=n_per_variant,
            )
        )

    return MdeCurveResponse(
        baselinePct=req.baselinePct,
        alpha=req.alpha,
        power=req.power,
        points=points,
    )


# For local development:
#   uvicorn api:app --reload
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
