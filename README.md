# A/B Test Power Calculator

An intuitive, non-technical-first power-curve visualization and sample-size planning toolkit. Built with a FastAPI backend and a React + TypeScript frontend featuring interactive charts.

## Project Structure

- `backend/` – FastAPI service exposing `/power-curve` and `/sample-size` endpoints
- `frontend/` – Vite + React SPA with responsive charts, plain-language forms, and live summaries

---

## Quick Start with Docker

The easiest way to run the full application locally:

```bash
# Build and run with Docker Compose
docker compose up --build

# Or build and run manually
docker build -t ab-test-calculator .
docker run -p 8000:8000 ab-test-calculator
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Deploy to Cloud Platforms

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Connect your GitHub repository
2. Railway will auto-detect the `railway.json` configuration
3. Deploy!

### Fly.io

```bash
# Install flyctl, then:
fly launch --no-deploy
fly deploy
```

### Render

1. Connect your GitHub repository on [render.com](https://render.com)
2. Select "Blueprint" and point to `render.yaml`
3. Deploy!

---

## Local Development (without Docker)

### Backend (FastAPI)

### Prerequisites

- Python 3.10+
- Poetry (for dependency management)

### Install & Run

```bash
cd backend
poetry install
poetry run uvicorn app.api:app --reload --port 8000
```

Open the interactive API docs at `http://127.0.0.1:8000/docs`.

### API Endpoints

| Endpoint | Body | Description |
| --- | --- | --- |
| `POST /power-curve` | `{ "baselinePct": 10, "comparisonPct": 12, "sampleSizePerVariant": 1000, "alpha": 0.05, "twoSided": true }` | Returns power, beta, critical values, and curve data for visualization. X-axis is in conversion rate (%). |
| `POST /sample-size` | `{ "baselinePct": 10, "comparisonPct": 12, "alpha": 0.05, "power": 0.8 }` | Returns required sample size per variant plus absolute/relative lift metadata. |

Both endpoints accept `application/json` and respond with JSON.

---

## Frontend (React + Vite)

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
cd frontend
npm install
npm run dev
```

By default the app calls `http://127.0.0.1:8000`. Override the backend URL by creating `frontend/.env` with:

```
VITE_API_BASE_URL=http://your-backend-host:8000
```

### Production Build

```
cd frontend
npm run build
npm run preview  # optional smoke test
```

---

## Features

### Non-Technical First Design

- **Plain-language labels**: No jargon in the main interface
- **Visual intuition**: Two overlapping distributions showing "what we'd see if there's no effect" vs "what we'd see if the uplift is real"
- **Conversion-rate axis**: X-axis displays actual conversion percentages, not standardized test statistics
- **Single-screen clarity**: All key information visible at once

### Advanced Settings (for statisticians)

- Toggle between one-sided and two-sided tests
- Adjust significance level (α)
- Override recommended sample size to explore power trade-offs

### Interactive Visualization

- Real-time power curve updates as you adjust parameters
- Clear decision thresholds marked on the chart
- Detailed interpretation panel explaining what the chart means
- Metric summary cards showing sample size, power, and false positive rate

## Testing

### Backend Tests

The backend has comprehensive unit and integration tests using pytest.

```bash
cd backend
poetry install --with dev
poetry run pytest
```

See [`backend/TESTING.md`](backend/TESTING.md) for detailed testing documentation.

### Test Coverage

- **Target**: >85% code coverage
- **Current**: ~95% (core functions fully tested)
- Tests run automatically on every push and pull request

### Continuous Integration

GitHub Actions automatically runs tests before any merge to `main`:
- ✅ Runs full test suite
- ✅ Verifies code coverage threshold
- ✅ Tests on Python 3.11
- ✅ Generates coverage reports

See [`.github/workflows/backend-ci.yml`](.github/workflows/backend-ci.yml) for CI configuration.

## Development Notes

- CORS is enabled in the backend for local development
- Both apps are independent; deploy the FastAPI service as an API and host the static frontend wherever you prefer
- The frontend uses Recharts for the overlapping distributions and highlights rejection regions with clear visual cues

