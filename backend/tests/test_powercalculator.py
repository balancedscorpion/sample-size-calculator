"""
Unit tests for power calculator functions.

Tests cover:
- Sample size calculations
- Power curve generation
- Edge cases and error handling
- Numerical accuracy
"""

import pytest
import numpy as np
from app.powercalculator import (
    ab_test_sample_size,
    power_curve_proportions,
    power_curve_payload,
    PowerCurveResult,
)


class TestSampleSizeCalculation:
    """Tests for ab_test_sample_size function."""

    def test_basic_sample_size(self):
        """Test basic sample size calculation with typical values."""
        n = ab_test_sample_size(
            baseline_pct=10.0,
            comparison_pct=12.0,
            alpha=0.05,
            power=0.8
        )
        
        # Should be a positive number
        assert n > 0
        # Should be reasonable (between 1000 and 10000 for this scenario)
        assert 1000 < n < 10000
        # Should be approximately 1856 (using consistent one-sample model)
        assert abs(n - 1856) < 100
        
        # Verify power is actually 0.8
        result = power_curve_proportions(10.0, 12.0, int(n), 0.05, "two-sided")
        assert abs(result.power - 0.8) < 0.01  # Within 1% of target

    def test_larger_effect_needs_smaller_sample(self):
        """Larger effect sizes should require smaller samples."""
        n_small_effect = ab_test_sample_size(10.0, 11.0, 0.05, 0.8)
        n_large_effect = ab_test_sample_size(10.0, 15.0, 0.05, 0.8)
        
        assert n_large_effect < n_small_effect

    def test_higher_power_needs_larger_sample(self):
        """Higher power requirements should need larger samples."""
        n_low_power = ab_test_sample_size(10.0, 12.0, 0.05, 0.7)
        n_high_power = ab_test_sample_size(10.0, 12.0, 0.05, 0.9)
        
        assert n_high_power > n_low_power

    def test_stricter_alpha_needs_larger_sample(self):
        """Stricter significance levels should need larger samples."""
        n_lenient = ab_test_sample_size(10.0, 12.0, 0.10, 0.8)
        n_strict = ab_test_sample_size(10.0, 12.0, 0.01, 0.8)
        
        assert n_strict > n_lenient

    def test_one_sided_sample_size_matches_target(self):
        """One-sided search should still hit the requested power target."""
        alpha = 0.05
        target_power = 0.8

        n_two_sided = ab_test_sample_size(
            baseline_pct=10.0,
            comparison_pct=12.0,
            alpha=alpha,
            power=target_power,
            alternative="two-sided",
        )
        n_one_sided = ab_test_sample_size(
            baseline_pct=10.0,
            comparison_pct=12.0,
            alpha=alpha,
            power=target_power,
            alternative="greater",
        )

        assert n_one_sided < n_two_sided

        result_one_sided = power_curve_proportions(
            baseline_pct=10.0,
            comparison_pct=12.0,
            sample_size_per_variant=int(n_one_sided),
            alpha=alpha,
            alternative="greater",
        )

        assert abs(result_one_sided.power - target_power) < 0.01
    
    def test_one_sided_less_sample_size(self):
        """One-sided 'less' test should work for detecting decreases."""
        alpha = 0.05
        target_power = 0.8

        n = ab_test_sample_size(
            baseline_pct=12.0,
            comparison_pct=10.0,  # Detecting a decrease
            alpha=alpha,
            power=target_power,
            alternative="less",
        )

        assert n > 0

        result = power_curve_proportions(
            baseline_pct=12.0,
            comparison_pct=10.0,
            sample_size_per_variant=int(n),
            alpha=alpha,
            alternative="less",
        )

        assert abs(result.power - target_power) < 0.01
        assert result.crit_low is not None
        assert result.crit_high is None

    def test_symmetric_effect(self):
        """Sample size should be similar for symmetric effects."""
        n_increase = ab_test_sample_size(10.0, 12.0, 0.05, 0.8)
        n_decrease = ab_test_sample_size(12.0, 10.0, 0.05, 0.8)
        
        # Should be reasonably close (within 15% due to variance differences)
        assert abs(n_increase - n_decrease) / n_increase < 0.15

    def test_invalid_baseline_raises_error(self):
        """Invalid baseline values should raise ValueError."""
        with pytest.raises(ValueError, match="baseline_pct must be between"):
            ab_test_sample_size(0.0, 12.0, 0.05, 0.8)
        
        with pytest.raises(ValueError, match="baseline_pct must be between"):
            ab_test_sample_size(100.0, 12.0, 0.05, 0.8)
        
        with pytest.raises(ValueError, match="baseline_pct must be between"):
            ab_test_sample_size(-5.0, 12.0, 0.05, 0.8)

    def test_invalid_comparison_raises_error(self):
        """Invalid comparison values should raise ValueError."""
        with pytest.raises(ValueError, match="comparison_pct must be between"):
            ab_test_sample_size(10.0, 0.0, 0.05, 0.8)
        
        with pytest.raises(ValueError, match="comparison_pct must be between"):
            ab_test_sample_size(10.0, 100.0, 0.05, 0.8)

    def test_extreme_values(self):
        """Test with extreme but valid values."""
        # Very small baseline
        n_small = ab_test_sample_size(1.0, 2.0, 0.05, 0.8)
        assert n_small > 0
        
        # Very large baseline
        n_large = ab_test_sample_size(90.0, 92.0, 0.05, 0.8)
        assert n_large > 0


class TestPowerCurveProportions:
    """Tests for power_curve_proportions function."""

    def test_basic_power_curve(self):
        """Test basic power curve generation."""
        result = power_curve_proportions(
            baseline_pct=10.0,
            comparison_pct=12.0,
            sample_size_per_variant=1000,
            alpha=0.05,
            alternative="two-sided"
        )
        
        assert isinstance(result, PowerCurveResult)
        assert len(result.x) == 201  # default num_points
        assert len(result.null_pdf) == 201
        assert len(result.alt_pdf) == 201

    def test_power_curve_properties(self):
        """Test that power curve has expected properties."""
        result = power_curve_proportions(10.0, 12.0, 1000, 0.05, "two-sided")
        
        # Power should be between 0 and 1
        assert 0 <= result.power <= 1
        assert 0 <= result.beta <= 1
        
        # Power + beta should equal 1
        assert abs(result.power + result.beta - 1.0) < 1e-10
        
        # Alpha should match input
        assert result.alpha == 0.05
        
        # Baseline and comparison should be in proportion units (0-1)
        assert abs(result.baseline - 0.10) < 1e-10
        assert abs(result.comparison - 0.12) < 1e-10

    def test_critical_values(self):
        """Test that critical values are reasonable."""
        result = power_curve_proportions(10.0, 12.0, 1000, 0.05, "two-sided")
        
        # Two-sided test should have both critical values
        assert result.crit_low is not None
        assert result.crit_high is not None
        
        # Critical values should bracket the baseline
        assert result.crit_low < result.baseline < result.crit_high
        
        # Critical values should be in valid proportion range
        assert 0 <= result.crit_low <= 1
        assert 0 <= result.crit_high <= 1

    def test_one_sided_greater_test(self):
        """Test one-sided greater test configuration."""
        result = power_curve_proportions(10.0, 12.0, 1000, 0.05, alternative="greater")
        
        # One-sided greater test should have only upper critical value
        assert result.crit_low is None
        assert result.crit_high is not None
        
        # Power should generally be higher for one-sided tests
        result_two_sided = power_curve_proportions(10.0, 12.0, 1000, 0.05, "two-sided")
        assert result.power > result_two_sided.power

    def test_one_sided_less_test(self):
        """Test one-sided less test configuration."""
        result = power_curve_proportions(12.0, 10.0, 1000, 0.05, alternative="less")
        
        # One-sided less test should have only lower critical value
        assert result.crit_low is not None
        assert result.crit_high is None
        
        # Power should be reasonable
        assert 0 < result.power < 1

    def test_pdf_properties(self):
        """Test that PDFs have expected properties."""
        result = power_curve_proportions(10.0, 12.0, 1000, 0.05, "two-sided")
        
        # PDFs should be non-negative
        assert np.all(result.null_pdf >= 0)
        assert np.all(result.alt_pdf >= 0)
        
        # PDFs should have reasonable peak values (not too large)
        assert np.max(result.null_pdf) < 100
        assert np.max(result.alt_pdf) < 100
        
        # PDFs should integrate to approximately 1 (using trapezoidal rule)
        null_integral = np.trapezoid(result.null_pdf, result.x)
        alt_integral = np.trapezoid(result.alt_pdf, result.x)
        
        # Allow some numerical error
        assert abs(null_integral - 1.0) < 0.1
        assert abs(alt_integral - 1.0) < 0.1

    def test_x_axis_range(self):
        """Test that x-axis covers appropriate range."""
        result = power_curve_proportions(10.0, 12.0, 1000, 0.05, "two-sided")
        
        # X should be sorted
        assert np.all(np.diff(result.x) > 0)
        
        # X should include both means
        assert result.x.min() < result.baseline < result.x.max()
        assert result.x.min() < result.comparison < result.x.max()
        
        # X should be in valid proportion range
        assert result.x.min() >= 0
        assert result.x.max() <= 1

    def test_larger_sample_increases_power(self):
        """Larger sample sizes should increase power."""
        result_small = power_curve_proportions(10.0, 12.0, 500, 0.05, "two-sided")
        result_large = power_curve_proportions(10.0, 12.0, 2000, 0.05, "two-sided")
        
        assert result_large.power > result_small.power

    def test_custom_num_points(self):
        """Test custom number of points for curve."""
        result = power_curve_proportions(
            10.0, 12.0, 1000, 0.05, "two-sided", num_points=101
        )
        
        assert len(result.x) == 101
        assert len(result.null_pdf) == 101
        assert len(result.alt_pdf) == 101

    def test_invalid_sample_size_raises_error(self):
        """Invalid sample sizes should raise ValueError."""
        with pytest.raises(ValueError, match="sample_size_per_variant must be positive"):
            power_curve_proportions(10.0, 12.0, 0, 0.05, "two-sided")
        
        with pytest.raises(ValueError, match="sample_size_per_variant must be positive"):
            power_curve_proportions(10.0, 12.0, -100, 0.05, "two-sided")

    def test_invalid_percentages_raise_error(self):
        """Invalid percentage values should raise ValueError."""
        with pytest.raises(ValueError, match="baseline_pct must be between"):
            power_curve_proportions(0.0, 12.0, 1000, 0.05, "two-sided")
        
        with pytest.raises(ValueError, match="comparison_pct must be between"):
            power_curve_proportions(10.0, 100.0, 1000, 0.05, "two-sided")


class TestPowerCurvePayload:
    """Tests for power_curve_payload function (API wrapper)."""

    def test_basic_payload(self):
        """Test basic payload generation."""
        payload = power_curve_payload(
            baseline_pct=10.0,
            comparison_pct=12.0,
            sample_size_per_variant=1000,
            alpha=0.05,
            alternative="two-sided"
        )
        
        # Check all required keys are present
        required_keys = [
            'alpha', 'baselinePct', 'comparisonPct', 'sampleSizePerVariant',
            'power', 'beta', 'critLowPct', 'critHighPct',
            'xPct', 'nullPdf', 'altPdf', 'alternative'
        ]
        for key in required_keys:
            assert key in payload

    def test_payload_types(self):
        """Test that payload values have correct types."""
        payload = power_curve_payload(10.0, 12.0, 1000, 0.05, "two-sided")
        
        # Scalars should be float
        assert isinstance(payload['alpha'], float)
        assert isinstance(payload['baselinePct'], float)
        assert isinstance(payload['comparisonPct'], float)
        assert isinstance(payload['power'], float)
        assert isinstance(payload['beta'], float)
        
        # Sample size should be int
        assert isinstance(payload['sampleSizePerVariant'], int)
        
        # Arrays should be lists
        assert isinstance(payload['xPct'], list)
        assert isinstance(payload['nullPdf'], list)
        assert isinstance(payload['altPdf'], list)

    def test_payload_percentage_conversion(self):
        """Test that payload converts proportions to percentages."""
        payload = power_curve_payload(10.0, 12.0, 1000, 0.05, "two-sided")
        
        # Input percentages should be preserved
        assert payload['baselinePct'] == 10.0
        assert payload['comparisonPct'] == 12.0
        
        # Critical values should be in percentage units (0-100)
        assert 0 < payload['critHighPct'] < 100
        if payload['critLowPct'] is not None:
            assert 0 < payload['critLowPct'] < 100
        
        # X-axis should be in percentage units
        assert all(0 <= x <= 100 for x in payload['xPct'])

    def test_payload_array_lengths(self):
        """Test that all arrays have consistent lengths."""
        payload = power_curve_payload(10.0, 12.0, 1000, 0.05, "two-sided", num_points=151)
        
        assert len(payload['xPct']) == 151
        assert len(payload['nullPdf']) == 151
        assert len(payload['altPdf']) == 151

    def test_payload_one_sided_greater(self):
        """Test payload for one-sided greater test."""
        payload = power_curve_payload(10.0, 12.0, 1000, 0.05, alternative="greater")
        
        # One-sided greater test should have null critLowPct
        assert payload['critLowPct'] is None
        assert payload['critHighPct'] is not None
        assert payload['alternative'] == 'greater'

    def test_payload_one_sided_less(self):
        """Test payload for one-sided less test."""
        payload = power_curve_payload(12.0, 10.0, 1000, 0.05, alternative="less")
        
        # One-sided less test should have null critHighPct
        assert payload['critLowPct'] is not None
        assert payload['critHighPct'] is None
        assert payload['alternative'] == 'less'

    def test_payload_serializable(self):
        """Test that payload is JSON-serializable."""
        import json
        
        payload = power_curve_payload(10.0, 12.0, 1000, 0.05, "two-sided")
        
        # Should not raise any exceptions
        json_str = json.dumps(payload)
        assert isinstance(json_str, str)
        
        # Should be able to deserialize
        deserialized = json.loads(json_str)
        assert deserialized['baselinePct'] == 10.0


class TestNumericalAccuracy:
    """Tests for numerical accuracy and edge cases."""

    def test_very_small_effect(self):
        """Test with very small effect size."""
        result = power_curve_proportions(10.0, 10.1, 5000, 0.05, "two-sided")
        
        # Should still produce valid results
        assert 0 <= result.power <= 1
        assert np.all(np.isfinite(result.null_pdf))
        assert np.all(np.isfinite(result.alt_pdf))

    def test_very_large_sample(self):
        """Test with very large sample size."""
        result = power_curve_proportions(10.0, 12.0, 100000, 0.05, "two-sided")
        
        # Power should be very high with large sample
        assert result.power > 0.99
        
        # PDFs should still be well-behaved
        assert np.all(np.isfinite(result.null_pdf))
        assert np.all(np.isfinite(result.alt_pdf))

    def test_extreme_alpha(self):
        """Test with extreme alpha values."""
        # Very strict alpha
        result_strict = power_curve_proportions(10.0, 12.0, 1000, 0.001, "two-sided")
        assert 0 <= result_strict.power <= 1
        
        # Very lenient alpha
        result_lenient = power_curve_proportions(10.0, 12.0, 1000, 0.20, "two-sided")
        assert 0 <= result_lenient.power <= 1
        
        # Lenient alpha should give higher power
        assert result_lenient.power > result_strict.power

    def test_baseline_near_boundaries(self):
        """Test with baseline near 0% or 100%."""
        # Near 0%
        result_low = power_curve_proportions(1.0, 2.0, 5000, 0.05, "two-sided")
        assert 0 <= result_low.power <= 1
        assert np.all(np.isfinite(result_low.null_pdf))
        
        # Near 100%
        result_high = power_curve_proportions(98.0, 99.0, 5000, 0.05, "two-sided")
        assert 0 <= result_high.power <= 1
        assert np.all(np.isfinite(result_high.null_pdf))

    def test_consistency_across_runs(self):
        """Test that results are consistent across multiple runs."""
        results = [
            power_curve_proportions(10.0, 12.0, 1000, 0.05, "two-sided")
            for _ in range(5)
        ]
        
        # All runs should produce identical results
        for i in range(1, 5):
            assert results[i].power == results[0].power
            assert np.array_equal(results[i].x, results[0].x)
            assert np.array_equal(results[i].null_pdf, results[0].null_pdf)

