"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const evaluator_1 = require("../src/evaluator");
const stats_1 = require("../src/stats");
(0, node_test_1.default)("LLMEvaluator - bootstrapCi mean interval", () => {
    // Generate scores: 10 samples of normal-ish data centered at 5
    const scores = [4.5, 5.2, 4.8, 5.5, 4.9, 5.1, 5.0, 5.3, 4.7, 5.0];
    const evaluator = new evaluator_1.LLMEvaluator(100, 0.95, 42);
    const results = evaluator.bootstrapCi(scores, "mean", "percentile");
    node_assert_1.default.strictEqual(results.length, 1);
    const res = results[0];
    node_assert_1.default.strictEqual(res.metricIdx, 0);
    node_assert_1.default.ok(Math.abs(res.observed - (0, stats_1.mean)(scores)) < 1e-5);
    node_assert_1.default.ok(res.confLow < res.observed);
    node_assert_1.default.ok(res.confHigh > res.observed);
    node_assert_1.default.strictEqual(res.resamples.length, 100);
});
(0, node_test_1.default)("LLMEvaluator - bootstrapCi validation error", () => {
    node_assert_1.default.throws(() => {
        new evaluator_1.LLMEvaluator(100, 1.5);
    });
    node_assert_1.default.throws(() => {
        new evaluator_1.LLMEvaluator(20);
    });
    const evaluator = new evaluator_1.LLMEvaluator(100);
    node_assert_1.default.throws(() => {
        evaluator.bootstrapCi([1, 2]); // too few samples (min 5)
    });
});
