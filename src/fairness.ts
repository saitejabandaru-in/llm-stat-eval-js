import { mean } from "./stats";

export interface FairnessResults {
    groupStats: Record<string, {
        count: number;
        meanScore: number;
        selectionRate: number;
    }>;
    demographicParityRatio: number;
    disparateImpactDetected: boolean;
    observedDifference: number;
    pValue: number; // Permutation test p-value for bias significance
    isBiasSignificant: boolean;
}

export class LLMFairnessEvaluator {
    public nPermutations: number;
    public selectionThreshold: number;
    public seed: number | null;

    constructor(
        selectionThreshold: number = 0.5,
        nPermutations: number = 1000,
        seed: number | null = null
    ) {
        this.selectionThreshold = selectionThreshold;
        this.nPermutations = nPermutations;
        this.seed = seed;
    }

    /**
     * Compute fairness metrics and statistical significance of disparity.
     */
    public evaluateFairness(
        scores: number[],
        groups: string[],
        protectedGroup: string,
        referenceGroup: string
    ): FairnessResults {
        if (scores.length !== groups.length) {
            throw new Error("scores and groups arrays must have the same length");
        }
        if (scores.length < 5) {
            throw new Error("scores list must contain at least 5 samples");
        }

        const uniqueGroups = Array.from(new Set(groups));
        if (!uniqueGroups.includes(protectedGroup) || !uniqueGroups.includes(referenceGroup)) {
            throw new Error(`protectedGroup (${protectedGroup}) and referenceGroup (${referenceGroup}) must exist in the groups array`);
        }

        // LCG Seeded Random
        let randomState = this.seed !== null ? this.seed : Math.floor(Math.random() * 1000000);
        const lcgRandom = () => {
            randomState = (1103515245 * randomState + 12345) % 2147483648;
            return randomState / 2147483648;
        };

        // Separate indices
        const protectedIndices: number[] = [];
        const referenceIndices: number[] = [];
        const groupStats: Record<string, { count: number; meanScore: number; selectionRate: number }> = {};

        for (const g of uniqueGroups) {
            groupStats[g] = { count: 0, meanScore: 0, selectionRate: 0 };
        }

        for (let i = 0; i < scores.length; i++) {
            const val = scores[i];
            const g = groups[i];
            
            groupStats[g].count++;
            groupStats[g].meanScore += val;
            if (val >= this.selectionThreshold) {
                groupStats[g].selectionRate++;
            }

            if (g === protectedGroup) {
                protectedIndices.push(i);
            } else if (g === referenceGroup) {
                referenceIndices.push(i);
            }
        }

        // Finalize averages
        for (const g of uniqueGroups) {
            if (groupStats[g].count > 0) {
                groupStats[g].meanScore /= groupStats[g].count;
                groupStats[g].selectionRate /= groupStats[g].count;
            }
        }

        const meanP = groupStats[protectedGroup].meanScore;
        const meanR = groupStats[referenceGroup].meanScore;
        const obsDiff = meanP - meanR;

        const selectionRateP = groupStats[protectedGroup].selectionRate;
        const selectionRateR = groupStats[referenceGroup].selectionRate;

        // Demographic Parity Ratio (DPR)
        // Avoid division by zero
        const demographicParityRatio = selectionRateR > 0 ? selectionRateP / selectionRateR : 1.0;
        
        // 80/20 (or 4/5ths) rule: disparate impact is detected if ratio < 0.8 or > 1.25
        const disparateImpactDetected = demographicParityRatio < 0.8 || demographicParityRatio > 1.25;

        // Permutation test for statistical significance of group difference
        // We subset to only protected and reference samples
        const subsetScores = [...protectedIndices, ...referenceIndices].map(idx => scores[idx]);
        const subsetGroups = [...protectedIndices, ...referenceIndices].map(idx => groups[idx]);
        
        const nProtected = protectedIndices.length;
        const N = subsetScores.length;

        // Permutation 0 is observed
        const permDiffs: number[] = [obsDiff];

        for (let b = 1; b < this.nPermutations; b++) {
            // Shuffle subsetGroups labels
            const shuffledGroups = [...subsetGroups];
            for (let i = N - 1; i > 0; i--) {
                const j = Math.floor(lcgRandom() * (i + 1));
                const temp = shuffledGroups[i];
                shuffledGroups[i] = shuffledGroups[j];
                shuffledGroups[j] = temp;
            }

            let sumP = 0;
            let countP = 0;
            let sumR = 0;
            let countR = 0;

            for (let i = 0; i < N; i++) {
                if (shuffledGroups[i] === protectedGroup) {
                    sumP += subsetScores[i];
                    countP++;
                } else if (shuffledGroups[i] === referenceGroup) {
                    sumR += subsetScores[i];
                    countR++;
                }
            }

            const pMean = countP > 0 ? sumP / countP : 0;
            const rMean = countR > 0 ? sumR / countR : 0;
            permDiffs.push(pMean - rMean);
        }

        // Two-sided p-value calculation
        let extremeCount = 0;
        const absObsDiff = Math.abs(obsDiff);
        for (let b = 0; b < this.nPermutations; b++) {
            if (Math.abs(permDiffs[b]) >= absObsDiff) {
                extremeCount++;
            }
        }
        const pValue = extremeCount / this.nPermutations;
        const isBiasSignificant = pValue < 0.05;

        return {
            groupStats,
            demographicParityRatio,
            disparateImpactDetected,
            observedDifference: obsDiff,
            pValue,
            isBiasSignificant
        };
    }
}
