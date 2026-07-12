import { LLMComparator } from "./comparator";

export interface ReportConfig {
    modelAName?: string;
    modelBName?: string;
    metricNames?: string[];
    outputPath?: string;
}

/**
 * Generates a self-contained, interactive HTML dashboard report showing
 * the statistical comparison results between two LLMs.
 */
export function generateHtmlReport(
    comparator: LLMComparator,
    config: ReportConfig = {}
): string {
    if (!comparator.permutationDiffs || !comparator.partialPValues || !comparator.observedDiffs) {
        throw new Error("Comparator must be fitted first by running compare()");
    }

    const modelA = config.modelAName || "Model A";
    const modelB = config.modelBName || "Model B";
    const nMetrics = comparator.observedDiffs.length;
    const metricNames = config.metricNames || Array.from({ length: nMetrics }, (_, i) => `Metric ${i}`);
    
    // Compute basic details for HTML
    const globalP = comparator.globalPValue ?? 1.0;
    const isGlobalSig = globalP < 0.05;
    
    // Prepare data for JSON embedding
    const reportData = {
        modelA,
        modelB,
        globalPValue: globalP,
        combinationMethod: comparator.combinationMethod,
        nPermutations: comparator.nPermutations,
        metricNames,
        observedDiffs: comparator.observedDiffs,
        partialPValues: comparator.partialPValues,
        permutationDiffs: comparator.permutationDiffs
    };

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Statistical Evaluation Report</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0d1117;
            color: #c9d1d9;
        }
        .glass-panel {
            background: rgba(22, 27, 34, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(240, 246, 252, 0.1);
        }
    </style>
</head>
<body class="p-6 md:p-12 min-h-screen">
    <div class="max-w-6xl mx-auto space-y-8">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800">
            <div>
                <h1 class="text-3xl font-bold tracking-tight text-white">LLM Statistical Comparison Report</h1>
                <p class="text-gray-400 mt-1">Rigorous model evaluation dashboard using Nonparametric Combination (NPC)</p>
            </div>
            <div class="mt-4 md:mt-0 flex items-center space-x-3">
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-300 border border-blue-800">
                    TypeScript SDK v0.2.0
                </span>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="glass-panel p-6 rounded-xl shadow-lg flex flex-col justify-between">
                <span class="text-sm font-medium text-gray-400">Global Significance (NPC)</span>
                <div class="my-4">
                    <span class="text-4xl font-bold ${isGlobalSig ? 'text-green-400' : 'text-yellow-500'}">
                        ${isGlobalSig ? 'Significant' : 'Not Significant'}
                    </span>
                </div>
                <span class="text-xs text-gray-500">Based on a global threshold of &alpha; = 0.05</span>
            </div>

            <div class="glass-panel p-6 rounded-xl shadow-lg flex flex-col justify-between">
                <span class="text-sm font-medium text-gray-400">Global p-value</span>
                <div class="my-4">
                    <span class="text-4xl font-bold text-white">${globalP.toFixed(4)}</span>
                </div>
                <span class="text-xs text-gray-500">NPC Method: ${comparator.combinationMethod.toUpperCase()}</span>
            </div>

            <div class="glass-panel p-6 rounded-xl shadow-lg flex flex-col justify-between">
                <span class="text-sm font-medium text-gray-400">Evaluation Size</span>
                <div class="my-4">
                    <span class="text-4xl font-bold text-white">${comparator.nPermutations}</span>
                </div>
                <span class="text-xs text-gray-500">Permutations executed under H₀</span>
            </div>
        </div>

        <!-- Comparison Table -->
        <div class="glass-panel rounded-xl shadow-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-800">
                <h2 class="text-lg font-semibold text-white">Metrics Significance Summary</h2>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-gray-800 bg-gray-900/30 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                            <th class="px-6 py-3">Metric Name</th>
                            <th class="px-6 py-3">Mean Difference (${modelA} - ${modelB})</th>
                            <th class="px-6 py-3">Partial p-value</th>
                            <th class="px-6 py-3">Significance</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800 text-sm">
                        ${metricNames.map((name, idx) => {
                            const diff = comparator.observedDiffs![idx];
                            const pVal = comparator.partialPValues![idx];
                            const isSig = pVal < 0.05;
                            return `
                            <tr class="hover:bg-gray-800/20">
                                <td class="px-6 py-4 font-medium text-white">${name}</td>
                                <td class="px-6 py-4 ${diff >= 0 ? 'text-green-400' : 'text-red-400'}">${diff.toFixed(4)}</td>
                                <td class="px-6 py-4 font-mono">${pVal.toFixed(4)}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded text-xs font-medium ${isSig ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}">
                                        ${isSig ? '✅ Significant' : '❌ Not Significant'}
                                    </span>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="glass-panel p-6 rounded-xl shadow-lg">
            <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-gray-800">
                <div>
                    <h2 class="text-lg font-semibold text-white">Permutation Null Distribution Visualizer</h2>
                    <p class="text-sm text-gray-400 mt-1">Comparing observed difference against the permutation null distribution ($H_0$)</p>
                </div>
                <div class="mt-4 md:mt-0">
                    <label for="metricSelect" class="text-sm text-gray-400 mr-2">Select Metric:</label>
                    <select id="metricSelect" class="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500">
                        ${metricNames.map((name, idx) => `<option value="${idx}">${name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Canvas Container -->
            <div class="w-full relative h-[400px]">
                <canvas id="nullDistChart"></canvas>
            </div>
        </div>

    </div>

    <!-- Embedded Data & Chart Script -->
    <script>
        const data = ${JSON.stringify(reportData)};
        let activeChart = null;

        function computeHistogram(values, binCount = 30) {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min;
            const binWidth = range / binCount;
            
            const bins = Array.from({ length: binCount }, (_, i) => ({
                x: min + i * binWidth + binWidth / 2,
                count: 0
            }));
            
            values.forEach(val => {
                let binIdx = Math.floor((val - min) / binWidth);
                if (binIdx >= binCount) binIdx = binCount - 1;
                if (binIdx < 0) binIdx = 0;
                bins[binIdx].count++;
            });
            
            return bins;
        }

        function updateChart(metricIdx) {
            const metricName = data.metricNames[metricIdx];
            const observedDiff = data.observedDiffs[metricIdx];
            
            // Extract the permuted stats for this column index
            const permStats = data.permutationDiffs.map(row => row[metricIdx]);
            const histogram = computeHistogram(permStats);
            
            const labels = histogram.map(b => b.x.toFixed(4));
            const counts = histogram.map(b => b.count);

            const ctx = document.getElementById('nullDistChart').getContext('2d');
            
            if (activeChart) {
                activeChart.destroy();
            }

            activeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Permutation Null Distribution (H₀)',
                            data: counts,
                            backgroundColor: 'rgba(140, 150, 198, 0.5)',
                            borderColor: 'rgba(140, 150, 198, 1)',
                            borderWidth: 1,
                            barPercentage: 1.0,
                            categoryPercentage: 1.0,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#8b949e', maxRotation: 45, minRotation: 45 }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#8b949e' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#c9d1d9' } },
                        tooltip: { callbacks: { label: (ctx) => 'Count: ' + ctx.raw } }
                    }
                },
                plugins: [{
                    id: 'verticalLine',
                    afterDraw: (chart) => {
                        const xScale = chart.scales.x;
                        const yScale = chart.scales.y;
                        
                        // Linear interpolation to find pixel coordinate of observed difference
                        const minVal = Math.min(...permStats);
                        const maxVal = Math.max(...permStats);
                        
                        if (observedDiff < minVal || observedDiff > maxVal) return;
                        
                        const percent = (observedDiff - minVal) / (maxVal - minVal);
                        const xPixel = xScale.left + percent * xScale.width;
                        
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(xPixel, yScale.top);
                        ctx.lineTo(xPixel, yScale.bottom);
                        ctx.lineWidth = 2.5;
                        ctx.strokeStyle = '#DE2D26';
                        ctx.setLineDash([6, 6]);
                        ctx.stroke();
                        ctx.restore();
                        
                        // Text Label for observed diff
                        ctx.save();
                        ctx.fillStyle = '#DE2D26';
                        ctx.font = '12px Inter';
                        ctx.fillText('Observed Diff (' + observedDiff.toFixed(4) + ')', xPixel + 8, yScale.top + 20);
                        ctx.restore();
                    }
                }]
            });
        }

        // Initialize on metric index 0
        updateChart(0);

        // Dropdown change handler
        document.getElementById('metricSelect').addEventListener('change', (e) => {
            updateChart(parseInt(e.target.value, 10));
        });
    </script>
</body>
</html>`;

    return htmlContent;
}
