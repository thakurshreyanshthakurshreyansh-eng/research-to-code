from solution import ewma_anomaly_detection

def test_empty_values():
    assert ewma_anomaly_detection([], alpha=0.5, threshold=2.0) == []

def test_constant_values_not_flagged():
    result = ewma_anomaly_detection([10, 10, 10], alpha=0.5, threshold=2.0)
    assert len(result) == 3
    assert not any(item.get("anomaly", False) for item in result)

if __name__ == "__main__":
    test_empty_values()
    test_constant_values_not_flagged()
    print("Sample tests passed")
