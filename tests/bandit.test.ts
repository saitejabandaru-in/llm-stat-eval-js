import test from "node:test";
import assert from "node:assert";
import { BanditEvaluator } from "../src/bandit";

test("BanditEvaluator - Thompson Sampling convergence", () => {
    // 3 Configurations:
    // Config 0 is excellent (success rate 90%)
    // Config 1 is mediocre (success rate 50%)
    // Config 2 is poor (success rate 10%)
    const trueProbabilities = [0.9, 0.5, 0.1];
    
    // We initialize the bandit with K=3, pruning threshold 5%, min samples 10
    const bandit = new BanditEvaluator(3, 0.05, 10, 42);
    
    // Simulate 200 evaluation iterations
    for (let step = 0; step < 200; step++) {
        if (bandit.isFinished()) break;
        
        const idx = bandit.selectNextConfig();
        const rand = Math.random();
        const success = rand < trueProbabilities[idx];
        
        bandit.update(idx, success);
    }
    
    const summary = bandit.getSummary();
    
    // Config 0 should still be active or have the highest probability of being the best
    const bestProb = Math.max(...summary.map(s => s.probabilityOfBest));
    const winner = summary.find(s => s.probabilityOfBest === bestProb);
    
    assert.ok(winner !== undefined);
    assert.strictEqual(winner.idx, 0); // Config 0 should win
});
