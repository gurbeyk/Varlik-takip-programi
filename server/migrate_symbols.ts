
import { db } from "./db";
import { transactions, assets, usStocks, bistStocks } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

async function migrate() {
    console.log("Starting symbol migration...");

    const allTransactions = await db.select().from(transactions);
    let updatedCount = 0;

    for (const t of allTransactions) {
        if (t.symbol) continue; // Already has symbol

        let newSymbol = null;

        // 1. Try to fund from linked Asset
        if (t.assetId) {
            const [asset] = await db.select().from(assets).where(eq(assets.id, t.assetId));
            if (asset && asset.symbol) {
                newSymbol = asset.symbol;
            }
        }

        // 2. If no asset link, try to find by Name in US Stocks
        if (!newSymbol && t.assetName) {
            const [usStock] = await db.select().from(usStocks).where(eq(usStocks.name, t.assetName));
            if (usStock) {
                newSymbol = usStock.symbol;
            }
        }

        // 3. Try BIST Stocks
        if (!newSymbol && t.assetName) {
            const [bistStock] = await db.select().from(bistStocks).where(eq(bistStocks.name, t.assetName));
            if (bistStock) {
                newSymbol = bistStock.symbol;
            }
        }

        if (newSymbol) {
            await db.update(transactions)
                .set({ symbol: newSymbol })
                .where(eq(transactions.id, t.id));
            updatedCount++;
            console.log(`Updated transaction ${t.id}: ${t.assetName} -> ${newSymbol}`);
        } else {
            console.log(`Could not find symbol for transaction ${t.id}: ${t.assetName}`);
        }
    }

    console.log(`Migration completed. Updated ${updatedCount} transactions.`);
    process.exit(0);
}

migrate().catch(console.error);
