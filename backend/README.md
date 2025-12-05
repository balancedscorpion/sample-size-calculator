# Backend – Power Calculator API

A FastAPI backend for calculating A/B test sample sizes and power curves.

## Prerequisites

- Python 3.9+ (works with Python 3.13)

## Getting Started

### Option 1: Using pip (recommended)

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .

# Start the server
uvicorn app.api:app --reload --port 8000
```

### Option 2: Using Poetry

```bash
cd backend

# Install dependencies
poetry install

# Start the server
poetry run uvicorn app.api:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/power-curve` | Calculate power curve data for visualization |
| POST | `/sample-size` | Calculate required sample size for an experiment |

## Running Tests

```bash
# Install dev dependencies first
pip install -e ".[dev]"

# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html
```

## Project Structure

```
backend/
├── app/
│   ├── api.py              # FastAPI routes
│   └── powercalculator.py  # Core calculation logic
├── tests/                  # Test files
├── pyproject.toml          # Dependencies and project config
└── pytest.ini              # Pytest configuration
```
