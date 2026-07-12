#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { LLMComparator } from "./comparator";
import { generateHtmlReport } from "./report";

function showHelp(): void {
    console.log(`
Usage: npx llm-stat-eval --config <config.json> [options]

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
    
    // Validate required fields in JSON config
    const { scoresA, scoresB } = configData;
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
    console.log(`- Permutations: ${nPermutations}`);
    console.log(`- Combination Method: ${combinationMethod.toUpperCase()}`);
    console.log(`- Alternative: ${JSON.stringify(alternative)}`);
    console.log(`- Paired design: ${paired}`);
    
    const comparator = new LLMComparator(nPermutations, combinationMethod, alternative, 42);
    
    try {
        comparator.compare(scoresA, scoresB, paired);
    } catch (err: any) {
        console.error(`Error executing permutation test comparison: ${err.message}`);
        process.exit(1);
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
    console.log("=======================================================");
    
    // Generate and write report
    try {
        console.log(`Generating interactive HTML dashboard report...`);
        const html = generateHtmlReport(comparator, {
            modelAName,
            modelBName,
            metricNames,
            outputPath: outputReportPath
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
