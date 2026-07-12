import { mean, median, std, percentile } from "./stats";

export interface BootstrapResult {
    metricIdx: number;
    observed: number;
    confLow: number;
    confHigh: number;
    confidenceLevel: number;
    resamples: number[];
}

export class LLMEvaluator {
    public nResamples: number;
    public confidenceLevel: number;
    public seed: number | null;

    constructor(
        nResamples: number = 1000,
        confidenceLevel: number = 0.95,
        seed: number | null = null
    ) {
        if (confidenceLevel <= 0 || confidenceLevel >= 1) {
            throw new Error("confidenceLevel must be strictly between 0 and 1");
        }
        if (nResamples < 50) {
            throw new Error("nResamples must be at least 50");
        }
        this.nResamples = nResamples;
        this.confidenceLevel = confidenceLevel;
        this.seed = seed;
    }

    /**
     * Compute bootstrap confidence intervals for LLM metrics.
     */
    public bootstrapCi(
        scores: number[] | number[][],
        metric: "mean" | "median" | "std" | ((x: number[]) => number) = "mean",
        method: "percentile" | "basic" = "percentile"
    ): BootstrapResult[] {
        // Convert to 2D array representation for uniform handling
        let data: number[][];
        if (Array.isArray(scores[0])) {
            data = scores as number[][];
        } else {
            data = (scores as number[]).map(val => [val]);
        }

        const nSamples = data.length;
        if (nSamples < 5) {
            throw new Error("Must have at least 5 samples to bootstrap");
        }
        const nMetrics = data[0].length;

        // Setup metric function
        let metricFunc: (x: number[]) => number;
        if (typeof metric === "string") {
            if (metric === "mean") metricFunc = mean;
            else if (metric === "median") metricFunc = median;
            else if (metric === "std") metricFunc = std;
            else throw new Error(`Unknown metric: ${metric}`);
        } else {
            metricFunc = metric;
        }

        const alpha = 1.0 - this.confidenceLevel;
        const results: BootstrapResult[] = [];

        // Seeded random number generator
        let randomState = this.seed !== null ? this.seed : Math.floor(Math.random() * 1000000);
        const lcgRandom = () => {
            randomState = (1103515245 * randomState + 12345) % 2147483648;
            return randomState / 2147483648;
        };

        for (let d = 0; d < nMetrics; d++) {
            // Extract column and filter out non-finite values
            const colData = data.map(row => row[d]).filter(val => typeof val === "number" && !isNaN(val) && isFinite(val));
            const nColSamples = colData.length;

            if (nColSamples < 5) {
                results.push({
                    metricIdx: d,
                    observed: colData.length > 0 ? metricFunc(colData) : NaN,
                    confLow: NaN,
                    confHigh: NaN,
                    confidenceLevel: this.confidenceLevel,
                    resamples: []
                });
                continue;
            }

            const observed = metricFunc(colData);
            const resampledStats: number[] = [];

            for (let b = 0; b < this.nResamples; b++) {
                const sample: number[] = [];
                for (let i = 0; i < nColSamples; i++) {
                    const randIdx = Math.floor(lcgRandom() * nColSamples);
                    sample.push(colData[randIdx]);
                }
                resampledStats.push(metricFunc(sample));
            }

            resampledStats.sort((a, b) => a - b);

            const lowPct = (alpha / 2.0) * 100.0;
            const highPct = (1.0 - alpha / 2.0) * 100.0;

            const thetaLow = percentile(resampledStats, lowPct);
            const thetaHigh = percentile(resampledStats, highPct);

            let confLow: number;
            let confHigh: number;

            if (method === "percentile") {
                confLow = thetaLow;
                confHigh = thetaHigh;
            } else { // basic bootstrap
                confLow = 2.0 * observed - thetaHigh;
                confHigh = 2.0 * observed - thetaLow;
            }

            results.push({
                metricIdx: d,
                observed,
                confLow,
                confHigh,
                confidenceLevel: this.confidenceLevel,
                resamples: resampledStats
            });
        }

        return results;
    }
}
