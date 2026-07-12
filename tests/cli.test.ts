import test from "node:test";
import assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

test("CLI - end to end execution", () => {
    const configPath = path.join(__dirname, "test_config.json");
    const outputPath = path.join(__dirname, "test_report.html");
    
    // Create a mock evaluation configuration
    const testConfig = {
        modelAName: "GPT-4",
        modelBName: "Claude-3",
        metricNames: ["Accuracy", "Coherence"],
        scoresA: [
            [1.0, 8.5],
            [0.0, 7.2],
            [1.0, 9.0],
            [1.0, 8.8],
            [1.0, 9.2]
        ],
        scoresB: [
            [0.0, 6.0],
            [1.0, 7.0],
            [0.0, 5.5],
            [0.0, 6.8],
            [1.0, 6.2]
        ],
        paired: true,
        nPermutations: 100,
        combinationMethod: "fisher",
        alternative: ["greater", "greater"]
    };
    
    fs.writeFileSync(configPath, JSON.stringify(testConfig), "utf-8");
    
    // Ensure clean state
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }
    
    try {
        // Run compiled CLI script
        const cliPath = path.join(__dirname, "..", "src", "cli.js");
        const stdout = execSync(`node ${cliPath} --config ${configPath} --output ${outputPath}`).toString();
        
        // Assertions on stdout
        assert.ok(stdout.includes("STATISTICAL COMPARISON RESULTS"));
        assert.ok(stdout.includes("Accuracy"));
        assert.ok(stdout.includes("Coherence"));
        assert.ok(stdout.includes("Report successfully written to"));
        
        // Assertions on the generated HTML report file
        assert.ok(fs.existsSync(outputPath));
        const htmlContent = fs.readFileSync(outputPath, "utf-8");
        assert.ok(htmlContent.includes("LLM Statistical Comparison Report"));
        assert.ok(htmlContent.includes("GPT-4"));
        assert.ok(htmlContent.includes("Claude-3"));
    } finally {
        // Cleanup test artifacts
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
        }
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    }
});
