#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { LLMComparator } from "./comparator";
import { LLMEvaluator } from "./evaluator";
import { LLMFairnessEvaluator, FairnessResults } from "./fairness";
import { generateHtmlReport } from "./report";

function showHelp(): void {
    console.log(`
Usage: npx llm-proof --config <config.json> [options]

Options:
  --config <path>   Path to the JSON configuration file containing scores (Required)
  --output <path>   Path to write the HTML report dashboard (Default: report.html)
  --help, -h        Show help menu
`);
}

async function run(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
        showHelp();
        process.exit(0);
    }
    
    const configIndex = args.indexOf("--config");
    if (configIndex === -1 || configIndex + 1 >= args.length) {
        console.error("Error: --config <path> argument is required.");
        showHelp();
        process.exit(1);
    }
    
    const configPath = path.resolve(args[configIndex + 1]);
    if (!fs.existsSync(configPath)) {
        console.error(`Error: Configuration file not found at: ${configPath}`);
        process.exit(1);
    }
    
    let outputReportPath = "report.html";
    const outputIndex = args.indexOf("--output");
    if (outputIndex !== -1 && outputIndex + 1 < args.length) {
        outputReportPath = args[outputIndex + 1];
    }
    
    console.log(`Loading evaluation configuration from: ${configPath}...`);
    let configData: any;
    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        configData = JSON.parse(raw);
    } catch (err: any) {
        console.error(`Error parsing JSON config file: ${err.message}`);
        process.exit(1);
    }
    
    const { scoresA, scoresB, caseLogs, demographics, protectedGroup, referenceGroup } = configData;
    if (!scoresA || !scoresB || !Array.isArray(scoresA) || !Array.isArray(scoresB)) {
        console.error("Error: Config JSON must contain 'scoresA' and 'scoresB' arrays.");
        process.exit(1);
    }
    
    const nPermutations = configData.nPermutations || 1000;
    const combinationMethod = configData.combinationMethod || "fisher";
    const alternative = configData.alternative || "two-sided";
    const paired = configData.paired !== undefined ? configData.paired : true;
    
    const modelAName = configData.modelAName || "Model A";
    const modelBName = configData.modelBName || "Model B";
    
    const firstRowA = scoresA[0];
    const nMetrics = Array.isArray(firstRowA) ? firstRowA.length : 1;
    const metricNames = configData.metricNames || Array.from({ length: nMetrics }, (_, i) => `Metric ${i}`);
    
    console.log(`Running statistical comparison...`);
    const comparator = new LLMComparator(nPermutations, combinationMethod, alternative, 42);
    try {
        comparator.compare(scoresA, scoresB, paired);
    } catch (err: any) {
        console.error(`Error executing permutation test comparison: ${err.message}`);
        process.exit(1);
    }

    // Compute Bootstrap Confidence Intervals on differences
    console.log("Computing Bootstrap Confidence Intervals...");
    const evaluator = new LLMEvaluator(1000, 0.95, 42);
    const diffsMatrix: number[][] = [];
    for (let i = 0; i < scoresA.length; i++) {
        const rowA = Array.isArray(scoresA[i]) ? scoresA[i] : [scoresA[i]];
        const rowB = Array.isArray(scoresB[i]) ? scoresB[i] : [scoresB[i]];
        const rowDiff: number[] = [];
        for (let d = 0; d < nMetrics; d++) {
            rowDiff.push(rowA[d] - rowB[d]);
        }
        diffsMatrix.push(rowDiff);
    }
    const bootstrapResults = evaluator.bootstrapCi(diffsMatrix, "mean", "percentile");

    // Optional: Compute Demographic Fairness & Bias
    let fairnessResults: FairnessResults | undefined;
    if (demographics && Array.isArray(demographics) && protectedGroup && referenceGroup) {
        console.log("Computing Demographic Bias & Fairness metrics...");
        const fairnessEvaluator = new LLMFairnessEvaluator(0.5, nPermutations, 42);
        // Extract first column as proxy rating score
        const numericScores = scoresA.map((row: any) => Array.isArray(row) ? row[0] : row);
        try {
            fairnessResults = fairnessEvaluator.evaluateFairness(
                numericScores,
                demographics,
                protectedGroup,
                referenceGroup
            );
        } catch (err: any) {
            console.warn(`Warning: Could not compute fairness metrics: ${err.message}`);
        }
    }

    // Optional: Format case logs
    let formattedCaseLogs: any[] = [];
    if (caseLogs && Array.isArray(caseLogs)) {
        formattedCaseLogs = caseLogs.map((log: any, idx: number) => ({
            prompt: log.prompt || `Sample ${idx}`,
            responseA: log.responseA || "",
            responseB: log.responseB || "",
            scoreA: Array.isArray(scoresA[idx]) ? scoresA[idx][0] : scoresA[idx],
            scoreB: Array.isArray(scoresB[idx]) ? scoresB[idx][0] : scoresB[idx]
        }));
    }
    
    // Print Results Table
    console.log("\n=======================================================");
    console.log("             STATISTICAL COMPARISON RESULTS            ");
    console.log("=======================================================");
    console.log(`Global Combined p-value (NPC): ${comparator.globalPValue?.toFixed(4)}`);
    console.log(`Outcome: ${comparator.globalPValue! < 0.05 ? "✅ SIGNIFICANT DIFFERENCE" : "❌ NOT SIGNIFICANT"}`);
    console.log("-------------------------------------------------------");
    console.log(
        "Metric".padEnd(20) + 
        "Observed Diff".padEnd(18) + 
        "Partial p-value".padEnd(18) + 
        "Significant?"
    );
    console.log("-------------------------------------------------------");
    
    for (let d = 0; d < nMetrics; d++) {
        const name = metricNames[d] || `Metric ${d}`;
        const diff = comparator.observedDiffs![d];
        const pVal = comparator.partialPValues![d];
        const sig = pVal < 0.05 ? "Yes" : "No";
        
        console.log(
            name.padEnd(20) + 
            diff.toFixed(4).padEnd(18) + 
            pVal.toFixed(4).padEnd(18) + 
            sig
        );
    }
    
    if (fairnessResults) {
        console.log("-------------------------------------------------------");
        console.log("                  FAIRNESS & BIAS METRICS              ");
        console.log("-------------------------------------------------------");
        console.log(`Demographic Parity Ratio (DPR): ${fairnessResults.demographicParityRatio.toFixed(3)}`);
        console.log(`Disparate Impact Detected:     ${fairnessResults.disparateImpactDetected ? "⚠️ YES (EEOC Out of Bounds)" : "✅ NO"}`);
        console.log(`Bias Significance p-value:     ${fairnessResults.pValue.toFixed(4)} (${fairnessResults.isBiasSignificant ? "⚠️ SIGNIFICANT BIAS" : "✅ FAIR"})`);
    }
    console.log("=======================================================");
    
    // Generate and write report
    try {
        console.log(`Generating interactive HTML dashboard report...`);
        const html = generateHtmlReport(comparator, {
            modelAName,
            modelBName,
            metricNames,
            outputPath: outputReportPath,
            bootstrapResults,
            caseLogs: formattedCaseLogs,
            fairnessResults,
            protectedGroup,
            referenceGroup
        });
        fs.writeFileSync(outputReportPath, html, "utf-8");
        console.log(`Report successfully written to: ${path.resolve(outputReportPath)}`);
    } catch (err: any) {
        console.error(`Error generating HTML report: ${err.message}`);
        process.exit(1);
    }
}

// Run CLI
if (require.main === module) {
    run().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
