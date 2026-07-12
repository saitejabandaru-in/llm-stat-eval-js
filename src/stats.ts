/**
 * Computes the error function (erf) using a highly accurate numerical approximation.
 */
export function erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return sign * y;
}

/**
 * Computes the Standard Normal Cumulative Distribution Function (CDF).
 */
export function normalCdf(x: number): number {
    return 0.5 * (1.0 + erf(x / Math.sqrt(2)));
}

/**
 * Computes the Inverse Standard Normal CDF (Quantile function) using Acklam's algorithm.
 */
export function inverseNormalCdf(p: number): number {
    if (p <= 0 || p >= 1) {
        throw new ValueError("probability must be strictly between 0 and 1");
    }

    const a = [
        -3.969683028665376e01,
        2.209460984245205e02,
        -2.759285104469687e02,
        1.383577518672690e02,
        -3.066479806614716e01,
        2.506628277459239e00
    ];
    const b = [
        -5.447609879822406e01,
        1.615858368580409e02,
        -1.556989798598866e02,
        6.680131188771972e01,
        -1.328068155288572e01
    ];
    const c = [
        -7.784894002430293e-03,
        -3.223964580411365e-01,
        -2.400758277161838e00,
        -2.549732539343734e00,
        4.374664141464968e00,
        2.938163982698783e00
    ];
    const d = [
        7.784695709041462e-03,
        3.224671290700398e-01,
        2.445134137142996e00,
        3.754408661907416e00
    ];

    const plow = 0.02425;
    const phigh = 1.0 - plow;

    if (p < plow) {
        const q = Math.sqrt(-2.0 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0
        );
    }
    if (p > phigh) {
        const q = Math.sqrt(-2.0 * Math.log(1.0 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0
        );
    }

    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (
        ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0
    );
}

class ValueError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = "ValueError";
    }
}

/**
 * Computes the fractional (average) ranks of a 1D numeric array.
 * Higher values get higher ranks.
 */
export function fractionalRanks(values: number[]): number[] {
    const n = values.length;
    if (n === 0) return [];

    const indexed = values.map((val, idx) => ({ val, idx }));
    
    // Sort ascending
    indexed.sort((a, b) => a.val - b.val);

    const ranks = new Array<number>(n);
    let i = 0;
    while (i < n) {
        let j = i + 1;
        while (j < n && indexed[j].val === indexed[i].val) {
            j++;
        }
        // Average rank of indices from (i + 1) to j
        const avgRank = (i + 1 + j) / 2.0;
        for (let k = i; k < j; k++) {
            ranks[indexed[k].idx] = avgRank;
        }
        i = j;
    }
    return ranks;
}

/**
 * Helper to compute sample standard deviation (ddof=1)
 */
export function std(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    const meanVal = mean(values);
    const sumSq = values.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0);
    return Math.sqrt(sumSq / (n - 1));
}

/**
 * Helper to compute mean
 */
export function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Helper to compute median
 */
export function median(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    return n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0;
}

/**
 * Helper to compute percentiles (linear interpolation)
 */
export function percentile(sortedValues: number[], pct: number): number {
    const n = sortedValues.length;
    if (n === 0) return 0;
    const pos = (pct / 100.0) * (n - 1);
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    if (lower === upper) return sortedValues[lower];
    const weight = pos - lower;
    return sortedValues[lower] * (1.0 - weight) + sortedValues[upper] * weight;
}
