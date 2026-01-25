import {
  users,
  assets,
  transactions,
  performanceSnapshots,
  usStocks,
  bistStocks,
  accounts,
  categories,
  cashTransactions,
  budgetTargets,
  type User,
  type UpsertUser,
  type Asset,
  type InsertAsset,
  type Transaction,
  type InsertTransaction,
  type PerformanceSnapshot,
  type USStock,
  type BISTStock,
  type Account,
  type InsertAccount,
  type Category,
  type InsertCategory,
  type CashTransaction,
  type InsertCashTransaction,
  type BudgetTarget,
  type InsertBudget,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, and, sql } from "drizzle-orm";

const parseExchangeRate = (rate: any): number => {
  if (!rate) return 1;
  const str = String(rate).replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? 1 : num;
};

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

  // Transaction operations (Asset Trading)
  getTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: string): Promise<boolean>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteAllTransactions(userId: string): Promise<void>;

  // Performance snapshot operations
  getPerformanceSnapshots(userId: string): Promise<PerformanceSnapshot[]>;
  createOrUpdatePerformanceSnapshot(userId: string, month: string, totalAssets: number, totalDebt: number, netWorth: number): Promise<PerformanceSnapshot>;

  // Accounts Operations
  getAccounts(userId: string): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  createAccount(userId: string, account: InsertAccount, openingDate?: Date, exchangeRate?: number): Promise<Account>;
  updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  // Categories Operations
  getCategories(userId: string): Promise<Category[]>;
  createCategory(userId: string, category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Cash Transactions Operations
  getCashTransactions(userId: string): Promise<CashTransaction[]>;
  createCashTransaction(userId: string, transaction: InsertCashTransaction): Promise<CashTransaction>;
  createCashTransactionsBulk(userId: string, transactions: InsertCashTransaction[]): Promise<CashTransaction[]>;
  updateCashTransaction(id: string, transaction: Partial<InsertCashTransaction>): Promise<CashTransaction>;
  deleteCashTransaction(id: string): Promise<void>;

  // Budget Operations
  getBudgets(userId: string): Promise<BudgetTarget[]>;
  createBudget(userId: string, budget: InsertBudget): Promise<BudgetTarget>;
  updateBudget(id: string, budget: Partial<InsertBudget>): Promise<BudgetTarget>;
  deleteBudget(id: string): Promise<void>;

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

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }

  async updateTransaction(id: string, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(transactionData)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async deleteAllTransactions(userId: string): Promise<void> {
    // Delete all data related to the user's portfolio
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(assets).where(eq(assets.userId, userId));
    await db.delete(performanceSnapshots).where(eq(performanceSnapshots.userId, userId));
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

  async searchBISTStocks(query: string): Promise<BISTStock[]> {
    return await db
      .select()
      .from(bistStocks)
      .where(ilike(bistStocks.symbol, `${query.toUpperCase()}%`))
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

  // Accounts Operations
  async getAccounts(userId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async createAccount(userId: string, account: InsertAccount, openingDate?: Date, exchangeRate?: number): Promise<Account> {
    // Normalize balance input (handle comma -> dot)
    let balanceStr = String(account.balance);
    if (balanceStr.includes(',')) {
      balanceStr = balanceStr.replace(',', '.');
    }
    const initialBalance = Number(balanceStr);

    // Create account with 0 balance initially
    const accountToInsert = { ...account, balance: "0" };

    // Explicitly set validation/parsing for NaN
    if (isNaN(initialBalance)) {
      console.error("Invalid initial balance:", account.balance);
      // Fallback or just proceed with 0? Let's proceed with 0 if valid.
    }

    const [newAccount] = await db
      .insert(accounts)
      .values({ ...accountToInsert, userId })
      .returning();

    if (!isNaN(initialBalance) && initialBalance !== 0) {
      // Create 'income' or 'expense' based on sign
      // Since createCashTransaction adds to balance, we just pass positive amount
      // and let type determine direction. 
      // Actually if user enters -100, we want final balance -100.
      // type='expense', amount=100 -> balance - 100 = -100. Correct.
      // type='income', amount=100 -> balance + 100 = 100. Correct.

      const type = initialBalance >= 0 ? 'income' : 'expense';
      // FIX: Use the signed balance directly. 
      // "Sum as is" logic requires negative amount for negative balance.
      const signedAmount = initialBalance.toString();

      await this.createCashTransaction(userId, {
        accountId: newAccount.id,
        amount: signedAmount,
        type: type,
        description: 'Açılış Bakiyesi',
        date: openingDate || new Date(),
        exchangeRate: exchangeRate?.toString(),
        categoryId: null // No category for opening balance
      });
    }

    // Return the fresh account (refetching might be needed if transaction updated it, 
    // but createCashTransaction updates DB, not the object we have).
    // Let's refetch to be sure of balance.
    return (await this.getAccount(newAccount.id))!;
  }

  async updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account> {
    const [updated] = await db
      .update(accounts)
      .set({ ...account, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return updated;
  }

  async deleteAccount(id: string): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  // Categories Operations
  async getCategories(userId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.userId, userId));
  }

  async createCategory(userId: string, category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values({ ...category, userId })
      .returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Cash Transactions Operations
  async getCashTransactions(userId: string): Promise<CashTransaction[]> {
    return await db
      .select()
      .from(cashTransactions)
      .where(eq(cashTransactions.userId, userId))
      .orderBy(desc(cashTransactions.date));
  }

  async createCashTransaction(userId: string, transaction: InsertCashTransaction): Promise<CashTransaction> {
    const [newTx] = await db
      .insert(cashTransactions)
      .values({ ...transaction, userId })
      .returning();

    // Update account balance
    const amount = Number(transaction.amount);
    const account = await db.select().from(accounts).where(eq(accounts.id, transaction.accountId)).limit(1);

    if (account.length > 0) {
      let newBalance = Number(account[0].balance);
      console.log(`[TX_DEBUG] Source Account: ${account[0].name}, Type: ${transaction.type}, Amount: ${amount}`);

      // Logic Refactor: "Sum as is"
      // Income: Ensure positive
      // Expense/Transfer: Ensure negative (outflow from source)

      let signedAmount = amount;
      // Logic Refactor: "Sum as is" - User Input Trusted.
      // We do NOT enforce sign based on type anymore.
      // If user sends -100, it is -100. If +100, it is +100.
      // Derived type logic for consistency if needed, but we trust the amount.

      // Auto-correct type if implementation requires it, or just trust?
      // User asked to trust "Sum as is".

      // We still update the DB record if we mistakenly saved it unsigned previously?
      // No, we assume input is correct now.

      // Update DB Balance
      newBalance += signedAmount;

      if (transaction.type === 'transfer' && transaction.toAccountId) {
        // Update destination account
        const toAccount = await db.select().from(accounts).where(eq(accounts.id, transaction.toAccountId)).limit(1);
        console.log(`[TX_DEBUG] Transfer target found: ${toAccount.length > 0}`);

        if (toAccount.length > 0) {
          let toBalance = Number(toAccount[0].balance);
          // Transfer Logic:
          // Standard Transfer OUT from Source is Negative.
          // Target should receive Positive.
          // So we add ABS(amount). 
          // If Transfer IN (positive amount on source?), then Target should send? 
          // Let's assume standard Transfer is Outflow (-). Target gets +ABS.
          // Is this robust? 
          // If user corrects a transfer to be +100 (Refund?), Source +100.
          // If transfer, revert target account
          // Target effect was: balance += -(amount) * Rate.
          // Revert: balance -= -(amount) * Rate => balance += (amount) * Rate.
          // Wait.
          // If amount = -100. Target Effect = -(-100) = +100.
          // Revert: We want to remove +100. So we subtract 100.
          // Formula: - (-amount * rate) = + amount * rate.
          // Let's assume standard logic:
          // Revert Amount = -(Effect Amount).
          // Effect Amount = -(amount) * Rate.
          // Revert Amount = amount * Rate.

          const rate = parseExchangeRate(transaction.exchangeRate);
          const targetEffect = -(signedAmount) * rate; // Original logic for target effect

          toBalance += targetEffect; // Apply the target effect
          await db.update(accounts).set({ balance: toBalance.toString() }).where(eq(accounts.id, transaction.toAccountId));
        }
      }

      await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, transaction.accountId));
    }

    return newTx;
  }

  async createCashTransactionsBulk(userId: string, transactions: InsertCashTransaction[]): Promise<CashTransaction[]> {
    if (transactions.length === 0) return [];

    // 1. Insert all transactions
    const newTxs = await db
      .insert(cashTransactions)
      .values(transactions.map(t => ({ ...t, userId })))
      .returning();

    // 2. Aggregate balance changes
    // 2. Aggregate balance changes
    const accountChanges: Record<string, number> = {};

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const accId = tx.accountId;

      if (!accountChanges[accId]) accountChanges[accId] = 0;

      // Logic: "Sum as is". Trust the sign.
      accountChanges[accId] += amount;

      if (tx.type === 'transfer' && tx.toAccountId) {
        const toId = tx.toAccountId;
        if (!accountChanges[toId]) accountChanges[toId] = 0;

        // Helper to parse rate safely (inline or ensure parseExchangeRate is available)
        const parseRate = (val: any) => {
          if (!val) return 1;
          const s = val.toString().replace(',', '.');
          const n = parseFloat(s);
          return isNaN(n) ? 1 : n;
        };

        const rate = parseRate(tx.exchangeRate);
        // Target effect is opposite of source amount
        accountChanges[toId] += -(amount * rate);
      }
    }

    // 3. Update accounts
    for (const [accId, change] of Object.entries(accountChanges)) {
      if (change === 0) continue;

      const account = await db.select().from(accounts).where(eq(accounts.id, accId)).limit(1);
      if (account.length > 0) {
        const newBalance = Number(account[0].balance) + change;
        await db.update(accounts).set({ balance: newBalance.toString() }).where(eq(accounts.id, accId));
      }
    }

    return newTxs;
  }

  async updateCashTransaction(id: string, transaction: Partial<InsertCashTransaction>): Promise<CashTransaction> {
    const [oldTx] = await db.select().from(cashTransactions).where(eq(cashTransactions.id, id)).limit(1);
    if (!oldTx) throw new Error("Transaction not found");

    // Local Helper for parsing
    const parseRate = (val: any) => {
      if (!val) return 1;
      const s = val.toString().replace(',', '.');
      const n = parseFloat(s);
      return isNaN(n) ? 1 : n;
    };

    // Helper to update balance
    const updateBalance = async (accId: string, delta: number) => {
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, accId)).limit(1);
      if (acc) {
        const newBal = Number(acc.balance) + delta;
        await db.update(accounts).set({ balance: newBal.toString() }).where(eq(accounts.id, accId));
      }
    };

    // 1. Revert Old Effect
    // Logic: "Sum as is". Effect was (+Amount). Revert is (-Amount).
    const oldAmount = Number(oldTx.amount);

    // Source Revert: Simply subtract the signed amount.
    // If it was Expense (-100), we subtract -100 => +100 (Correct).
    // If it was Income (+100), we subtract +100 => -100 (Correct).
    await updateBalance(oldTx.accountId, -oldAmount);

    // Target Revert (if Transfer)
    if (oldTx.type === 'transfer' && oldTx.toAccountId) {
      // Target Effect was: -(Amount) * Rate.
      // Revert: - ( -(Amount) * Rate ) => + (Amount) * Rate.
      const rate = parseRate(oldTx.exchangeRate);
      const targetRevert = oldAmount * rate;
      await updateBalance(oldTx.toAccountId, targetRevert);
    }

    // 2. Update Transaction Record
    const [updated] = await db
      .update(cashTransactions)
      .set(transaction)
      .where(eq(cashTransactions.id, id))
      .returning();

    // 3. Apply New Effect
    const finalAmount = Number(updated.amount);
    const finalAccountId = updated.accountId;

    // Source Apply: Add the signed amount.
    await updateBalance(finalAccountId, finalAmount);

    // Target Apply (if Transfer)
    // Note: We use the UPDATED fields (including toAccountId if changed)
    if (updated.type === 'transfer' && updated.toAccountId) {
      const rate = parseRate(updated.exchangeRate);
      // Target Effect: -(Amount) * Rate.
      const targetEffect = -(finalAmount) * rate;
      await updateBalance(updated.toAccountId, targetEffect);
    }

    return updated;
  }

  async deleteCashTransaction(id: string): Promise<void> {
    // 1. Fetch existing transaction
    const [tx] = await db.select().from(cashTransactions).where(eq(cashTransactions.id, id)).limit(1);
    if (!tx) return; // Already deleted?

    const amount = Number(tx.amount);

    // Helper to update balance
    const updateBalance = async (accId: string, delta: number) => {
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, accId)).limit(1);
      if (acc) {
        const newBal = Number(acc.balance) + delta;
        await db.update(accounts).set({ balance: newBal.toString() }).where(eq(accounts.id, accId));
      }
    };

    // 2. Revert effect
    // 2. Revert effect
    // "Sum as is". Revert means simply subtracting the amount.
    // If it was Income (+100), we subtract 100.
    // If it was Expense (-100), we subtract -100 (Add 100).
    // If it was Transfer Out (-100), we subtract -100 (Add 100) to Source.

    await updateBalance(tx.accountId, -amount);

    if (tx.type === 'transfer' && tx.toAccountId) {
      const parseRate = (val: any) => {
        if (!val) return 1;
        const s = val.toString().replace(',', '.');
        const n = parseFloat(s);
        return isNaN(n) ? 1 : n;
      };
      const rate = parseRate(tx.exchangeRate);

      // Target Effect was: -(Amount) * Rate.
      // Revert Target: - ( -(Amount) * Rate ) = Amount * Rate.
      await updateBalance(tx.toAccountId, amount * rate);
    }

    // 3. Delete record
    await db.delete(cashTransactions).where(eq(cashTransactions.id, id));
  }

  // Opening Balance Helper
  async getAccountOpeningTransaction(accountId: string): Promise<CashTransaction | undefined> {
    const txs = await db.select().from(cashTransactions).where(
      and(
        eq(cashTransactions.accountId, accountId),
        ilike(cashTransactions.description, 'Açılış Bakiyesi%')
      )
    ).limit(1);
    return txs[0];
  }

  // Budget Operations
  async getBudgets(userId: string): Promise<BudgetTarget[]> {
    return await db.select().from(budgetTargets).where(eq(budgetTargets.userId, userId));
  }

  async createBudget(userId: string, budget: InsertBudget): Promise<BudgetTarget> {
    const [newBudget] = await db
      .insert(budgetTargets)
      .values({ ...budget, userId })
      .returning();
    return newBudget;
  }

  async updateBudget(id: string, budget: Partial<InsertBudget>): Promise<BudgetTarget> {
    const [updated] = await db
      .update(budgetTargets)
      .set(budget)
      .where(eq(budgetTargets.id, id))
      .returning();
    return updated;
  }

  async deleteBudget(id: string): Promise<void> {
    await db.delete(budgetTargets).where(eq(budgetTargets.id, id));
  }
}

export const storage = new DatabaseStorage();
