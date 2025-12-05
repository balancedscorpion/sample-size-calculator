# Testing Guide

## Overview

The backend uses **pytest** for unit and integration testing. Tests cover:
- Core calculation functions (`powercalculator.py`)
- API endpoints (`api.py`)
- Error handling and validation
- CORS configuration
- Numerical accuracy

## Quick Start

### Install Test Dependencies

```bash
cd backend
poetry install --with dev
```

This installs:
- `pytest` - Testing framework
- `pytest-cov` - Coverage reporting
- `httpx` - Required for FastAPI TestClient

### Run All Tests

```bash
poetry run pytest
```

### Run with Coverage Report

```bash
poetry run pytest --cov=app --cov-report=term-missing
```

### Run Specific Test File

```bash
# Test only calculation functions
poetry run pytest tests/test_powercalculator.py

# Test only API endpoints
poetry run pytest tests/test_api.py
```

### Run Specific Test Class or Function

```bash
# Run a specific test class
poetry run pytest tests/test_powercalculator.py::TestSampleSizeCalculation

# Run a specific test function
poetry run pytest tests/test_api.py::TestPowerCurveEndpoint::test_basic_power_curve_request
```

## Test Organization

### Directory Structure

```
backend/
├── app/
│   ├── api.py                    # FastAPI endpoints
│   └── powercalculator.py        # Core calculations
├── tests/
│   ├── __init__.py
│   ├── test_powercalculator.py   # Unit tests for calculations
│   └── test_api.py               # API integration tests
├── pytest.ini                    # Pytest configuration
└── TESTING.md                    # This file
```

### Test Files

#### `test_powercalculator.py`
Unit tests for core calculation functions:
- `TestSampleSizeCalculation` - Tests for `ab_test_sample_size()`
- `TestPowerCurveProportions` - Tests for `power_curve_proportions()`
- `TestPowerCurvePayload` - Tests for `power_curve_payload()`
- `TestNumericalAccuracy` - Edge cases and numerical stability

#### `test_api.py`
Integration tests for API endpoints:
- `TestPowerCurveEndpoint` - Tests for `POST /power-curve`
- `TestSampleSizeEndpoint` - Tests for `POST /sample-size`
- `TestCORS` - CORS header validation
- `TestAPIDocumentation` - OpenAPI docs accessibility
- `TestErrorHandling` - Error responses
- `TestIntegration` - Multi-endpoint workflows

## Running Tests

### Basic Commands

```bash
# Run all tests
poetry run pytest

# Run with verbose output
poetry run pytest -v

# Run with extra verbose output (show test names as they run)
poetry run pytest -vv

# Run and stop at first failure
poetry run pytest -x

# Run and enter debugger on failure
poetry run pytest --pdb
```

### Coverage Reports

```bash
# Terminal report with missing lines
poetry run pytest --cov=app --cov-report=term-missing

# HTML report (opens in browser)
poetry run pytest --cov=app --cov-report=html
open htmlcov/index.html

# XML report (for CI/CD)
poetry run pytest --cov=app --cov-report=xml
```

### Filtering Tests

```bash
# Run only unit tests
poetry run pytest -m unit

# Run only API tests
poetry run pytest -m api

# Run only fast tests (exclude slow ones)
poetry run pytest -m "not slow"

# Run tests matching a keyword
poetry run pytest -k "sample_size"

# Run tests matching multiple keywords
poetry run pytest -k "sample_size or power_curve"
```

### Parallel Execution

For faster test runs (requires `pytest-xdist`):

```bash
# Install plugin
poetry add --group dev pytest-xdist

# Run tests in parallel (auto-detect CPU count)
poetry run pytest -n auto

# Run tests in parallel (specific number of workers)
poetry run pytest -n 4
```

## Test Coverage

### Current Coverage

Run this to see current coverage:

```bash
poetry run pytest --cov=app --cov-report=term-missing
```

Expected coverage:
- **`powercalculator.py`**: ~95%+ (core logic fully tested)
- **`api.py`**: ~90%+ (endpoints and validation tested)
- **Overall**: ~90%+

### Coverage Goals

- Maintain >90% overall coverage
- 100% coverage for critical calculation functions
- All API endpoints should have at least one happy path test
- All validation rules should have negative test cases

### Viewing Coverage Reports

After running tests with coverage:

```bash
# View HTML report
open htmlcov/index.html
```

The HTML report shows:
- Line-by-line coverage
- Which lines are covered/missed
- Branch coverage
- Function coverage

## Writing New Tests

### Test Structure

Follow the Arrange-Act-Assert pattern:

```python
def test_sample_size_calculation():
    # Arrange - Set up test data
    baseline = 10.0
    comparison = 12.0
    alpha = 0.05
    power = 0.8
    
    # Act - Call the function
    result = ab_test_sample_size(baseline, comparison, alpha, power)
    
    # Assert - Check the result
    assert result > 0
    assert 3000 < result < 4000
```

### Test Naming

Use descriptive names that explain what is being tested:

```python
# Good
def test_larger_effect_needs_smaller_sample():
    ...

def test_invalid_baseline_raises_error():
    ...

# Bad
def test_1():
    ...

def test_edge_case():
    ...
```

### Testing Exceptions

Use `pytest.raises` to test error conditions:

```python
def test_invalid_baseline_raises_error():
    with pytest.raises(ValueError, match="baseline_pct must be between"):
        ab_test_sample_size(0.0, 12.0, 0.05, 0.8)
```

### Testing API Endpoints

Use the `TestClient` fixture:

```python
def test_power_curve_endpoint(client):
    response = client.post(
        "/power-curve",
        json={
            "baselinePct": 10.0,
            "comparisonPct": 12.0,
            "sampleSizePerVariant": 1000,
            "alpha": 0.05,
            "twoSided": True
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "power" in data
```

### Fixtures

Create reusable test data with fixtures:

```python
import pytest

@pytest.fixture
def standard_params():
    """Standard test parameters."""
    return {
        "baseline_pct": 10.0,
        "comparison_pct": 12.0,
        "alpha": 0.05,
        "power": 0.8
    }

def test_with_fixture(standard_params):
    result = ab_test_sample_size(**standard_params)
    assert result > 0
```

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions.

### CI Configuration

See `.github/workflows/test.yml` for the CI configuration.

The CI pipeline:
1. Sets up Python 3.11
2. Installs dependencies with Poetry
3. Runs pytest with coverage
4. Uploads coverage reports
5. Fails if coverage drops below threshold

### Running CI Locally

To simulate CI locally:

```bash
# Install dependencies
poetry install --with dev

# Run tests with coverage
poetry run pytest --cov=app --cov-report=xml

# Check coverage threshold (90%)
poetry run coverage report --fail-under=90
```

## Troubleshooting

### Common Issues

#### Import Errors

If you see `ModuleNotFoundError: No module named 'app'`:

```bash
# Make sure you're in the backend directory
cd backend

# Run tests with poetry
poetry run pytest
```

#### Coverage Not Working

If coverage reports are empty:

```bash
# Make sure pytest-cov is installed
poetry install --with dev

# Run with explicit coverage options
poetry run pytest --cov=app --cov-report=term
```

#### Tests Failing After Code Changes

1. Check if the test expectations need updating
2. Run a single test to isolate the issue:
   ```bash
   poetry run pytest tests/test_api.py::test_basic_power_curve_request -vv
   ```
3. Use `--pdb` to debug:
   ```bash
   poetry run pytest --pdb -x
   ```

### Debugging Tests

```bash
# Print output during tests
poetry run pytest -s

# Show local variables on failure
poetry run pytest --showlocals

# Enter debugger on failure
poetry run pytest --pdb

# Set a breakpoint in test code
def test_something():
    result = calculate()
    import pdb; pdb.set_trace()  # Debugger will stop here
    assert result > 0
```

## Best Practices

### DO

✅ Write tests for new features before implementing them (TDD)
✅ Test both happy paths and error cases
✅ Use descriptive test names
✅ Keep tests independent (no shared state)
✅ Test edge cases and boundary conditions
✅ Mock external dependencies
✅ Aim for >90% coverage

### DON'T

❌ Test implementation details (test behavior, not internals)
❌ Write tests that depend on execution order
❌ Use sleep() or time-based assertions
❌ Commit code without running tests
❌ Ignore failing tests
❌ Write tests that are slower than necessary

## Performance

### Test Execution Time

Current test suite should complete in:
- **Unit tests**: < 1 second
- **API tests**: < 2 seconds
- **All tests**: < 3 seconds

If tests are slower:
1. Check for unnecessary computation
2. Use fixtures to share setup
3. Consider marking slow tests with `@pytest.mark.slow`
4. Run slow tests separately in CI

### Optimizing Slow Tests

```python
# Mark slow tests
@pytest.mark.slow
def test_large_sample_calculation():
    result = ab_test_sample_size(10.0, 10.01, 0.05, 0.99)
    assert result > 0

# Run without slow tests
poetry run pytest -m "not slow"
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Coverage.py Documentation](https://coverage.readthedocs.io/)
- [Python Testing Best Practices](https://docs.python-guide.org/writing/tests/)

## Getting Help

If tests are failing or you need help:

1. Check this guide first
2. Run tests with `-vv` for detailed output
3. Check the test file for examples
4. Review the error message carefully
5. Use `--pdb` to debug interactively

