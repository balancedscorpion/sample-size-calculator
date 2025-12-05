"""
Unit tests for FastAPI endpoints.

Tests cover:
- API request/response validation
- Error handling
- CORS headers
- Edge cases
"""

import pytest
from fastapi.testclient import TestClient
from app.api import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestPowerCurveEndpoint:
    """Tests for POST /power-curve endpoint."""

    def test_basic_power_curve_request(self, client):
        """Test basic power curve request with valid data."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "sampleSizePerVariant": 1000,
                "alpha": 0.05,
                "alternative": "two-sided"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields are present
        required_fields = [
            'alpha', 'baselinePct', 'comparisonPct', 'sampleSizePerVariant',
            'power', 'beta', 'critLowPct', 'critHighPct',
            'xPct', 'nullPdf', 'altPdf', 'alternative'
        ]
        for field in required_fields:
            assert field in data

    def test_power_curve_response_types(self, client):
        """Test that response has correct data types."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "sampleSizePerVariant": 1000,
                "alpha": 0.05,
                "alternative": "two-sided"
            }
        )
        
        data = response.json()
        
        # Scalars should be numbers
        assert isinstance(data['alpha'], float)
        assert isinstance(data['power'], float)
        assert isinstance(data['beta'], float)
        assert isinstance(data['sampleSizePerVariant'], int)
        
        # Arrays should be lists
        assert isinstance(data['xPct'], list)
        assert isinstance(data['nullPdf'], list)
        assert isinstance(data['altPdf'], list)
        
        # Arrays should have same length
        assert len(data['xPct']) == len(data['nullPdf']) == len(data['altPdf'])

    def test_power_curve_with_defaults(self, client):
        """Test power curve with default alpha and twoSided."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "sampleSizePerVariant": 1000
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should use default alpha = 0.05
        assert data['alpha'] == 0.05

    def test_power_curve_one_sided_greater(self, client):
        """Test one-sided power curve for detecting increase."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "sampleSizePerVariant": 1000,
                "alpha": 0.05,
                "alternative": "greater"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # One-sided greater should have null critLowPct
        assert data['critLowPct'] is None
        assert data['critHighPct'] is not None
        assert data['alternative'] == 'greater'

    def test_power_curve_one_sided_less(self, client):
        """Test one-sided power curve for detecting decrease."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 8.0,
                "sampleSizePerVariant": 1000,
                "alpha": 0.05,
                "alternative": "less"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # One-sided less should have null critHighPct
        assert data['critLowPct'] is not None
        assert data['critHighPct'] is None
        assert data['alternative'] == 'less'

    def test_power_curve_invalid_baseline(self, client):
        """Test power curve with invalid baseline."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 0.0,  # Invalid: must be > 0
                "comparisonPct": 12.0,
                "sampleSizePerVariant": 1000,
                "alpha": 0.05,
                "alternative": "two-sided"
            }
        )
        
        assert response.status_code == 422  # Validation error

    def test_power_curve_invalid_comparison(self, client):
        """Test power curve with invalid comparison."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 100.0,  # Invalid: must be < 100
                "sampleSizePerVariant": 1000,
                "alpha": 0.05,
                "alternative": "two-sided"
            }
        )
        
        assert response.status_code == 422

    def test_power_curve_invalid_sample_size(self, client):
        """Test power curve with invalid sample size."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "sampleSizePerVariant": 0,  # Invalid: must be > 0
                "alpha": 0.05,
                "alternative": "two-sided"
            }
        )
        
        assert response.status_code == 422

    def test_power_curve_invalid_alpha(self, client):
        """Test power curve with invalid alpha."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "sampleSizePerVariant": 1000,
                "alpha": 1.5,  # Invalid: must be < 1
                "alternative": "two-sided"
            }
        )
        
        assert response.status_code == 422

    def test_power_curve_missing_required_fields(self, client):
        """Test power curve with missing required fields."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                # Missing comparisonPct and sampleSizePerVariant
            }
        )
        
        assert response.status_code == 422

    def test_power_curve_extreme_values(self, client):
        """Test power curve with extreme but valid values."""
        response = client.post(
            "/power-curve",
            json={
                "baselinePct": 1.0,
                "comparisonPct": 2.0,
                "sampleSizePerVariant": 100000,
                "alpha": 0.001,
                "alternative": "two-sided"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 0 <= data['power'] <= 1


class TestSampleSizeEndpoint:
    """Tests for POST /sample-size endpoint."""

    def test_basic_sample_size_request(self, client):
        """Test basic sample size request with valid data."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 0.8
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields are present
        required_fields = [
            'baselinePct', 'comparisonPct', 'alpha', 'power',
            'sampleSizePerVariant', 'totalSampleSize',
            'absoluteLiftPct', 'relativeLiftPct'
        ]
        for field in required_fields:
            assert field in data

    def test_sample_size_response_types(self, client):
        """Test that response has correct data types."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 0.8
            }
        )
        
        data = response.json()
        
        # All should be numbers
        assert isinstance(data['baselinePct'], float)
        assert isinstance(data['comparisonPct'], float)
        assert isinstance(data['alpha'], float)
        assert isinstance(data['power'], float)
        assert isinstance(data['sampleSizePerVariant'], float)
        assert isinstance(data['totalSampleSize'], float)
        assert isinstance(data['absoluteLiftPct'], float)
        assert isinstance(data['relativeLiftPct'], float)

    def test_sample_size_calculations(self, client):
        """Test that sample size calculations are correct."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 0.8
            }
        )
        
        data = response.json()
        
        # Total should be 2x per variant
        assert abs(data['totalSampleSize'] - 2 * data['sampleSizePerVariant']) < 0.01
        
        # Absolute lift should be difference
        assert abs(data['absoluteLiftPct'] - (12.0 - 10.0)) < 0.01
        
        # Relative lift should be percentage increase
        expected_relative = ((12.0 / 10.0) - 1.0) * 100.0
        assert abs(data['relativeLiftPct'] - expected_relative) < 0.01

    def test_sample_size_with_defaults(self, client):
        """Test sample size with default alpha and power."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should use defaults
        assert data['alpha'] == 0.05
        assert data['power'] == 0.8

    def test_sample_size_one_sided_matches_power(self, client):
        """One-sided configuration should yield smaller n but correct power."""
        params = {
            "baselinePct": 10.0,
            "comparisonPct": 12.0,
            "alpha": 0.05,
            "power": 0.8,
        }

        two_sided_resp = client.post("/sample-size", json={**params, "alternative": "two-sided"})
        one_sided_resp = client.post("/sample-size", json={**params, "alternative": "greater"})

        assert two_sided_resp.status_code == 200
        assert one_sided_resp.status_code == 200

        n_two = two_sided_resp.json()['sampleSizePerVariant']
        n_one = one_sided_resp.json()['sampleSizePerVariant']
        assert n_one < n_two

        power_response = client.post(
            "/power-curve",
            json={
                "baselinePct": params["baselinePct"],
                "comparisonPct": params["comparisonPct"],
                "sampleSizePerVariant": int(n_one),
                "alpha": params["alpha"],
                "alternative": "greater",
            },
        )
        assert power_response.status_code == 200
        assert abs(power_response.json()['power'] - params["power"]) < 0.01

    def test_sample_size_invalid_baseline(self, client):
        """Test sample size with invalid baseline."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": -5.0,  # Invalid
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 0.8
            }
        )
        
        assert response.status_code == 422

    def test_sample_size_invalid_power(self, client):
        """Test sample size with invalid power."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 1.5  # Invalid: must be < 1
            }
        )
        
        assert response.status_code == 422

    def test_sample_size_missing_required_fields(self, client):
        """Test sample size with missing required fields."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                # Missing comparisonPct
            }
        )
        
        assert response.status_code == 422

    def test_sample_size_larger_effect_smaller_n(self, client):
        """Test that larger effects need smaller samples."""
        response_small = client.post(
            "/sample-size",
            json={"baselinePct": 10.0, "comparisonPct": 11.0, "alpha": 0.05, "power": 0.8}
        )
        response_large = client.post(
            "/sample-size",
            json={"baselinePct": 10.0, "comparisonPct": 15.0, "alpha": 0.05, "power": 0.8}
        )
        
        assert response_small.status_code == 200
        assert response_large.status_code == 200
        
        n_small_effect = response_small.json()['sampleSizePerVariant']
        n_large_effect = response_large.json()['sampleSizePerVariant']
        
        assert n_large_effect < n_small_effect


class TestCORS:
    """Tests for CORS configuration."""

    def test_cors_headers_on_post(self, client):
        """Test that CORS headers are present on POST requests."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 0.8
            },
            headers={"Origin": "http://localhost:5173"}
        )
        
        # Should have CORS headers
        assert "access-control-allow-origin" in response.headers

    def test_cors_preflight(self, client):
        """Test CORS preflight OPTIONS request."""
        response = client.options(
            "/sample-size",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type"
            }
        )
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers


class TestAPIDocumentation:
    """Tests for API documentation endpoints."""

    def test_openapi_schema(self, client):
        """Test that OpenAPI schema is accessible."""
        response = client.get("/openapi.json")
        
        assert response.status_code == 200
        schema = response.json()
        
        # Should have basic OpenAPI structure
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema

    def test_docs_endpoint(self, client):
        """Test that /docs endpoint is accessible."""
        response = client.get("/docs")
        
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]


class TestErrorHandling:
    """Tests for error handling."""

    def test_invalid_json(self, client):
        """Test handling of invalid JSON."""
        response = client.post(
            "/sample-size",
            content=b"not valid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422

    def test_wrong_content_type(self, client):
        """Test handling of wrong content type."""
        response = client.post(
            "/sample-size",
            content=b"baselinePct=10&comparisonPct=12",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 422

    def test_empty_body(self, client):
        """Test handling of empty request body."""
        response = client.post(
            "/sample-size",
            json={}
        )
        
        assert response.status_code == 422

    def test_extra_fields_ignored(self, client):
        """Test that extra fields in request are ignored."""
        response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 0.8,
                "extraField": "should be ignored"
            }
        )
        
        # Should still succeed
        assert response.status_code == 200


class TestIntegration:
    """Integration tests combining multiple endpoints."""

    def test_sample_size_then_power_curve(self, client):
        """Test typical workflow: get sample size, then power curve."""
        # Step 1: Get recommended sample size
        sample_response = client.post(
            "/sample-size",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "alpha": 0.05,
                "power": 0.8
            }
        )
        
        assert sample_response.status_code == 200
        sample_data = sample_response.json()
        recommended_n = int(sample_data['sampleSizePerVariant'])
        
        # Step 2: Get power curve with that sample size
        power_response = client.post(
            "/power-curve",
            json={
                "baselinePct": 10.0,
                "comparisonPct": 12.0,
                "sampleSizePerVariant": recommended_n,
                "alpha": 0.05,
                "alternative": "two-sided"
            }
        )
        
        assert power_response.status_code == 200
        power_data = power_response.json()
        
        # Power should match requested 0.8 (within 1% due to rounding)
        assert abs(power_data['power'] - 0.8) < 0.01

    def test_consistency_across_endpoints(self, client):
        """Test that both endpoints return consistent values."""
        params = {
            "baselinePct": 10.0,
            "comparisonPct": 12.0,
            "alpha": 0.05,
        }
        
        # Get from sample-size endpoint
        sample_response = client.post(
            "/sample-size",
            json={**params, "power": 0.8}
        )
        
        # Get from power-curve endpoint
        power_response = client.post(
            "/power-curve",
            json={
                **params,
                "sampleSizePerVariant": int(sample_response.json()['sampleSizePerVariant']),
                "alternative": "two-sided"
            }
        )
        
        sample_data = sample_response.json()
        power_data = power_response.json()
        
        # Alpha should match
        assert sample_data['alpha'] == power_data['alpha']
        
        # Baseline and comparison should match
        assert sample_data['baselinePct'] == power_data['baselinePct']
        assert sample_data['comparisonPct'] == power_data['comparisonPct']

