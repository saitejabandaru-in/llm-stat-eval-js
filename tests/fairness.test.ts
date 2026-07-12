import test from "node:test";
import assert from "node:assert";
import { LLMFairnessEvaluator } from "../src/fairness";

test("LLMFairnessEvaluator - detect significant bias", () => {
    // Model scores: protected group has much lower scores (e.g. mean 0.2)
    // than reference group (e.g. mean 0.9)
    const scores = [0.1, 0.2, 0.3, 0.1, 0.2, 0.8, 0.9, 0.95, 0.85, 0.9];
    const groups = [
        "female", "female", "female", "female", "female", // Protected
        "male", "male", "male", "male", "male"            // Reference
    ];
    
    const evaluator = new LLMFairnessEvaluator(0.5, 200, 42);
    const results = evaluator.evaluateFairness(scores, groups, "female", "male");
    
    assert.ok(results.demographicParityRatio < 0.8); // disparate impact detected
    assert.strictEqual(results.disparateImpactDetected, true);
    assert.ok(results.pValue < 0.05); // statistically significant bias
    assert.strictEqual(results.isBiasSignificant, true);
});

test("LLMFairnessEvaluator - identical distributions are fair", () => {
    const scores = [0.8, 0.9, 0.85, 0.8, 0.9, 0.8, 0.9, 0.85, 0.8, 0.9];
    const groups = [
        "female", "female", "female", "female", "female",
        "male", "male", "male", "male", "male"
    ];
    
    const evaluator = new LLMFairnessEvaluator(0.5, 200, 42);
    const results = evaluator.evaluateFairness(scores, groups, "female", "male");
    
    assert.ok(results.demographicParityRatio >= 0.8 && results.demographicParityRatio <= 1.25);
    assert.strictEqual(results.disparateImpactDetected, false);
    assert.ok(results.pValue > 0.05); // no significant bias
    assert.strictEqual(results.isBiasSignificant, false);
});
