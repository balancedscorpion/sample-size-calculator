import type {
  MdeCurveRequest,
  MdeCurveResponse,
  PowerCurveRequest,
  PowerCurveResponse,
  SampleSizeRequest,
  SampleSizeResponse,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function apiCall<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function fetchSampleSize(
  request: SampleSizeRequest
): Promise<SampleSizeResponse> {
  return apiCall<SampleSizeResponse>('/sample-size', request)
}

export async function fetchPowerCurve(
  request: PowerCurveRequest
): Promise<PowerCurveResponse> {
  return apiCall<PowerCurveResponse>('/power-curve', request)
}

export async function fetchMdeCurve(
  request: MdeCurveRequest
): Promise<MdeCurveResponse> {
  return apiCall<MdeCurveResponse>('/mde-curve', request)
}
