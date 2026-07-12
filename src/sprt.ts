import { mean, std } from "./stats";

export type SPRTDecision = "CONTINUE" | "ACCEPT_H1" | "ACCEPT_H0";

export interface SPRTStepResult {
    step: number;
    difference: number;
    logLikelihoodRatio: number;
    lowerBound: number;
    upperBound: number;
    decision: SPRTDecision;
}

export class SPRTComparator {
    public effectSize: number;
    public alpha: number;
    public beta: number;
    
    private differences: number[] = [];
    private lowerBound: number;
    private upperBound: number;

    constructor(
        effectSize: number = 0.5,
        alpha: number = 0.05,
        beta: number = 0.20
    ) {
        if (effectSize <= 0) {
            throw new Error("effectSize must be strictly greater than 0");
        }
        if (alpha <= 0 || alpha >= 1 || beta <= 0 || beta >= 1) {
            throw new Error("alpha and beta must be between 0 and 1");
        }
        
        this.effectSize = effectSize;
        this.alpha = alpha;
        this.beta = beta;
        
        // Wald's boundaries
        this.lowerBound = Math.log(beta / (1.0 - alpha));
        this.upperBound = Math.log((1.0 - beta) / alpha);
    }

    /**
     * Resets the streaming test state.
     */
    public reset(): void {
        this.differences = [];
    }

    /**
     * Add a single paired observation (Model A score and Model B score)
     * and return the decision boundaries and result.
     */
    public addSample(scoreA: number, scoreB: number): SPRTStepResult {
        const diff = scoreA - scoreB;
        this.differences.push(diff);
        
        const m = this.differences.length;
        
        // We need at least 3 samples to estimate standard deviation reliably
        if (m < 3) {
            return {
                step: m,
                difference: diff,
                logLikelihoodRatio: 0,
                lowerBound: this.lowerBound,
                upperBound: this.upperBound,
                decision: "CONTINUE"
            };
        }
        
        const meanDiff = mean(this.differences);
        let sampleStd = std(this.differences);
        
        // Handle zero variance edge case
        if (sampleStd === 0) {
            sampleStd = 1e-5;
        }
        
        const variance = Math.pow(sampleStd, 2);
        
        // Log-Likelihood Ratio for Normal distribution:
        // LLR = (theta / var) * sum(diffs) - (m * theta^2) / (2 * var)
        const sumDiffs = this.differences.reduce((s, val) => s + val, 0);
        const logLikelihoodRatio = (this.effectSize / variance) * sumDiffs - (m * Math.pow(this.effectSize, 2)) / (2.0 * variance);
        
        let decision: SPRTDecision = "CONTINUE";
        if (logLikelihoodRatio >= this.upperBound) {
            decision = "ACCEPT_H1"; // Model A is statistically significantly better
        } else if (logLikelihoodRatio <= this.lowerBound) {
            decision = "ACCEPT_H0"; // No significant improvement detected
        }
        
        return {
            step: m,
            difference: diff,
            logLikelihoodRatio,
            lowerBound: this.lowerBound,
            upperBound: this.upperBound,
            decision
        };
    }

    /**
     * Process an entire array of paired scores sequentially and stop early if possible.
     */
    public processArray(scoresA: number[], scoresB: number[]): {
        decisions: SPRTStepResult[];
        finalDecision: SPRTDecision;
        stoppedAt: number;
        savingsPercent: number;
    } {
        if (scoresA.length !== scoresB.length) {
            throw new Error("scoresA and scoresB must have equal length");
        }
        
        this.reset();
        const results: SPRTStepResult[] = [];
        let finalDecision: SPRTDecision = "CONTINUE";
        let stoppedAt = scoresA.length;
        
        for (let i = 0; i < scoresA.length; i++) {
            const res = this.addSample(scoresA[i], scoresB[i]);
            results.push(res);
            if (res.decision !== "CONTINUE") {
                finalDecision = res.decision;
                stoppedAt = i + 1;
                break;
            }
        }
        
        const savingsPercent = ((scoresA.length - stoppedAt) / scoresA.length) * 100.0;
        
        return {
            decisions: results,
            finalDecision,
            stoppedAt,
            savingsPercent
        };
    }
}
