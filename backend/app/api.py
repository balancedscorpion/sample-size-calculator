"""
FastAPI layer exposing the power / sample-size calculations
from power_calculator.py.

Endpoints
---------
POST /power-curve
    -> data for plotting null & alternative distributions over conversion rate.

POST /sample-size
    -> required sample size per variant + lift summaries.
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


# For local development:
#   uvicorn api:app --reload
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
