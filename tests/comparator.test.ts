import test from "node:test";
import assert from "node:assert";
import { LLMComparator } from "../src/comparator";

test("LLMComparator - paired permutation test", () => {
    // Model A is significantly better than Model B
    const scoresA = [8.5, 9.0, 7.8, 9.2, 8.8, 9.5, 8.9, 9.1, 8.4, 9.0];
    const scoresB = [6.0, 6.5, 5.8, 7.0, 6.2, 7.5, 6.9, 7.1, 5.9, 6.5];
    
    const comparator = new LLMComparator(200, "fisher", "two-sided", 42);
    comparator.compare(scoresA, scoresB, true);
    
    assert.ok(comparator.partialPValues !== null);
    assert.strictEqual(comparator.partialPValues!.length, 1);
    assert.ok(comparator.partialPValues![0] < 0.05); // statistically significant difference
    assert.ok(comparator.globalPValue !== null && comparator.globalPValue < 0.05);
});

test("LLMComparator - independent permutation test", () => {
    // Group A is better than Group B, independent samples
    const scoresA = [9, 10, 8, 9, 9.5];
    const scoresB = [4, 5, 3, 5, 4.5];
    
    const comparator = new LLMComparator(200, "fisher", "two-sided", 42);
    comparator.compare(scoresA, scoresB, false);
    
    assert.ok(comparator.partialPValues !== null);
    assert.ok(comparator.partialPValues![0] < 0.05);
    assert.ok(comparator.globalPValue !== null && comparator.globalPValue < 0.05);
});

test("LLMComparator - combination methods", () => {
    const scoresA = [[8, 9], [7, 8], [9, 9]];
    const scoresB = [[5, 6], [4, 5], [6, 6]];
    
    for (const method of ["fisher", "liptak", "tippett"] as const) {
        const comparator = new LLMComparator(100, method, "two-sided", 42);
        comparator.compare(scoresA, scoresB, true);
        assert.ok(comparator.globalPValue !== null && comparator.globalPValue >= 0 && comparator.globalPValue <= 1);
    }
});
