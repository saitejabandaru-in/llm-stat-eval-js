"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMComparator = void 0;
const stats_1 = require("./stats");
class LLMComparator {
    constructor(nPermutations = 1000, combinationMethod = "fisher", alternative = "two-sided", seed = null) {
        // Output fields
        this.partialPValues = null;
        this.globalPValue = null;
        this.observedDiffs = null;
        this.permutationDiffs = null;
        this.permutationCombinedStats = null;
        this.observedCombinedStat = null;
        if (nPermutations < 10) {
            throw new Error("nPermutations must be at least 10");
        }
        this.nPermutations = nPermutations;
        this.combinationMethod = combinationMethod;
        this.alternative = alternative;
        this.seed = seed;
    }
    /**
     * Compare Model A and Model B.
     */
    compare(scoresA, scoresB, paired = true) {
        // Convert to 2D
        let dataA;
        if (Array.isArray(scoresA[0])) {
            dataA = scoresA;
        }
        else {
            dataA = scoresA.map(val => [val]);
        }
        let dataB;
        if (Array.isArray(scoresB[0])) {
            dataB = scoresB;
        }
        else {
            dataB = scoresB.map(val => [val]);
        }
        const nSamplesA = dataA.length;
        const nSamplesB = dataB.length;
        const nMetrics = dataA[0].length;
        if (paired && nSamplesA !== nSamplesB) {
            throw new Error("For paired comparisons, scoresA and scoresB must have the same number of samples");
        }
        // Parse alternatives
        const alternatives = this._parseAlternatives(nMetrics);
        // LCG Seeded Random
        let randomState = this.seed !== null ? this.seed : Math.floor(Math.random() * 1000000);
        const lcgRandom = () => {
            randomState = (1103515245 * randomState + 12345) % 2147483648;
            return randomState / 2147483648;
        };
        // Compute observed differences (Mean of A - Mean of B)
        const obsDiffs = [];
        for (let d = 0; d < nMetrics; d++) {
            const meanA = (0, stats_1.mean)(dataA.map(row => row[d]));
            const meanB = (0, stats_1.mean)(dataB.map(row => row[d]));
            obsDiffs.push(meanA - meanB);
        }
        this.observedDiffs = obsDiffs;
        // Permuted differences matrix of shape (nPermutations, nMetrics)
        const TPerm = [];
        for (let b = 0; b < this.nPermutations; b++) {
            TPerm.push(new Array(nMetrics).fill(0));
        }
        if (paired) {
            // Paired permutation test: sign flipping of differences
            const diffs = [];
            for (let i = 0; i < nSamplesA; i++) {
                const diffRow = [];
                for (let d = 0; d < nMetrics; d++) {
                    diffRow.push(dataA[i][d] - dataB[i][d]);
                }
                diffs.push(diffRow);
            }
            // Permutation 0 is observed
            for (let d = 0; d < nMetrics; d++) {
                TPerm[0][d] = (0, stats_1.mean)(diffs.map(row => row[d]));
            }
            for (let b = 1; b < this.nPermutations; b++) {
                const signs = [];
                for (let i = 0; i < nSamplesA; i++) {
                    signs.push(lcgRandom() > 0.5 ? 1.0 : -1.0);
                }
                for (let d = 0; d < nMetrics; d++) {
                    let sumDiff = 0;
                    for (let i = 0; i < nSamplesA; i++) {
                        sumDiff += signs[i] * diffs[i][d];
                    }
                    TPerm[b][d] = sumDiff / nSamplesA;
                }
            }
        }
        else {
            // Independent permutation test: shuffle group labels
            const combined = [...dataA, ...dataB];
            const N = nSamplesA + nSamplesB;
            // Permutation 0 is observed
            for (let d = 0; d < nMetrics; d++) {
                TPerm[0][d] = obsDiffs[d];
            }
            for (let b = 1; b < this.nPermutations; b++) {
                // Generate shuffled indices
                const indices = Array.from({ length: N }, (_, i) => i);
                for (let i = N - 1; i > 0; i--) {
                    const j = Math.floor(lcgRandom() * (i + 1));
                    const temp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = temp;
                }
                // Split into Group A and Group B
                const groupAIndices = indices.slice(0, nSamplesA);
                const groupBIndices = indices.slice(nSamplesA);
                for (let d = 0; d < nMetrics; d++) {
                    const sumA = groupAIndices.reduce((sum, idx) => sum + combined[idx][d], 0);
                    const sumB = groupBIndices.reduce((sum, idx) => sum + combined[idx][d], 0);
                    TPerm[b][d] = (sumA / nSamplesA) - (sumB / nSamplesB);
                }
            }
        }
        this.permutationDiffs = TPerm;
        // Compute partial p-values for all permutations and each metric
        const PPerm = [];
        for (let b = 0; b < this.nPermutations; b++) {
            PPerm.push(new Array(nMetrics).fill(0));
        }
        for (let d = 0; d < nMetrics; d++) {
            const alt = alternatives[d];
            const statsD = TPerm.map(row => row[d]);
            for (let b = 0; b < this.nPermutations; b++) {
                const val = statsD[b];
                let count = 0;
                if (alt === "two-sided") {
                    const absVal = Math.abs(val);
                    for (let i = 0; i < this.nPermutations; i++) {
                        if (Math.abs(statsD[i]) >= absVal)
                            count++;
                    }
                }
                else if (alt === "greater") {
                    for (let i = 0; i < this.nPermutations; i++) {
                        if (statsD[i] >= val)
                            count++;
                    }
                }
                else if (alt === "less") {
                    for (let i = 0; i < this.nPermutations; i++) {
                        if (statsD[i] <= val)
                            count++;
                    }
                }
                PPerm[b][d] = count / this.nPermutations;
            }
        }
        this.partialPValues = PPerm[0];
        // Nonparametric Combination (NPC)
        const CPerm = this._combine(PPerm);
        this.permutationCombinedStats = CPerm;
        this.observedCombinedStat = CPerm[0];
        // Global Combined P-value
        let globalCount = 0;
        for (let b = 0; b < this.nPermutations; b++) {
            if (CPerm[b] >= this.observedCombinedStat)
                globalCount++;
        }
        this.globalPValue = globalCount / this.nPermutations;
        return this;
    }
    _parseAlternatives(nMetrics) {
        if (typeof this.alternative === "string") {
            if (!["two-sided", "greater", "less"].includes(this.alternative)) {
                throw new Error("alternative must be 'two-sided', 'greater', or 'less'");
            }
            return new Array(nMetrics).fill(this.alternative);
        }
        else if (Array.isArray(this.alternative)) {
            if (this.alternative.length !== nMetrics) {
                throw new Error("Length of alternative list must match nMetrics");
            }
            return this.alternative;
        }
        else {
            const alts = new Array(nMetrics).fill("two-sided");
            for (const [k, v] of Object.entries(this.alternative)) {
                const idx = parseInt(k, 10);
                if (!isNaN(idx) && idx >= 0 && idx < nMetrics) {
                    alts[idx] = v;
                }
            }
            return alts;
        }
    }
    _combine(PPerm) {
        const nPerm = PPerm.length;
        const nMetrics = PPerm[0].length;
        const CPerm = new Array(nPerm).fill(0);
        for (let b = 0; b < nPerm; b++) {
            let sumVal = 0;
            for (let d = 0; d < nMetrics; d++) {
                const p = Math.max(1e-15, Math.min(PPerm[b][d], 1.0 - 1e-15));
                if (this.combinationMethod === "fisher") {
                    sumVal += -2.0 * Math.log(p);
                }
                else if (this.combinationMethod === "liptak") {
                    sumVal += (0, stats_1.inverseNormalCdf)(1.0 - p);
                }
                else if (this.combinationMethod === "tippett") {
                    sumVal = Math.max(sumVal, 1.0 - p);
                }
            }
            CPerm[b] = sumVal;
        }
        return CPerm;
    }
}
exports.LLMComparator = LLMComparator;
