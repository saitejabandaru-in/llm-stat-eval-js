# Enterprise Statistical Evaluation for LLMs & AI Agents (`@saitejabandaru-in/llm-stat-eval`)

Rigorous statistical comparison and evaluation of Large Language Models (LLMs) and AI agents in JavaScript, Node.js, and browser environments. It applies **bootstrapped confidence intervals**, **permutation significance tests**, **Sequential Probability Ratio Testing (SPRT)**, and **Nonparametric Combination (NPC)** to prove if model/prompt differences are statistically significant.

---

## 🚀 Key Features

* **Sequential Probability Ratio Test (SPRT)**: Cost-optimized streaming evaluation with early stopping. Terminate benchmark runs early as soon as statistical significance is reached, saving up to 80% on LLM API tokens.
* **Interactive HTML Report Dashboard**: Generates a self-contained, beautiful, glassmorphic dark-mode HTML report containing distribution histograms (Chart.js) and metrics summaries.
* **Command Line Interface (CLI)**: Automate stats pipeline in shell scripts or CI/CD pipelines.
* **Nonparametric Combination (NPC)**: Combines multiple correlated metrics (e.g. Accuracy, Latency, Cost) into a single, global p-value.
* **Bootstrapping**: Computes distribution-free confidence intervals for LLM metric statistics.

---

## 🛠️ Installation

```bash
npm install @saitejabandaru-in/llm-stat-eval
```

---

## 🚀 Advanced Features Guide

### 1. Cost-Optimized Streaming Evals (Wald's SPRT)
Evaluate prompts on-the-fly and stop early when statistical significance is reached.

```typescript
import { SPRTComparator } from "@saitejabandaru-in/llm-stat-eval";

// Setup Wald's SPRT: effectSize = 0.5 (detect 0.5 points difference), alpha = 0.05, beta = 0.20
const sprt = new SPRTComparator(0.5, 0.05, 0.20);

const scoresModelA = [8.5, 9.2, 8.8, 9.5, 9.1, 9.4];
const scoresModelB = [7.0, 7.5, 6.8, 7.2, 7.0, 7.6];

const results = sprt.processArray(scoresModelA, scoresModelB);

console.log("Final Decision:      ", results.finalDecision); // "ACCEPT_H1" (Model A is better) or "ACCEPT_H0"
console.log("Stopped at evaluation:", results.stoppedAt);      // e.g. 5 (out of 6 samples)
console.log("API Cost Savings:    ", results.savingsPercent.toFixed(1) + "%");
```

### 2. Interactive HTML Report Generator
Generate a standalone HTML dashboard report displaying your evaluation results:

```typescript
import { LLMComparator, generateHtmlReport } from "@saitejabandaru-in/llm-stat-eval";
import * as fs from "fs";

const comparator = new LLMComparator(1000, "fisher", "two-sided");
comparator.compare(scoresA, scoresB, true);

// Generate report
const html = generateHtmlReport(comparator, {
  modelAName: "GPT-4o",
  modelBName: "Claude-3.5-Sonnet",
  metricNames: ["Accuracy", "Responsiveness"]
});

fs.writeFileSync("evaluation_report.html", html, "utf-8");
console.log("Dashboard created successfully!");
```

### 3. Command Line Interface (CLI)
Automate your evaluations in shell environments.

#### Step 1: Create a JSON configuration file (`eval_config.json`)
```json
{
  "modelAName": "GPT-4o",
  "modelBName": "Claude-3.5-Sonnet",
  "metricNames": ["Accuracy", "Latency (ms)"],
  "scoresA": [
    [1.0, 320],
    [1.0, 290],
    [0.0, 450],
    [1.0, 310],
    [1.0, 280]
  ],
  "scoresB": [
    [0.0, 600],
    [1.0, 550],
    [0.0, 710],
    [0.0, 580],
    [1.0, 620]
  ],
  "paired": true,
  "nPermutations": 1000,
  "combinationMethod": "fisher",
  "alternative": ["greater", "less"]
}
```

#### Step 2: Run the CLI
```bash
npx llm-stat-eval --config eval_config.json --output report.html
```

---

## 🧪 Mathematical Background

### Nonparametric Combination (NPC)
For $D$ evaluation metrics, the global null hypothesis is:
$$H_0^G: \bigcap_{d=1}^D H_0^d$$

The partial $p$-values computed via permutation are combined using the **Fisher Combining Function**:
$$\psi_F(p) = -2 \sum_{d=1}^D \ln(p_d)$$

This combines different variables (even with different scales and units) into a single, global permutation-based $p$-value representing the combined significance of the differences.

---

## 📄 License
MIT
