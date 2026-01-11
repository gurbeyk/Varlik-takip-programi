import { Transaction, Asset } from "@shared/schema";
import { exec } from "child_process";
import * as util from "util";
import * as path from "path";

const execAsync = util.promisify(exec);

const __dirname = path.join(process.cwd(), 'server');

interface CashFlow {
    amount: number; // Negative for outflow (Buy), Positive for inflow (Sell/Current Value)
    date: Date;
}

/**
 * Calculates XIRR (Extended Internal Rate of Return) using Newton-Raphson method.
 * @param cashFlows Array of { amount, date }
 * @param guess Initial guess for rate (default 0.1)
 * @returns Annualized return rate (e.g. 0.15 for 15%)
 */
export function calculateXIRR(cashFlows: CashFlow[], guess = 0.1): number {
    if (cashFlows.length < 2) return 0;

    // Sort by date
    const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const t0 = sorted[0].date;

    // Check if we have both positive and negative values
    const hasPositive = sorted.some(c => c.amount > 0);
    const hasNegative = sorted.some(c => c.amount < 0);
    if (!hasPositive || !hasNegative) return 0;

    const xirr = (rate: number) => {
        return sorted.reduce((sum, flow) => {
            const days = (flow.date.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24);
            return sum + flow.amount / Math.pow(1 + rate, days / 365);
        }, 0);
    };

    const dxirr = (rate: number) => {
        return sorted.reduce((sum, flow) => {
            const days = (flow.date.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24);
            return sum - (days / 365) * flow.amount / Math.pow(1 + rate, (days / 365) + 1);
        }, 0);
    };

    let rate = guess;
    const maxIterations = 50;
    const tolerance = 0.000001;

    for (let i = 0; i < maxIterations; i++) {
        const fValue = xirr(rate);
        const dfValue = dxirr(rate);

        if (Math.abs(dfValue) < 1e-10) break; // Avoid weird division

        const newRate = rate - fValue / dfValue;

        if (Math.abs(newRate - rate) < tolerance) {
            return newRate;
        }

        rate = newRate;
    }

    // Fallback or NaN handling if no convergence
    return isNaN(rate) ? 0 : rate;
}

/**
 * Calculates Period Return (e.g. 1 Month Return)
 * Formula: ((CurrentPrice - HistoricalPrice) / HistoricalPrice) * 100
 */
export function calculatePeriodReturn(currentPrice: number, historicalPrice: number): number {
    if (historicalPrice <= 0) return 0;
    return ((currentPrice - historicalPrice) / historicalPrice) * 100;
}

/**
 * Normalized Benchmark Comparison
 * Fetches benchmark data and calculates return matching the portfolio's inception or specific period.
 * Uses Python scripts to fetch BIST100 (XU100.IS) or GOLD (GC=F).
 */


// ... existing code ...

/**
 * Normalized Benchmark Comparison (Async)
 */
export async function getBenchmarkReturn(symbol: string, startDate: Date): Promise<number> {
    try {
        const scriptPath = path.join(__dirname, 'fetch-benchmark-history.py');
        const startStr = startDate.toISOString().split('T')[0];

        let formattedSymbol = symbol;
        if (symbol === 'XU100' || symbol === 'BIST100') formattedSymbol = 'XU100.IS';
        if (symbol === 'GOLD' || symbol === 'ALTIN') formattedSymbol = 'GC=F';

        // Fetch Start Price
        const { stdout: startResult } = await execAsync(`python3 ${scriptPath} "${formattedSymbol}" "${startStr}"`, { timeout: 15000 });

        let startPrice = 0;
        try {
            const startData = JSON.parse(startResult);
            startPrice = startData.price;
        } catch (e) {
            console.error(`Failed to parse start price for ${symbol}: ${startResult}`);
            return 0;
        }

        if (!startPrice) return 0;

        // Fetch Current Price (Today)
        const now = new Date();
        const endStr = now.toISOString().split('T')[0];

        let endPrice = 0;
        try {
            const { stdout: endResult } = await execAsync(`python3 ${scriptPath} "${formattedSymbol}" "${endStr}"`, { timeout: 15000 });
            const endData = JSON.parse(endResult);
            endPrice = endData.price;
        } catch (e) {
            // fallback to yesterday - simple async retry logic
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split('T')[0];
            try {
                const { stdout: yResult } = await execAsync(`python3 ${scriptPath} "${formattedSymbol}" "${yStr}"`, { timeout: 15000 });
                const yData = JSON.parse(yResult);
                endPrice = yData.price;
            } catch (e2) {
                return 0;
            }
        }

        if (!endPrice) return 0;

        return calculatePeriodReturn(endPrice, startPrice);

    } catch (e) {
        console.error(`Benchmark fetch failed for ${symbol}:`, e);
        return 0;
    }
}
