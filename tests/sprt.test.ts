import test from "node:test";
import assert from "node:assert";
import { SPRTComparator } from "../src/sprt";

test("SPRTComparator - Wald's H1 decision and early stopping", () => {
    // Model A is much better than Model B
    // We expect the SPRT to decide ACCEPT_H1 quickly
    const scoresA = [10, 9.5, 9.8, 9.7, 10, 9.6, 9.9, 9.5, 9.8, 9.7];
    const scoresB = [7, 7.5, 6.8, 7.2, 7.0, 7.6, 6.9, 7.1, 7.3, 7.0];
    
    // We want to detect an effect size of 0.8
    const sprt = new SPRTComparator(0.8, 0.05, 0.20);
    const results = sprt.processArray(scoresA, scoresB);
    
    assert.strictEqual(results.finalDecision, "ACCEPT_H1");
    // Should stop before the 10th sample
    assert.ok(results.stoppedAt < 10);
    assert.ok(results.savingsPercent > 0);
    assert.strictEqual(results.decisions.length, results.stoppedAt);
});

test("SPRTComparator - H0 decision for identical models", () => {
    // Identical scores -> differences are centered at 0
    const scoresA = [8.0, 8.5, 8.2, 8.1, 8.3, 8.0, 8.2, 8.1, 8.4, 8.2];
    const scoresB = [8.0, 8.5, 8.2, 8.1, 8.3, 8.0, 8.2, 8.1, 8.4, 8.2];
    
    const sprt = new SPRTComparator(0.5, 0.05, 0.20);
    const results = sprt.processArray(scoresA, scoresB);
    
    assert.strictEqual(results.finalDecision, "ACCEPT_H0");
    assert.ok(results.stoppedAt < 10);
});

test("SPRTComparator - validation parameters", () => {
    assert.throws(() => {
        new SPRTComparator(-0.5);
    });
    
    assert.throws(() => {
        new SPRTComparator(0.5, 1.2, 0.2);
    });
});
