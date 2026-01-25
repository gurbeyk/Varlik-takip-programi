
import { db } from "./db";
import { transactions } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

const symbolMap: Record<string, string> = {
    "tesla": "TSLA",
    "Apple Inc.": "AAPL",
    "Neumora Therapeutics, Inc.": "NMRA",
    "Meta Platforms, Inc.": "META",
    "Mattel, Inc.": "MAT",
    "Oric Pharmaceuticals, Inc.": "ORIC",
    "Match Group, Inc.": "MTCH",
    "Silicon Laboratories, Inc.": "SLAB",
    "Amazon.com, Inc.": "AMZN",
    "Alphabet Inc.": "GOOGL",
    "Bruker Corporation": "BRKR",
    "Okta, Inc.": "OKTA",
    "SentinelOne, Inc.": "S",
    "Incannex Healthcare Inc.": "IXHL",
    "BioXcel Therapeutics, Inc.": "BTAI",
    "Ondas Holdings Inc.": "ONDS",
    "Aurora Innovation, Inc.": "AUR",
    "Scorpio Tankers Inc.": "STNG",
    "The Hartford Insurance Group, Inc.": "HIG",
    "Draganfly Inc.": "DPRO",
    "Roblox Corporation": "RBLX",
    "Microsoft Corporation": "MSFT",
    "Spotify Technology S.A.": "SPOT",
    "Walmart Inc.": "WMT",
    "UnitedHealth Group Incorporated": "UNH",
    "Verizon Communications Inc.": "VZ",
    "Super Micro Computer, Inc.": "SMCI",
    "Saia, Inc.": "SAIA",
    "Micron Technology, Inc.": "MU",
    "Fox Corporation": "FOXA",
    "ASML Holding N.V. - New York Registry Shares": "ASML",
    "United Microelectronics Corporation (NEW)": "UMC",
    "Applied Materials, Inc.": "AMAT",
    "Robinhood Markets, Inc.": "HOOD",
    "Rigetti Computing, Inc.": "RGTI",
    "Arqit Quantum Inc.": "ARQQ",
    "Oklo Inc.": "OKLO",
    "Zeta Global Holdings Corp.": "ZETA",
    "Oracle Corporation": "ORCL",
    "Invesco S&P 500 Momentum ETF": "SPMO",
    "Intel Corporation": "INTC",
    "Cameco Corporation": "CCJ",
    "NextEra Energy, Inc.": "NEE",
    "Eli Lilly and Company": "LLY",
    "Lumen Technologies, Inc.": "LUMN",
    "Freedom Holding Corp.": "FRHC",
    "Black Diamond Therapeutics, Inc.": "BDTX",
    "Autonomix Medical, Inc.": "AMIX",
    "Proshares Ultrapro QQQ": "TQQQ",
    "Proshares Ultrapor shorts": "SQQQ"
};

async function applyFix() {
    console.log("Applying symbol fixes...");
    let count = 0;

    for (const [name, symbol] of Object.entries(symbolMap)) {
        const result = await db
            .update(transactions)
            .set({ symbol: symbol })
            .where(eq(transactions.assetName, name))
            .returning();

        if (result.length > 0) {
            console.log(`Updated ${result.length} transactions for ${name} -> ${symbol}`);
            count += result.length;
        }
    }

    console.log(`Total transactions updated: ${count}`);
    process.exit(0);
}

applyFix().catch(console.error);
