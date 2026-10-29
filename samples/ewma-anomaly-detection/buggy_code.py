import math


def detect_ewma(data, alpha=0.1, k=3.0, warmup=5):
    """Intentionally buggy implementation for testing the app."""
    mean = var = None
    flags = []
    for i, x in enumerate(data):
        if mean is None:
            mean, var = x, 0.0
            flags.append(False)
            continue
        # BUG: invalid alpha/k/warmup are not validated.
        std = math.sqrt(var)
        flags.append(i >= warmup and abs(x - mean) > k * std)
        diff = x - mean
        mean += alpha * diff
        var = (1 - alpha) * (var + alpha * diff * diff)
    return flags
