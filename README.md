# 📊 Enterprise Statistical Evaluation for LLMs & AI Agents

<p align="center">
  <img src="https://img.shields.io/github/v/release/saitejabandaru-in/llm-stat-eval-js?label=npm&color=orange&style=flat-square" alt="NPM Version" />
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js" alt="Node Version" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" />
</p>

`@saitejabandaru-in/llm-stat-eval` is a production-grade, distribution-free statistical validation framework designed to compare Large Language Models (LLMs) and AI agents. It implements **Sequential Probability Ratio Testing (SPRT)** for cost-saving early stopping, **Nonparametric Combination (NPC)** for multi-criteria evaluation, and **bootstrap confidence intervals**.

---

## ⚡ Core Framework Features

| Feature | Description | Business Benefit |
| :--- | :--- | :--- |
| **📉 Wald's SPRT** | On-the-fly streaming sequential hypothesis tests with dynamic boundaries. | **Saves up to 80%** on API token costs by stopping evaluation runs early. |
| **📊 NPC Engine** | Jointly combines multiple correlated metrics (Accuracy, Latency, API Cost). | Evaluates multi-dimensional trade-offs without assuming normality. |
| **📈 Bootstrapping** | Percentile and basic bootstrap confidence intervals. | Rigorously bounds metric uncertainty without parametric assumptions. |
| **🖥️ Terminal CLI** | Out-of-the-box CLI running comparisons via JSON configurations. | Integrates seamlessly into local shell scripts and CI/CD jobs. |
| **🎨 HTML Dashboard** | Standalone, interactive dark-mode report with distribution charts. | Easily shareable visualization reports for product & engineering teams. |

---

## 🛠️ Installation

```bash
npm install @saitejabandaru-in/llm-stat-eval
```

---

## 🚀 Quick Start Examples

### 1. Cost-Optimized Streaming Evals (Wald's SPRT)
Evaluate prompts on-the-fly and terminate benchmarks immediately once statistical significance is achieved:

```typescript
import { SPRTComparator } from "@saitejabandaru-in/llm-stat-eval";

// Detect an effect size (mean difference) of 0.5 points
const sprt = new SPRTComparator(0.5, 0.05, 0.20);

// Feed streaming paired scores
const scoresA = [8.5, 9.2, 8.8, 9.5, 9.1, 9.4];
const scoresB = [7.0, 7.5, 6.8, 7.2, 7.0, 7.6];

const results = sprt.processArray(scoresA, scoresB);

console.log(`Final Decision: ${results.finalDecision}`); // "ACCEPT_H1" (Model A is better)
console.log(`Stopped at sample: ${results.stoppedAt}`); // 5
console.log(`API Token Savings: ${results.savingsPercent.toFixed(1)}%`);
```

### 2. Multi-Criteria Combinations (NPC)
Compare models across multiple correlated criteria (e.g. Accuracy and Latency) simultaneously:

```typescript
import { LLMComparator, generateHtmlReport } from "@saitejabandaru-in/llm-stat-eval";
import * as fs from "fs";

// 50 evaluations on 2 criteria: [Accuracy (higher is better), Latency (lower is better)]
const scoresA = [[1, 220], [1, 290], [0, 450], [1, 310]];
const scoresB = [[0, 600], [1, 550], [0, 710], [0, 580]];

const comparator = new LLMComparator(1000, "fisher", {
  0: "greater", // we want Accuracy A > B
  1: "less"     // we want Latency A < B
});
comparator.compare(scoresA, scoresB, true); // paired = true

console.log("Global npc p-value:", comparator.globalPValue);

// Export report
const html = generateHtmlReport(comparator, {
  modelAName: "GPT-4o",
  modelBName: "Claude-3.5-Sonnet",
  metricNames: ["Accuracy", "Latency (ms)"]
});
fs.writeFileSync("report.html", html);
```

---

## 🖥️ Command Line Interface (CLI)
Automate statistical evaluations directly in your shell or CI/CD pipeline:

```bash
npx llm-stat-eval --config eval_config.json --output report.html
```

#### Sample Configuration format (`eval_config.json`):
```json
{
  "modelAName": "GPT-4o",
  "modelBName": "Claude-3-Sonnet",
  "metricNames": ["Accuracy", "Latency"],
  "scoresA": [[1, 250], [0, 410], [1, 300]],
  "scoresB": [[0, 580], [1, 520], [0, 640]],
  "paired": true,
  "nPermutations": 1000,
  "combinationMethod": "fisher",
  "alternative": ["greater", "less"]
}
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
MIT License.
