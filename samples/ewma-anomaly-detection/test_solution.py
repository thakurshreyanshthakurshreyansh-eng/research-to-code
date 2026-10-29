import pytest
from solution import detect_ewma


def test_empty_input():
    assert detect_ewma([]) == []


def test_constant_series_has_no_anomalies():
    assert detect_ewma([5.0] * 50) == [False] * 50


def test_large_spike_is_detected():
    data = [1.0, 1.1, 0.9] * 10 + [50.0]
    flags = detect_ewma(data)
    assert len(flags) == len(data)
    assert flags[-1] is True


def test_alpha_must_be_valid():
    with pytest.raises(ValueError):
        detect_ewma([1, 2, 3], alpha=1.5)
    with pytest.raises(ValueError):
        detect_ewma([1, 2, 3], alpha=0)
    with pytest.raises(ValueError):
        detect_ewma([1, 2, 3], alpha=float("nan"))


def test_k_must_be_positive():
    with pytest.raises(ValueError):
        detect_ewma([1, 2, 3], k=0)
    with pytest.raises(ValueError):
        detect_ewma([1, 2, 3], k=float("inf"))


def test_warmup_must_be_nonnegative_integer():
    with pytest.raises(ValueError):
        detect_ewma([1, 2, 3], warmup=-1)
    with pytest.raises(ValueError):
        detect_ewma([1, 2, 3], warmup=True)


def test_non_finite_input_rejected():
    with pytest.raises(ValueError):
        detect_ewma([1, float("nan"), 3])


def test_output_length_matches_input():
    values = [1.0, 2.0, 3.0, 2.5, 2.4, 2.6]
    assert len(detect_ewma(values)) == len(values)


def test_generator_input_is_supported():
    values = (x for x in [1.0, 2.0, 3.0, 4.0])
    assert len(detect_ewma(values)) == 4


def test_boolean_values_are_not_numeric_sensor_readings():
    with pytest.raises(ValueError):
        detect_ewma([1, True, 3])
