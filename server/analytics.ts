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

/**
 * Calculates Monthly Portfolio Change using Net Flow method.
 * A robust method that handles deposits/withdrawals correctly.
 */
export async function calculatePortfolioMonthlyChange(assets: Asset[], transactions: Transaction[]): Promise<{
    total: { amount: number; percentage: number },
    breakdown: Record<string, { amount: number; percentage: number }>
}> {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Filter transactions for the last 30 days
        const periodTxs = transactions.filter(t => {
            const tDate = t.createdAt ? new Date(t.createdAt) : new Date();
            return tDate >= thirtyDaysAgo && tDate <= now;
        });

        // Initialize Groups
        const groups: Record<string, {
            startValue: number,
            endValue: number,
            netFlow: number
        }> = {};

        const getGroupKey = (type: string | null) => {
            if (!type) return "Diğer";
            if (type === 'fon') return "TEFAS Fon";
            if (type === 'befas') return "BEFAS Fon";
            if (type === 'hisse') return "BIST Hisse";
            if (type === 'abd-hisse') return "ABD Hisse";
            if (type === 'kripto') return "Kripto";
            if (type === 'etf') return "ETF";
            if (type === 'gayrimenkul') return "Gayrimenkul";
            return "Diğer";
        };

        const ensureGroup = (key: string) => {
            if (!groups[key]) {
                groups[key] = { startValue: 0, endValue: 0, netFlow: 0 };
            }
        };

        // 1. Calculate Net Flow for the period (Grouped)
        periodTxs.forEach(t => {
            const key = getGroupKey(t.assetType);
            ensureGroup(key);
            if (t.type === 'buy') {
                groups[key].netFlow += Number(t.totalAmount);
            } else if (t.type === 'sell') {
                groups[key].netFlow -= Number(t.totalAmount);
            }
        });

        // 2. Identify Phantom Assets (Sold completely in last 30 days)
        const phantomMap = new Map<string, { name: string, type: string, txs: Transaction[] }>();
        periodTxs.forEach(t => {
            if (t.assetId && !assets.find(a => a.id === t.assetId)) {
                if (!phantomMap.has(t.assetId)) {
                    phantomMap.set(t.assetId, {
                        name: t.assetName || "Unknown",
                        type: t.assetType || "other",
                        txs: []
                    });
                }
                phantomMap.get(t.assetId)?.txs.push(t);
            }
        });

        // 3. Prepare Fetch List (Current + Phantom)
        const itemsToFetch: any[] = [];
        assets.forEach(a => {
            if (a.symbol) {
                itemsToFetch.push({ symbol: a.symbol, type: a.type, startDate: thirtyDaysAgo.toISOString().split('T')[0] });
            }
        });
        // Phantom Assets cannot fetch history easily without symbol, falling back to Avg Sell Price logic below.

        // 4. Batch Fetch History
        let historyData: Record<string, { date: string, price: number }[]> = {};
        if (itemsToFetch.length > 0) {
            try {
                const scriptPath = path.join(__dirname, 'fetch-asset-history.py');
                const jsonArg = JSON.stringify(itemsToFetch).replace(/"/g, '\\"');
                const result = await execAsync(`python3 ${scriptPath} "${jsonArg}"`, { timeout: 45000 });
                historyData = JSON.parse(result.stdout);
            } catch (e) {
                console.error("Batch history fetch failed:", e);
            }
        }

        // 5. Calculate Start & End Values (Grouped)

        // A) Current Assets
        assets.forEach(a => {
            const key = getGroupKey(a.type);
            ensureGroup(key);

            // End Value
            groups[key].endValue += (Number(a.quantity) * Number(a.currentPrice));

            // Start Value Calculation
            const hist = historyData[a.symbol || ""] || [];
            let priceT30 = Number(a.purchasePrice);

            if (hist.length > 0) {
                hist.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
                priceT30 = hist[0].price;
            } else {
                // Fallback: Use Current Price (Assume 0% change)
                priceT30 = Number(a.currentPrice);
            }

            // Reconstruct Quantity at T-30
            let qtyT30 = Number(a.quantity);
            const assetTxs = periodTxs.filter(t => t.assetId === a.id);
            assetTxs.forEach(t => {
                if (t.type === 'buy') qtyT30 -= Number(t.quantity);
                if (t.type === 'sell') qtyT30 += Number(t.quantity);
            });

            if (qtyT30 > 0) {
                groups[key].startValue += qtyT30 * priceT30;
            }
        });

        // B) Phantom Assets (Add to Start Value)
        phantomMap.forEach((info, id) => {
            const key = getGroupKey(info.type);
            ensureGroup(key);

            let qtyT30 = 0;
            info.txs.forEach(t => {
                if (t.type === 'buy') qtyT30 -= Number(t.quantity);
                if (t.type === 'sell') qtyT30 += Number(t.quantity);
            });

            if (qtyT30 > 0) {
                // Determine price: Use Avg Sell Price as fallback
                const sells = info.txs.filter(t => t.type === 'sell');
                let avgSellPrice = 0;
                if (sells.length > 0) {
                    const totalSellAmt = sells.reduce((sum, t) => sum + Number(t.totalAmount), 0);
                    const totalSellQty = sells.reduce((sum, t) => sum + Number(t.quantity), 0);
                    avgSellPrice = totalSellQty > 0 ? totalSellAmt / totalSellQty : 0;
                }
                groups[key].startValue += qtyT30 * avgSellPrice;
            }
        });

        // 6. Aggregate Results
        const breakdown: Record<string, { amount: number, percentage: number }> = {};
        let totalProfit = 0;
        let totalStartValue = 0; // Needed for total percentage, NOT (end - profit)
        // Actually Total Percentage = (Total Profit / Total Start Value) * 100
        // Wait, start value logic? 
        // Profit = End - Start - NetFlow.
        // So Total Start = Sum(Start). 

        // Let's iterate groups
        for (const [key, data] of Object.entries(groups)) {
            const profit = data.endValue - data.startValue - data.netFlow;
            const pct = data.startValue > 0 ? (profit / data.startValue) * 100 : 0;

            breakdown[key] = { amount: profit, percentage: pct };

            totalProfit += profit;
            totalStartValue += data.startValue;
        }

        const totalPercentage = totalStartValue > 0 ? (totalProfit / totalStartValue) * 100 : 0;

        return {
            total: { amount: totalProfit, percentage: totalPercentage },
            breakdown
        };

    } catch (e) {
        console.error("Monthly change calc error:", e);
        return {
            total: { amount: 0, percentage: 0 },
            breakdown: {}
        };
    }
}
