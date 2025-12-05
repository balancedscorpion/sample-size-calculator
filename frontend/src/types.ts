// Test type: two-sided, one-sided detecting increase, one-sided detecting decrease
export type Alternative = 'two-sided' | 'greater' | 'less'

// Matches backend PowerCurveRequest
export interface PowerCurveRequest {
  baselinePct: number
  comparisonPct: number
  sampleSizePerVariant: number
  alpha: number
  alternative: Alternative
}

// Matches backend PowerCurveResponse
export interface PowerCurveResponse {
  alpha: number
  baselinePct: number
  comparisonPct: number
  sampleSizePerVariant: number
  power: number
  beta: number
  critLowPct: number | null
  critHighPct: number | null
  xPct: number[]
  nullPdf: number[]
  altPdf: number[]
  alternative: Alternative
}

// Matches backend SampleSizeRequest
export interface SampleSizeRequest {
  baselinePct: number
  comparisonPct: number
  alpha: number
  power: number
  alternative: Alternative
}

// Matches backend SampleSizeResponse
export interface SampleSizeResponse {
  baselinePct: number
  comparisonPct: number
  alpha: number
  power: number
  sampleSizePerVariant: number
  totalSampleSize: number
  absoluteLiftPct: number
  relativeLiftPct: number
  exceedsMaxSampleSize: boolean
}

// Matches backend MdeCurveRequest
export interface MdeCurveRequest {
  baselinePct: number
  alpha: number
  power: number
  alternative: Alternative
  numPoints?: number
}

// Matches backend MdeCurvePoint
export interface MdeCurvePoint {
  relativeLiftPct: number
  absoluteLiftPct: number
  comparisonPct: number
  sampleSizePerVariant: number
}

// Matches backend MdeCurveResponse
export interface MdeCurveResponse {
  baselinePct: number
  alpha: number
  power: number
  points: MdeCurvePoint[]
}
