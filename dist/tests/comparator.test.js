"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const comparator_1 = require("../src/comparator");
(0, node_test_1.default)("LLMComparator - paired permutation test", () => {
    // Model A is significantly better than Model B
    const scoresA = [8.5, 9.0, 7.8, 9.2, 8.8, 9.5, 8.9, 9.1, 8.4, 9.0];
    const scoresB = [6.0, 6.5, 5.8, 7.0, 6.2, 7.5, 6.9, 7.1, 5.9, 6.5];
    const comparator = new comparator_1.LLMComparator(200, "fisher", "two-sided", 42);
    comparator.compare(scoresA, scoresB, true);
    node_assert_1.default.ok(comparator.partialPValues !== null);
    node_assert_1.default.strictEqual(comparator.partialPValues.length, 1);
    node_assert_1.default.ok(comparator.partialPValues[0] < 0.05); // statistically significant difference
    node_assert_1.default.ok(comparator.globalPValue !== null && comparator.globalPValue < 0.05);
});
(0, node_test_1.default)("LLMComparator - independent permutation test", () => {
    // Group A is better than Group B, independent samples
    const scoresA = [9, 10, 8, 9, 9.5];
    const scoresB = [4, 5, 3, 5, 4.5];
    const comparator = new comparator_1.LLMComparator(200, "fisher", "two-sided", 42);
    comparator.compare(scoresA, scoresB, false);
    node_assert_1.default.ok(comparator.partialPValues !== null);
    node_assert_1.default.ok(comparator.partialPValues[0] < 0.05);
    node_assert_1.default.ok(comparator.globalPValue !== null && comparator.globalPValue < 0.05);
});
(0, node_test_1.default)("LLMComparator - combination methods", () => {
    const scoresA = [[8, 9], [7, 8], [9, 9]];
    const scoresB = [[5, 6], [4, 5], [6, 6]];
    for (const method of ["fisher", "liptak", "tippett"]) {
        const comparator = new comparator_1.LLMComparator(100, method, "two-sided", 42);
        comparator.compare(scoresA, scoresB, true);
        node_assert_1.default.ok(comparator.globalPValue !== null && comparator.globalPValue >= 0 && comparator.globalPValue <= 1);
    }
});
