/**
 * Computes the error function (erf) using a highly accurate numerical approximation.
 */
export declare function erf(x: number): number;
/**
 * Computes the Standard Normal Cumulative Distribution Function (CDF).
 */
export declare function normalCdf(x: number): number;
/**
 * Computes the Inverse Standard Normal CDF (Quantile function) using Acklam's algorithm.
 */
export declare function inverseNormalCdf(p: number): number;
/**
 * Computes the fractional (average) ranks of a 1D numeric array.
 * Higher values get higher ranks.
 */
export declare function fractionalRanks(values: number[]): number[];
/**
 * Helper to compute sample standard deviation (ddof=1)
 */
export declare function std(values: number[]): number;
/**
 * Helper to compute mean
 */
export declare function mean(values: number[]): number;
/**
 * Helper to compute median
 */
export declare function median(values: number[]): number;
/**
 * Helper to compute percentiles (linear interpolation)
 */
export declare function percentile(sortedValues: number[], pct: number): number;
