import {
  users,
  assets,
  transactions,
  performanceSnapshots,
  usStocks,
  bistStocks,
  type User,
  type UpsertUser,
  type Asset,
  type InsertAsset,
  type Transaction,
  type InsertTransaction,
  type PerformanceSnapshot,
  type USStock,
  type BISTStock,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Asset operations
  getAssets(userId: string): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(userId: string, asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  
  // Transaction operations
  getTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  
  // Performance snapshot operations
  getPerformanceSnapshots(userId: string): Promise<PerformanceSnapshot[]>;
  createOrUpdatePerformanceSnapshot(userId: string, month: string, totalAssets: number, totalDebt: number, netWorth: number): Promise<PerformanceSnapshot>;
  
  // US Stocks operations
  searchUSStocks(query: string): Promise<USStock[]>;
  seedUSStocks(): Promise<void>;

  // BIST Stocks operations
  searchBISTStocks(query: string): Promise<BISTStock[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Asset operations
  async getAssets(userId: string): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.createdAt));
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async createAsset(userId: string, assetData: InsertAsset): Promise<Asset> {
    const [asset] = await db
      .insert(assets)
      .values({ ...assetData, userId })
      .returning();
    return asset;
  }

  async updateAsset(id: string, assetData: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [asset] = await db
      .update(assets)
      .set({ ...assetData, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return asset || undefined;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id)).returning();
    return result.length > 0;
  }

  // Transaction operations
  async getTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(userId: string, transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values({ ...transactionData, userId })
      .returning();
    return transaction;
  }

  // Performance snapshot operations
  async getPerformanceSnapshots(userId: string): Promise<PerformanceSnapshot[]> {
    return await db
      .select()
      .from(performanceSnapshots)
      .where(eq(performanceSnapshots.userId, userId))
      .orderBy(performanceSnapshots.month);
  }

  async createOrUpdatePerformanceSnapshot(
    userId: string, 
    month: string, 
    totalAssets: number, 
    totalDebt: number, 
    netWorth: number
  ): Promise<PerformanceSnapshot> {
    // Check if snapshot exists for this month
    const existing = await db
      .select()
      .from(performanceSnapshots)
      .where(and(
        eq(performanceSnapshots.userId, userId),
        eq(performanceSnapshots.month, month)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [snapshot] = await db
        .update(performanceSnapshots)
        .set({
          totalAssets: totalAssets.toString(),
          totalDebt: totalDebt.toString(),
          netWorth: netWorth.toString(),
        })
        .where(eq(performanceSnapshots.id, existing[0].id))
        .returning();
      return snapshot;
    }

    const [snapshot] = await db
      .insert(performanceSnapshots)
      .values({
        userId,
        month,
        totalAssets: totalAssets.toString(),
        totalDebt: totalDebt.toString(),
        netWorth: netWorth.toString(),
      })
      .returning();
    return snapshot;
  }

  // US Stocks operations
  async searchUSStocks(query: string): Promise<USStock[]> {
    return await db
      .select()
      .from(usStocks)
      .where(ilike(usStocks.symbol, `${query.toUpperCase()}%`))
      .limit(20);
  }

  async seedUSStocks(): Promise<void> {
    // Check if stocks already exist
    const existing = await db.select().from(usStocks).limit(1);
    if (existing.length > 0) return; // Already seeded

    const stocks = [
      { symbol: 'AAPL', name: 'Apple Inc' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'GOOGL', name: 'Alphabet Inc (Google)' },
      { symbol: 'AMZN', name: 'Amazon.com Inc' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'TSLA', name: 'Tesla Inc' },
      { symbol: 'META', name: 'Meta Platforms Inc' },
      { symbol: 'GOOG', name: 'Alphabet Inc (Google Class C)' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc' },
      { symbol: 'JNJ', name: 'Johnson & Johnson' },
      { symbol: 'V', name: 'Visa Inc' },
      { symbol: 'WMT', name: 'Walmart Inc' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co' },
      { symbol: 'MA', name: 'Mastercard Incorporated' },
      { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
      { symbol: 'PG', name: 'Procter & Gamble Co' },
      { symbol: 'HD', name: 'The Home Depot Inc' },
      { symbol: 'INTC', name: 'Intel Corporation' },
      { symbol: 'AMD', name: 'Advanced Micro Devices Inc' },
      { symbol: 'IBM', name: 'International Business Machines' },
      { symbol: 'CISCO', name: 'Cisco Systems Inc' },
      { symbol: 'ORCL', name: 'Oracle Corporation' },
      { symbol: 'NFLX', name: 'Netflix Inc' },
      { symbol: 'DIS', name: 'The Walt Disney Company' },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc' },
      { symbol: 'UBER', name: 'Uber Technologies Inc' },
      { symbol: 'SPOT', name: 'Spotify Technology SA' },
      { symbol: 'AIRB', name: 'Airbnb Inc' },
      { symbol: 'BA', name: 'The Boeing Company' },
      { symbol: 'CAT', name: 'Caterpillar Inc' },
      { symbol: 'MMM', name: '3M Company' },
      { symbol: 'MCD', name: "McDonald's Corporation" },
      { symbol: 'KO', name: 'The Coca-Cola Company' },
      { symbol: 'PEP', name: 'PepsiCo Inc' },
      { symbol: 'LMT', name: 'Lockheed Martin Corporation' },
      { symbol: 'RTX', name: 'RTX Corporation (Raytheon)' },
      { symbol: 'GE', name: 'General Electric Company' },
      { symbol: 'MRK', name: 'Merck & Co Inc' },
      { symbol: 'LLY', name: 'Eli Lilly and Company' },
      { symbol: 'CVX', name: 'Chevron Corporation' },
    ];

    await db.insert(usStocks).values(stocks);
  }
}

export const storage = new DatabaseStorage();
