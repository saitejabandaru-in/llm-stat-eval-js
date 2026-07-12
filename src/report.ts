import { LLMComparator } from "./comparator";
import { BootstrapResult } from "./evaluator";
import { FairnessResults } from "./fairness";

export interface ReportConfig {
    modelAName?: string;
    modelBName?: string;
    metricNames?: string[];
    outputPath?: string;
    bootstrapResults?: BootstrapResult[];
    caseLogs?: Array<{
        prompt: string;
        responseA: string;
        responseB: string;
        scoreA: number;
        scoreB: number;
    }>;
    fairnessResults?: FairnessResults;
    protectedGroup?: string;
    referenceGroup?: string;
}

/**
 * Generates an enterprise-grade interactive HTML dashboard showing
 * the statistical comparison results, bootstrap confidence intervals,
 * case-level failure explorer, and model bias analytics.
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
    
    const globalP = comparator.globalPValue ?? 1.0;
    const isGlobalSig = globalP < 0.05;
    
    // Package all data to embed in HTML
    const reportData = {
        modelA,
        modelB,
        globalPValue: globalP,
        combinationMethod: comparator.combinationMethod,
        nPermutations: comparator.nPermutations,
        metricNames,
        observedDiffs: comparator.observedDiffs,
        partialPValues: comparator.partialPValues,
        permutationDiffs: comparator.permutationDiffs,
        bootstrapResults: config.bootstrapResults || null,
        caseLogs: config.caseLogs || [],
        fairnessResults: config.fairnessResults || null,
        protectedGroup: config.protectedGroup || null,
        referenceGroup: config.referenceGroup || null
    };

    const hasBootstrap = !!config.bootstrapResults;
    const hasCases = !!config.caseLogs && config.caseLogs.length > 0;
    const hasFairness = !!config.fairnessResults;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Statistical Comparison Report</title>
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
        .scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        .scrollbar::-webkit-scrollbar-track {
            background: #161b22;
        }
        .scrollbar::-webkit-scrollbar-thumb {
            background: #30363d;
            border-radius: 4px;
        }
    </style>
</head>
<body class="p-6 md:p-12 min-h-screen">
    <div class="max-w-6xl mx-auto space-y-8">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800">
            <div>
                <h1 class="text-3xl font-bold tracking-tight text-white">LLM Statistical Comparison Report</h1>
                <p class="text-gray-400 mt-1">Rigorous model evaluation dashboard using Nonparametric Combination (NPC) & Bootstrapping</p>
            </div>
            <div class="mt-4 md:mt-0 flex items-center space-x-3">
                <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-300 border border-blue-800">
                    TypeScript SDK v0.3.0
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

        <!-- Metrics Significance Table -->
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

        <!-- Bootstrap Confidence Intervals Section -->
        ${hasBootstrap ? `
        <div class="glass-panel p-6 rounded-xl shadow-lg">
            <h2 class="text-lg font-semibold text-white mb-4">Bootstrap Confidence Intervals</h2>
            <div class="w-full relative h-[300px]">
                <canvas id="bootstrapChart"></canvas>
            </div>
        </div>
        ` : ''}

        <!-- Fairness/Bias Section -->
        ${hasFairness ? `
        <div class="glass-panel p-6 rounded-xl shadow-lg space-y-6">
            <div>
                <h2 class="text-lg font-semibold text-white">LLM Bias & Fairness Analysis</h2>
                <p class="text-sm text-gray-400 mt-1">Evaluating score disparities between protected groups</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Metrics List -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                        <div>
                            <span class="text-sm text-gray-400">Demographic Parity Ratio (DPR)</span>
                            <p class="text-xs text-gray-500 mt-1">Selection rate protected vs reference group</p>
                        </div>
                        <span class="text-2xl font-bold text-white">${config.fairnessResults?.demographicParityRatio.toFixed(3)}</span>
                    </div>

                    <div class="flex items-center justify-between p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                        <div>
                            <span class="text-sm text-gray-400">Disparate Impact Detected</span>
                            <p class="text-xs text-gray-500 mt-1">EEOC 80/20 (0.8 &le; ratio &le; 1.25) rule</p>
                        </div>
                        <span class="px-2.5 py-1 text-xs font-semibold rounded ${config.fairnessResults?.disparateImpactDetected ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-green-950 text-green-300 border border-green-800'}">
                            ${config.fairnessResults?.disparateImpactDetected ? 'Disparity Found' : 'Fair'}
                        </span>
                    </div>

                    <div class="flex items-center justify-between p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                        <div>
                            <span class="text-sm text-gray-400">Bias significance p-value</span>
                            <p class="text-xs text-gray-500 mt-1">Permutation test for group mean differences</p>
                        </div>
                        <span class="text-lg font-mono font-bold text-white">${config.fairnessResults?.pValue.toFixed(4)}</span>
                    </div>
                </div>

                <!-- Group Stats -->
                <div class="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/20">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-gray-900/40 border-b border-gray-800 text-xs font-semibold uppercase text-gray-400">
                                <th class="px-4 py-2">Demographic Group</th>
                                <th class="px-4 py-2">Samples</th>
                                <th class="px-4 py-2">Mean Rating</th>
                                <th class="px-4 py-2">Selection Rate</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-800 text-sm">
                            ${Object.entries(config.fairnessResults?.groupStats || {}).map(([g, stats]) => `
                            <tr>
                                <td class="px-4 py-3 font-semibold text-white">${g} ${g === config.protectedGroup ? '(Protected)' : g === config.referenceGroup ? '(Reference)' : ''}</td>
                                <td class="px-4 py-3 font-mono">${stats.count}</td>
                                <td class="px-4 py-3 font-mono">${stats.meanScore.toFixed(3)}</td>
                                <td class="px-4 py-3 font-mono">${(stats.selectionRate * 100).toFixed(1)}%</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Permutation Null Distribution Section -->
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
            <div class="w-full relative h-[350px]">
                <canvas id="nullDistChart"></canvas>
            </div>
        </div>

        <!-- Case-Level Failure Explorer Section -->
        ${hasCases ? `
        <div class="glass-panel p-6 rounded-xl shadow-lg space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-800">
                <div>
                    <h2 class="text-lg font-semibold text-white">Case-Level Failure Explorer</h2>
                    <p class="text-sm text-gray-400 mt-1">Search prompt inputs and filter outcomes</p>
                </div>
                
                <!-- Filters -->
                <div class="mt-4 md:mt-0 flex flex-wrap gap-3">
                    <input type="text" id="caseSearch" placeholder="Search prompts..." class="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 w-48">
                    <select id="outcomeFilter" class="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
                        <option value="all">All Cases</option>
                        <option value="a-better">${modelA} Wins</option>
                        <option value="b-better">${modelB} Wins</option>
                        <option value="diff">Score Mismatches</option>
                    </select>
                </div>
            </div>

            <!-- Table Container -->
            <div class="overflow-x-auto scrollbar">
                <table class="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr class="border-b border-gray-800 bg-gray-900/30 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                            <th class="px-4 py-2.5 w-1/2">Prompt Input</th>
                            <th class="px-4 py-2.5">${modelA} Score</th>
                            <th class="px-4 py-2.5">${modelB} Score</th>
                            <th class="px-4 py-2.5">Difference</th>
                        </tr>
                    </thead>
                    <tbody id="caseTableBody" class="divide-y divide-gray-800 text-sm">
                        <!-- Rendered by client script -->
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="flex items-center justify-between pt-4 border-t border-gray-800 text-sm">
                <span class="text-gray-400" id="paginationLabel">Showing 0-0 of 0</span>
                <div class="flex space-x-2">
                    <button id="prevBtn" class="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                    <button id="nextBtn" class="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
            </div>
        </div>
        ` : ''}

    </div>

    <!-- Embedded Data & Chart Script -->
    <script>
        const data = ${JSON.stringify(reportData)};
        let activeNullDistChart = null;

        // --- 1. Null Distribution Chart ---
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

        function updateNullDistChart(metricIdx) {
            const observedDiff = data.observedDiffs[metricIdx];
            const permStats = data.permutationDiffs.map(row => row[metricIdx]);
            const histogram = computeHistogram(permStats);
            const labels = histogram.map(b => b.x.toFixed(4));
            const counts = histogram.map(b => b.count);

            const ctx = document.getElementById('nullDistChart').getContext('2d');
            if (activeNullDistChart) activeNullDistChart.destroy();

            activeNullDistChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Permutation Null Distribution (H₀)',
                        data: counts,
                        backgroundColor: 'rgba(56, 139, 253, 0.4)',
                        borderColor: '#58a6ff',
                        borderWidth: 1,
                        barPercentage: 1.0,
                        categoryPercentage: 1.0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8b949e', maxRotation: 45, minRotation: 45 } },
                        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8b949e' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#c9d1d9' } },
                    }
                },
                plugins: [{
                    id: 'verticalObsLine',
                    afterDraw: (chart) => {
                        const xScale = chart.scales.x;
                        const yScale = chart.scales.y;
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
                        ctx.strokeStyle = '#f85149';
                        ctx.setLineDash([6, 6]);
                        ctx.stroke();
                        
                        ctx.fillStyle = '#f85149';
                        ctx.font = '12px Inter';
                        ctx.fillText('Observed Diff (' + observedDiff.toFixed(4) + ')', xPixel + 8, yScale.top + 20);
                        ctx.restore();
                    }
                }]
            });
        }

        // Initialize Null Distribution Chart
        updateNullDistChart(0);
        document.getElementById('metricSelect').addEventListener('change', (e) => {
            updateNullDistChart(parseInt(e.target.value, 10));
        });

        // --- 2. Bootstrap CI Chart (Floating Bars) ---
        if (data.bootstrapResults) {
            const ctx = document.getElementById('bootstrapChart').getContext('2d');
            const metricNames = data.metricNames;
            
            // Format data as floating bars [low, high]
            const floatingData = data.bootstrapResults.map(r => [r.confLow, r.confHigh]);
            const observedData = data.bootstrapResults.map(r => r.observed);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: metricNames,
                    datasets: [
                        {
                            label: '95% Bootstrap CI Range',
                            data: floatingData,
                            backgroundColor: 'rgba(57, 219, 109, 0.25)',
                            borderColor: '#39d353',
                            borderWidth: 1.5,
                            barPercentage: 0.5
                        },
                        {
                            label: 'Observed Statistic',
                            data: observedData,
                            backgroundColor: '#f85149',
                            type: 'scatter',
                            pointStyle: 'rectRot',
                            pointRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8b949e' } },
                        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#8b949e' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#c9d1d9' } }
                    }
                }
            });
        }

        // --- 3. Case-Level Explorer Pagination & Filtering ---
        if (data.caseLogs && data.caseLogs.length > 0) {
            let currentPage = 0;
            const itemsPerPage = 10;
            let filteredCases = [...data.caseLogs];

            const searchInput = document.getElementById('caseSearch');
            const outcomeFilter = document.getElementById('outcomeFilter');
            const tbody = document.getElementById('caseTableBody');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const label = document.getElementById('paginationLabel');

            function renderTable() {
                const total = filteredCases.length;
                const start = currentPage * itemsPerPage;
                const end = Math.min(start + itemsPerPage, total);
                
                tbody.innerHTML = '';
                
                if (total === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No cases match your filters.</td></tr>';
                    label.innerText = 'Showing 0-0 of 0';
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
                    return;
                }

                const slice = filteredCases.slice(start, end);
                slice.forEach(c => {
                    const diff = c.scoreA - c.scoreB;
                    let diffClass = 'text-gray-400';
                    if (diff > 0) diffClass = 'text-green-400';
                    else if (diff < 0) diffClass = 'text-red-400';
                    
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-gray-800/10';
                    row.innerHTML = \`
                        <td class="px-4 py-3 font-medium text-white max-w-md truncate" title="\${c.prompt}">\${c.prompt}</td>
                        <td class="px-4 py-3 font-mono">\${c.scoreA.toFixed(2)}</td>
                        <td class="px-4 py-3 font-mono">\${c.scoreB.toFixed(2)}</td>
                        <td class="px-4 py-3 font-mono \${diffClass}">\${diff >= 0 ? '+' : ''}\${diff.toFixed(2)}</td>
                    \`;
                    tbody.appendChild(row);
                });

                label.innerText = 'Showing ' + (start + 1) + '-' + end + ' of ' + total;
                prevBtn.disabled = currentPage === 0;
                nextBtn.disabled = end >= total;
            }

            function filterData() {
                const q = searchInput.value.toLowerCase().trim();
                const mode = outcomeFilter.value;

                filteredCases = data.caseLogs.filter(c => {
                    // 1. Search filter
                    if (q && !c.prompt.toLowerCase().includes(q)) {
                        return false;
                    }
                    
                    // 2. Outcome filter
                    const diff = c.scoreA - c.scoreB;
                    if (mode === 'a-better' && diff <= 0) return false;
                    if (mode === 'b-better' && diff >= 0) return false;
                    if (mode === 'diff' && diff === 0) return false;
                    
                    return true;
                });

                currentPage = 0;
                renderTable();
            }

            searchInput.addEventListener('input', filterData);
            outcomeFilter.addEventListener('change', filterData);
            prevBtn.addEventListener('click', () => {
                if (currentPage > 0) {
                    currentPage--;
                    renderTable();
                }
            });
            nextBtn.addEventListener('click', () => {
                if ((currentPage + 1) * itemsPerPage < filteredCases.length) {
                    currentPage++;
                    renderTable();
                }
            });

            // Initial render
            renderTable();
        }
    </script>
</body>
</html>`;

    return htmlContent;
}
