export interface ConfigStats {
    idx: number;
    alpha: number;
    beta: number;
    samples: number;
    successRate: number;
    probabilityOfBest: number;
    isActive: boolean;
}

export class BanditEvaluator {
    public k: number;
    public pruningThreshold: number;
    public minSamplesBeforePrune: number;
    public seed: number | null;

    private alphas: number[];
    private betas: number[];
    private sampleCounts: number[];
    private activeFlags: boolean[];
    private randomState: number;

    constructor(
        k: number,
        pruningThreshold: number = 0.05,
        minSamplesBeforePrune: number = 10,
        seed: number | null = null
    ) {
        if (k < 2) {
            throw new Error("k must be at least 2 configurations");
        }
        this.k = k;
        this.pruningThreshold = pruningThreshold;
        this.minSamplesBeforePrune = minSamplesBeforePrune;
        this.seed = seed;

        this.alphas = new Array<number>(k).fill(1); // Beta(1,1) uniform prior
        this.betas = new Array<number>(k).fill(1);
        this.sampleCounts = new Array<number>(k).fill(0);
        this.activeFlags = new Array<boolean>(k).fill(true);
        this.randomState = seed !== null ? seed : Math.floor(Math.random() * 1000000);
    }

    /**
     * Seeded random number generator
     */
    private random(): number {
        this.randomState = (1103515245 * this.randomState + 12345) % 2147483648;
        return this.randomState / 2147483648;
    }

    /**
     * Marsaglia and Tsang Gamma Sampler (shape >= 1)
     */
    private _sampleGamma(shape: number): number {
        if (shape < 1) {
            const u = this.random();
            return this._sampleGamma(shape + 1) * Math.pow(u, 1 / shape);
        }
        const d = shape - 1.0 / 3.0;
        const c = 1.0 / Math.sqrt(9.0 * d);
        while (true) {
            let x = 0;
            let v = 0;
            do {
                const u1 = this.random();
                const u2 = this.random();
                const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                x = z;
                v = 1.0 + c * x;
            } while (v <= 0);
            v = Math.pow(v, 3);
            const u = this.random();
            if (u < 1.0 - 0.0331 * Math.pow(x, 4)) {
                return d * v;
            }
            if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) {
                return d * v;
            }
        }
    }

    /**
     * Beta sampler using Gamma distribution ratio
     */
    private _sampleBeta(alpha: number, beta: number): number {
        const x = this._sampleGamma(alpha);
        const y = this._sampleGamma(beta);
        if (x + y === 0) return 0;
        return x / (x + y);
    }

    /**
     * Selects the next configuration index to evaluate using Thompson Sampling.
     */
    public selectNextConfig(): number {
        let bestVal = -1;
        let selectedIdx = -1;

        for (let i = 0; i < this.k; i++) {
            if (!this.activeFlags[i]) continue;
            
            // Sample probability parameter from active posterior distributions
            const val = this._sampleBeta(this.alphas[i], this.betas[i]);
            if (val > bestVal) {
                bestVal = val;
                selectedIdx = i;
            }
        }
        return selectedIdx;
    }

    /**
     * Updates the posterior parameters for a configuration based on evaluation outcome.
     */
    public update(configIdx: number, success: boolean): void {
        if (configIdx < 0 || configIdx >= this.k) {
            throw new Error("Invalid configuration index");
        }
        if (!this.activeFlags[configIdx]) return;

        this.sampleCounts[configIdx]++;
        if (success) {
            this.alphas[configIdx]++;
        } else {
            this.betas[configIdx]++;
        }

        // Run pruning calculations
        this.pruneActiveConfigs();
    }

    /**
     * Estimates the probability that each configuration is the best using Monte Carlo simulation.
     */
    public getProbabilitiesOfBest(simulations: number = 1000): number[] {
        const wins = new Array<number>(this.k).fill(0);
        let activeCount = 0;

        for (let i = 0; i < this.k; i++) {
            if (this.activeFlags[i]) activeCount++;
        }

        if (activeCount === 0) return new Array<number>(this.k).fill(0);

        for (let s = 0; s < simulations; s++) {
            let maxVal = -1;
            let winnerIdx = -1;

            for (let i = 0; i < this.k; i++) {
                if (!this.activeFlags[i]) continue;
                const val = this._sampleBeta(this.alphas[i], this.betas[i]);
                if (val > maxVal) {
                    maxVal = val;
                    winnerIdx = i;
                }
            }
            wins[winnerIdx]++;
        }

        return wins.map(w => w / simulations);
    }

    /**
     * Prunes underperforming configurations that are highly unlikely to be the best.
     */
    public pruneActiveConfigs(): void {
        const probs = this.getProbabilitiesOfBest(1000);
        
        let activeCount = 0;
        for (let i = 0; i < this.k; i++) {
            if (this.activeFlags[i]) activeCount++;
        }

        // Keep at least one active config
        if (activeCount <= 1) return;

        for (let i = 0; i < this.k; i++) {
            if (!this.activeFlags[i]) continue;

            // Pruning condition: probability of being the best is below threshold
            // and we have gathered enough sample confidence for this variant.
            if (probs[i] < this.pruningThreshold && this.sampleCounts[i] >= this.minSamplesBeforePrune) {
                this.activeFlags[i] = false;
            }
        }
    }

    /**
     * Checks if only one active configuration remains.
     */
    public isFinished(): boolean {
        let activeCount = 0;
        for (let i = 0; i < this.k; i++) {
            if (this.activeFlags[i]) activeCount++;
        }
        return activeCount <= 1;
    }

    /**
     * Gets a detailed summary of all configurations and their status.
     */
    public getSummary(): ConfigStats[] {
        const probs = this.getProbabilitiesOfBest(1000);
        
        return Array.from({ length: this.k }, (_, i) => ({
            idx: i,
            alpha: this.alphas[i],
            beta: this.betas[i],
            samples: this.sampleCounts[i],
            successRate: this.sampleCounts[i] > 0 ? (this.alphas[i] - 1) / this.sampleCounts[i] : 0,
            probabilityOfBest: probs[i],
            isActive: this.activeFlags[i]
        }));
    }
}
