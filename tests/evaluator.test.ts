import test from "node:test";
import assert from "node:assert";
import { LLMEvaluator } from "../src/evaluator";
import { mean } from "../src/stats";

test("LLMEvaluator - bootstrapCi mean interval", () => {
    // Generate scores: 10 samples of normal-ish data centered at 5
    const scores = [4.5, 5.2, 4.8, 5.5, 4.9, 5.1, 5.0, 5.3, 4.7, 5.0];
    
    const evaluator = new LLMEvaluator(100, 0.95, 42);
    const results = evaluator.bootstrapCi(scores, "mean", "percentile");
    
    assert.strictEqual(results.length, 1);
    const res = results[0];
    
    assert.strictEqual(res.metricIdx, 0);
    assert.ok(Math.abs(res.observed - mean(scores)) < 1e-5);
    assert.ok(res.confLow < res.observed);
    assert.ok(res.confHigh > res.observed);
    assert.strictEqual(res.resamples.length, 100);
});

test("LLMEvaluator - bootstrapCi validation error", () => {
    assert.throws(() => {
        new LLMEvaluator(100, 1.5);
    });
    
    assert.throws(() => {
        new LLMEvaluator(20);
    });
    
    const evaluator = new LLMEvaluator(100);
    assert.throws(() => {
        evaluator.bootstrapCi([1, 2]); // too few samples (min 5)
    });
});
