import math


def detect_ewma(data, alpha=0.1, k=3.0, warmup=5):
    """Flag outliers relative to the prior exponentially weighted mean/variance."""
    if isinstance(alpha, bool) or not isinstance(alpha, (int, float)) or not math.isfinite(alpha) or not 0 < alpha <= 1:
        raise ValueError("alpha must be a finite number in (0, 1]")
    if isinstance(k, bool) or not isinstance(k, (int, float)) or not math.isfinite(k) or k <= 0:
        raise ValueError("k must be a finite positive number")
    if isinstance(warmup, bool) or not isinstance(warmup, int) or warmup < 0:
        raise ValueError("warmup must be a non-negative integer")
    try:
        values = list(data)
    except TypeError as exc:
        raise ValueError("data must be an iterable of finite numbers") from exc
    if not values:
        return []
    if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in values):
        raise ValueError("data must contain only finite numbers")
    mean = float(values[0]); var = 0.0; flags = [False]
    for i, x in enumerate(values[1:], start=1):
        std = math.sqrt(max(0.0, var))
        flags.append(i >= warmup and abs(x - mean) > k * std)
        diff = x - mean; mean += alpha * diff; var = (1 - alpha) * (var + alpha * diff * diff)
    return flags