import {
  users,
  assets,
  transactions,
  performanceSnapshots,
  type User,
  type UpsertUser,
  type Asset,
  type InsertAsset,
  type Transaction,
  type InsertTransaction,
  type PerformanceSnapshot,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
      .where(eq(performanceSnapshots.userId, userId))
      .where(eq(performanceSnapshots.month, month));

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
}

export const storage = new DatabaseStorage();
