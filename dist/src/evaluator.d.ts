export interface BootstrapResult {
    metricIdx: number;
    observed: number;
    confLow: number;
    confHigh: number;
    confidenceLevel: number;
    resamples: number[];
}
export declare class LLMEvaluator {
    nResamples: number;
    confidenceLevel: number;
    seed: number | null;
    constructor(nResamples?: number, confidenceLevel?: number, seed?: number | null);
    /**
     * Compute bootstrap confidence intervals for LLM metrics.
     */
    bootstrapCi(scores: number[] | number[][], metric?: "mean" | "median" | "std" | ((x: number[]) => number), method?: "percentile" | "basic"): BootstrapResult[];
}
