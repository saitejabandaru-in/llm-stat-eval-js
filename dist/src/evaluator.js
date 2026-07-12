"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMEvaluator = void 0;
const stats_1 = require("./stats");
class LLMEvaluator {
    constructor(nResamples = 1000, confidenceLevel = 0.95, seed = null) {
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
    bootstrapCi(scores, metric = "mean", method = "percentile") {
        // Convert to 2D array representation for uniform handling
        let data;
        if (Array.isArray(scores[0])) {
            data = scores;
        }
        else {
            data = scores.map(val => [val]);
        }
        const nSamples = data.length;
        if (nSamples < 5) {
            throw new Error("Must have at least 5 samples to bootstrap");
        }
        const nMetrics = data[0].length;
        // Setup metric function
        let metricFunc;
        if (typeof metric === "string") {
            if (metric === "mean")
                metricFunc = stats_1.mean;
            else if (metric === "median")
                metricFunc = stats_1.median;
            else if (metric === "std")
                metricFunc = stats_1.std;
            else
                throw new Error(`Unknown metric: ${metric}`);
        }
        else {
            metricFunc = metric;
        }
        const alpha = 1.0 - this.confidenceLevel;
        const results = [];
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
            const resampledStats = [];
            for (let b = 0; b < this.nResamples; b++) {
                const sample = [];
                for (let i = 0; i < nColSamples; i++) {
                    const randIdx = Math.floor(lcgRandom() * nColSamples);
                    sample.push(colData[randIdx]);
                }
                resampledStats.push(metricFunc(sample));
            }
            resampledStats.sort((a, b) => a - b);
            const lowPct = (alpha / 2.0) * 100.0;
            const highPct = (1.0 - alpha / 2.0) * 100.0;
            const thetaLow = (0, stats_1.percentile)(resampledStats, lowPct);
            const thetaHigh = (0, stats_1.percentile)(resampledStats, highPct);
            let confLow;
            let confHigh;
            if (method === "percentile") {
                confLow = thetaLow;
                confHigh = thetaHigh;
            }
            else { // basic bootstrap
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
exports.LLMEvaluator = LLMEvaluator;
