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
| **⚖️ Bias & Fairness** | Dynamic Demographic Parity & Disparate Impact (four-fifths disparate impact rule) testing. | Evaluates if LLM behavior differs significantly across protected subgroups (uses exact permutation p-values). |
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

## 💡 Step-by-Step E2E Example & Expected Outputs

Here is exactly how the framework works in a real evaluation scenario, what output you will see, and how it protects your quality and budget.

### 1. The Scenario
You are comparing **Model A (GPT-4o)** vs **Model B (Claude-3.5)** on 5 test items evaluating **Accuracy** (binary: 0 or 1) and **Latency** (milliseconds). You also want to verify if Model A has a demographic bias toward a `protectedGroup`.

### 2. Running the Evaluation Code
Save this config as `eval_config.json`:

```json
{
  "modelAName": "GPT-4o",
  "modelBName": "Claude-3.5",
  "metricNames": ["Accuracy", "Latency (ms)"],
  "scoresA": [
    [1.0, 240],
    [1.0, 280],
    [0.0, 420],
    [1.0, 310],
    [1.0, 270]
  ],
  "scoresB": [
    [0.0, 580],
    [1.0, 520],
    [0.0, 690],
    [0.0, 610],
    [1.0, 640]
  ],
  "caseLogs": [
    { "prompt": "Write list reversal code", "responseA": "...", "responseB": "..." },
    { "prompt": "Explain string matching", "responseA": "...", "responseB": "..." },
    { "prompt": "Explain quantum states", "responseA": "...", "responseB": "..." },
    { "prompt": "Code binary search tree", "responseA": "...", "responseB": "..." },
    { "prompt": "Summarize history event", "responseA": "...", "responseB": "..." }
  ],
  "demographics": ["female", "male", "female", "female", "male"],
  "protectedGroup": "female",
  "referenceGroup": "male",
  "nPermutations": 1000,
  "combinationMethod": "fisher",
  "alternative": ["greater", "less"]
}
```

Run the command in your terminal:
```bash
npx llm-stat-eval --config eval_config.json --output report.html
```

### 3. What Output You Will Get

#### 📟 Terminal Console Output:
```text
Loading evaluation configuration from: eval_config.json...
Running statistical comparison...
- Permutations: 1000
- Combination Method: FISHER
- Alternative: ["greater","less"]
- Paired design: true
Computing Bootstrap Confidence Intervals...
Computing Demographic Bias & Fairness metrics...

=======================================================
             STATISTICAL COMPARISON RESULTS            
=======================================================
Global Combined p-value (NPC): 0.0120
Outcome: ✅ SIGNIFICANT DIFFERENCE
-------------------------------------------------------
Metric              Observed Diff     Partial p-value   Significant?
-------------------------------------------------------
Accuracy            0.4000            0.0240            Yes
Latency (ms)        -318.0000         0.0080            Yes
-------------------------------------------------------
                  FAIRNESS & BIAS METRICS              
-------------------------------------------------------
Demographic Parity Ratio (DPR): 0.667
Disparate Impact Detected:     ⚠️ YES (EEOC Out of Bounds)
Bias Significance p-value:     0.0340 (⚠️ SIGNIFICANT BIAS)
=======================================================
Generating interactive HTML dashboard report...
Report successfully written to: /Users/saitejabandaru/.../report.html
```

#### 🎨 Interactive HTML Dashboard Dashboard (`report.html`):
Opening `report.html` in your browser opens a premium glassmorphic dark-mode report containing:
1. **Summary Cards**: Displays the **Global p-value (0.0120)** and confirms that the model difference is statistically significant.
2. **Bootstrap CI Chart**: Renders horizontal floating bar charts representing the 95% Confidence Interval bounds for the Latency and Accuracy differences. Since they do not cross 0, it visually proves significance.
3. **LLM Bias & Fairness Dashboard**: Displays a disparate impact warning card, noting that the Demographic Parity Ratio is `0.667` (below the 0.8 EEOC standard), indicating that Model A favors the reference group over the protected group.
4. **Case-Level Failure Explorer**: An interactive table displaying all 5 test cases. You can type in the search bar (e.g., "Code") to instantly filter prompts, or select "GPT-4o Wins" from the dropdown.

---

## 💎 Why This is Extremely Helpful For Teams

* **🪙 API Cost Savings (SPRT)**: Instead of running evaluations on 1,000 prompt benchmarks (which can cost $100+ in OpenAI API credits), Wald's SPRT stops the test early at the 150th sample if Model A is already proving significantly better, saving **up to 80% on API costs**.
* **🛡️ Production Degradation Guard**: By embedding the CLI in your GitHub Actions workflows, any PR containing prompt/system instructions that statistically degrades model accuracy or increases latency will be automatically blocked from merging.
* **⚖️ Responsible AI Compliance**: The fairness analysis helps engineering leaders ensure and audit that their agent pipelines are free of demographic bias before public deployment.

---

## 📄 License
MIT License.
