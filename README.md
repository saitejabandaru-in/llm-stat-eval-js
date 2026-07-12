# 📊 Enterprise Statistical Evaluation for LLMs & AI Agents

<p align="center">
  <img src="https://img.shields.io/github/v/release/saitejabandaru-in/llm-stat-eval-js?label=npm&color=orange&style=flat-square" alt="NPM Version" />
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js" alt="Node Version" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" />
</p>

`@saitejabandaru-in/llm-stat-eval` is a production-grade, distribution-free statistical validation framework designed to compare Large Language Models (LLMs) and AI agents. It implements **Thompson Sampling Bayesian Bandits** for prompt optimization, **Wald's Sequential Probability Ratio Testing (SPRT)**, **LLM Bias & Fairness analytics**, and **Nonparametric Combination (NPC)**.

---

## ⚡ Core Framework Features

| Feature | Description | Business Benefit |
| :--- | :--- | :--- |
| **🤠 Bayesian Bandits** | Thompson Sampling optimization using Beta-Binomial models. | **Eliminates underperforming prompt templates early** in multi-model tests, saving massive token costs. |
| **⚖️ Bias & Fairness** | Dynamic Demographic Parity & Disparate Impact (four-fifths rule) testing. | Evaluates if LLM behavior differs significantly across protected subgroups (uses exact permutation p-values). |
| **📉 Wald's SPRT** | On-the-fly streaming sequential hypothesis tests with dynamic boundaries. | **Saves up to 80%** on API token costs by stopping evaluation runs early. |
| **📊 NPC Engine** | Jointly combines multiple correlated metrics (Accuracy, Latency, API Cost). | Evaluates multi-dimensional trade-offs without assuming normality. |
| **📈 Bootstrapping** | Percentile and basic bootstrap confidence intervals. | Rigorously bounds metric uncertainty without parametric assumptions. |
| **🖥️ Case Explorer CLI** | Terminal CLI running comparisons, bias checks, and log compilation. | Integrates seamlessly into local shell scripts and CI/CD jobs. |
| **🎨 HTML Dashboard** | Standalone dashboard with bootstrap CI curves, search/filters, and failure case details. | Easily shareable visualization reports for product & engineering teams. |

---

## 🛠️ Installation

```bash
npm install @saitejabandaru-in/llm-stat-eval
```

---

## 🚀 Advanced Features Guide

### 1. Bayesian Multi-Armed Bandit Prompt Optimizer (`BanditEvaluator`)
Test $K$ prompt templates simultaneously and prune underperforming ones on-the-fly:

```typescript
import { BanditEvaluator } from "@saitejabandaru-in/llm-stat-eval";

// Setup Bandit: 3 configs, prune if prob of being best < 5%, min samples 10
const bandit = new BanditEvaluator(3, 0.05, 10);

while (!bandit.isFinished()) {
  // Select the next configuration index to evaluate via Thompson Sampling
  const configIdx = bandit.selectNextConfig();
  
  // Run evaluation case (mock outcome here)
  const isSuccessful = runLLMEvaluation(configIdx);
  
  // Update posteriors
  bandit.update(configIdx, isSuccessful);
}

console.log("Winner Selected! Summary of runs:");
console.log(bandit.getSummary());
```

### 2. Bias, Fairness, & Disparate Impact Detection (`LLMFairnessEvaluator`)
Rigorously measure if an LLM behaves differently across demographic groups (e.g. gender, age group):

```typescript
import { LLMFairnessEvaluator } from "@saitejabandaru-in/llm-stat-eval";

const scores = [0.1, 0.2, 0.3, 0.8, 0.9, 0.85]; // model ratings/acceptances
const demographics = ["group_a", "group_a", "group_a", "group_b", "group_b", "group_b"];

const evaluator = new LLMFairnessEvaluator(0.5, 1000); // threshold 0.5, 1000 permutations
const results = evaluator.evaluateFairness(scores, demographics, "group_a", "group_b");

console.log("Demographic Parity Ratio:", results.demographicParityRatio); // DPR < 0.8 indicates disparate impact
console.log("Bias Significance p-value:", results.pValue);             // p < 0.05 indicates statistically significant bias
```

### 3. Interactive Case Explorer Dashboard
Generate reports containing interactive tables to search and filter individual prompt evaluation runs (e.g., failed cases, mismatches, wins):

```typescript
import { LLMComparator, generateHtmlReport } from "@saitejabandaru-in/llm-stat-eval";
import * as fs from "fs";

const comparator = new LLMComparator(1000, "fisher");
comparator.compare(scoresA, scoresB, true);

const html = generateHtmlReport(comparator, {
  modelAName: "GPT-4o",
  modelBName: "Claude-3.5",
  metricNames: ["Accuracy"],
  caseLogs: [
    { prompt: "Write code to reverse a list", responseA: "...", responseB: "...", scoreA: 1, scoreB: 0 },
    { prompt: "Explain Einstein theory", responseA: "...", responseB: "...", scoreA: 0, scoreB: 0 }
  ]
});
fs.writeFileSync("report.html", html);
```

---

## 🖥️ Command Line Interface (CLI)
Specify case logs and demographics in your `eval_config.json` to view comprehensive dashboards:

```bash
npx llm-stat-eval --config eval_config.json --output report.html
```

#### Multi-featured config sample (`eval_config.json`):
```json
{
  "modelAName": "GPT-4o",
  "modelBName": "Claude-3-Sonnet",
  "metricNames": ["Accuracy"],
  "scoresA": [1.0, 0.0, 1.0, 1.0, 1.0],
  "scoresB": [0.0, 1.0, 0.0, 0.0, 1.0],
  "caseLogs": [
    { "prompt": "Prompt 1", "responseA": "Ans A", "responseB": "Ans B" },
    { "prompt": "Prompt 2", "responseA": "Ans A", "responseB": "Ans B" }
  ],
  "demographics": ["minority", "majority", "minority", "majority", "minority"],
  "protectedGroup": "minority",
  "referenceGroup": "majority",
  "nPermutations": 1000,
  "combinationMethod": "fisher"
}
```

---

## 🧪 Mathematical Details

### Thompson Sampling Prior & Posterior Update
Each configuration $k$ is modeled with a success probability $p_k \sim \text{Beta}(\alpha_k, \beta_k)$, initialized to $\text{Beta}(1,1)$. Upon observing outcome $X \in \{0, 1\}$:
$$\alpha_k \leftarrow \alpha_k + X, \quad \beta_k \leftarrow \beta_k + (1 - X)$$

### Nonparametric Combination (NPC)
For $D$ evaluation metrics, the global null hypothesis is:
$$H_0^G: \bigcap_{d=1}^D H_0^d$$

The partial $p$-values computed via permutation are combined using the **Fisher Combining Function**:
$$\psi_F(p) = -2 \sum_{d=1}^D \ln(p_d)$$

---

## 📄 License
MIT License.
