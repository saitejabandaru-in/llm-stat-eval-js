export declare class LLMComparator {
    nPermutations: number;
    combinationMethod: "fisher" | "liptak" | "tippett";
    alternative: string | string[] | Record<number, string>;
    seed: number | null;
    partialPValues: number[] | null;
    globalPValue: number | null;
    observedDiffs: number[] | null;
    permutationDiffs: number[][] | null;
    permutationCombinedStats: number[] | null;
    observedCombinedStat: number | null;
    constructor(nPermutations?: number, combinationMethod?: "fisher" | "liptak" | "tippett", alternative?: string | string[] | Record<number, string>, seed?: number | null);
    /**
     * Compare Model A and Model B.
     */
    compare(scoresA: number[] | number[][], scoresB: number[] | number[][], paired?: boolean): this;
    private _parseAlternatives;
    private _combine;
}
