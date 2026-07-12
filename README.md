# Statistical Evaluation for LLMs & AI Agents in TypeScript (`@saitejabandaru-in/llm-stat-eval`)

Rigorous statistical comparison and evaluation of Large Language Models (LLMs) and AI agents in JavaScript, Node.js, and browser environments. It applies **bootstrapped confidence intervals**, **permutation significance tests**, and **Nonparametric Combination (NPC)** to prove if model performance differences are statistically significant.

---

## 🧐 Why Statistical Evaluation?

Comparing LLMs (e.g. comparing GPT-4 vs Claude-3.5 on a custom dataset) often suffers from:
1. **Small Sample Sizes**: Evaluating models on expensive or human-annotated datasets limits the sample size (e.g., 50–100 samples).
2. **Non-Normal Distributions**: Accuracy is binary (0 or 1), and user ratings (1 to 5) are ordinal. Parametric tests like the Student's $t$-test or ANOVA assume normality and fail on these metrics.
3. **Multivariate Dependencies**: Models are evaluated across multiple correlated criteria (e.g., Accuracy, Coherence, Latency, API Cost). 

`@saitejabandaru-in/llm-stat-eval` resolves these issues by using **nonparametric resampling methods**:
- **Permutation Tests**: Calculates exact, distribution-free $p$-values to compare two models.
- **Bootstrapping**: Computes distribution-free confidence intervals for LLM metric statistics.
- **Nonparametric Combination (NPC)**: Integrates multiple evaluation criteria into a single global comparison statistic, preserving their correlation structures.

---

## 🛠️ Installation

Install from npm or GitHub Packages:

```bash
npm install @saitejabandaru-in/llm-stat-eval
```

---

## 🚀 Quick Start

### 1. Bootstrapped Confidence Intervals (`LLMEvaluator`)
Find the 95% confidence interval for an LLM's accuracy or custom rating score:

```typescript
import { LLMEvaluator } from "@saitejabandaru-in/llm-stat-eval";

// Generate mock binary accuracy scores (e.g. 85% success rate over 80 test samples)
const scores = Array.from({ length: 80 }, () => (Math.random() < 0.85 ? 1 : 0));

const evaluator = new LLMEvaluator(1000, 0.95);
const results = evaluator.bootstrapCi(scores, "mean", "percentile");

const res = results[0];
console.log(`Observed Accuracy: ${res.observed.toFixed(3)}`);
console.log(`95% CI:            [${res.confLow.toFixed(3)}, ${res.confHigh.toFixed(3)}]`);
```

### 2. Rigorous Model Comparison (`LLMComparator`)
Compare Model A and Model B using a paired permutation test (both evaluated on the same prompt set):

```typescript
import { LLMComparator } from "@saitejabandaru-in/llm-stat-eval";

// Sample ratings (1 to 10 scale) on 50 tasks for Model A and Model B
const scoresA = Array.from({ length: 50 }, () => Math.random() * 3 + 7); // mean ~8.5
const scoresB = Array.from({ length: 50 }, () => Math.random() * 3 + 6); // mean ~7.5

const comparator = new LLMComparator(2000, "fisher", "two-sided");
comparator.compare(scoresA, scoresB, true); // paired = true

console.log("Observed Difference (A - B):", comparator.observedDiffs[0]);
console.log("Permutation p-value:         ", comparator.partialPValues[0]);
```

### 3. Multivariate Criteria Combination (NPC)
Compare models across multiple correlated criteria (e.g. Accuracy, Latency, and Cost) simultaneously:

```typescript
// 50 evaluations on 2 criteria: [Accuracy (higher=better), Latency (lower=better)]
const scoresA = Array.from({ length: 50 }, () => [Math.random() > 0.15 ? 1 : 0, Math.random() * 500 + 200]);
const scoresB = Array.from({ length: 50 }, () => [Math.random() > 0.35 ? 1 : 0, Math.random() * 1000 + 400]);

// For Accuracy, we want A > B ('greater'). For Latency, we want A < B ('less')
const comparator = new LLMComparator(2000, "fisher", {
  0: "greater",
  1: "less"
});
comparator.compare(scoresA, scoresB, true);

console.log("Partial p-values [Acc, Lat]:", comparator.partialPValues);
console.log("Global Combined p-value:    ", comparator.globalPValue);
```

---

## 🧪 Mathematical Details

### Nonparametric Combination (NPC)
For $D$ evaluation metrics, the global null hypothesis is:
$$H_0^G: \bigcap_{d=1}^D H_0^d$$

The partial $p$-values computed via permutation are combined using the **Fisher Combining Function**:
$$\psi_F(p) = -2 \sum_{d=1}^D \ln(p_d)$$

This combines different variables (even with different scales and units) into a single, global permutation-based $p$-value representing the combined significance of the differences.

---

## 📄 License
This project is licensed under the MIT License.
