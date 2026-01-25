
import { db } from "./db";
import { transactions } from "@shared/schema";
import { isNull } from "drizzle-orm";

async function check() {
    const missing = await db.select().from(transactions).where(isNull(transactions.symbol));

    const names = new Set();
    missing.forEach(t => names.add(t.assetName));

    console.log("Unique Asset Names with missing symbols:");
    names.forEach(n => console.log(`- ${n}`));

    console.log(`\nTotal transactions missing symbols: ${missing.length}`);
    process.exit(0);
}

check().catch(console.error);
