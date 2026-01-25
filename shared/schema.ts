import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  text,
  boolean as pgBoolean,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// US Stocks reference table
export const usStocks = pgTable(
  "us_stocks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    symbol: varchar("symbol", { length: 10 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("IDX_us_stocks_symbol").on(table.symbol)]
);

export type USStock = typeof usStocks.$inferSelect;

// BIST Stocks reference table
export const bistStocks = pgTable(
  "bist_stocks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    symbol: varchar("symbol", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("IDX_bist_stocks_symbol").on(table.symbol)]
);

export type BISTStock = typeof bistStocks.$inferSelect;

// Asset types enum
export const assetTypes = ['hisse', 'abd-hisse', 'etf', 'kripto', 'gayrimenkul', 'fon', 'befas'] as const;
export type AssetType = typeof assetTypes[number];

// Asset type labels
export const assetTypeLabels: Record<AssetType, string> = {
  'hisse': 'BİST Hisse Senedi',
  'abd-hisse': 'ABD Hisse Senedi',
  'etf': 'ETF',
  'kripto': 'Kripto Para',
  'gayrimenkul': 'Gayrimenkul',
  'fon': 'TEFAS Fonu',
  'befas': 'BEFAS (Emeklilik) Fonu',
};

// Assets table for portfolio tracking
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // hisse, abd-hisse, etf, kripto, gayrimenkul
  symbol: varchar("symbol", { length: 50 }),
  platform: varchar("platform", { length: 50 }), // Legacy / Separator support
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  purchasePrice: decimal("purchase_price", { precision: 18, scale: 8 }).notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('TRY'),
  purchaseDate: timestamp("purchase_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const baseAssetSchema = createInsertSchema(assets).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetSchema = baseAssetSchema.extend({
  purchaseDate: z.union([
    z.date(),
    z.string().transform((val) => val ? new Date(val) : undefined).nullable(),
    z.null(),
    z.undefined()
  ]).optional(),
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Transactions table for transaction history
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assetId: varchar("asset_id").references(() => assets.id, { onDelete: 'set null' }),
  type: varchar("type", { length: 20 }).notNull(), // buy, sell
  symbol: varchar("symbol", { length: 50 }), // Legacy support
  assetName: varchar("asset_name", { length: 255 }).notNull(),
  assetType: varchar("asset_type", { length: 50 }).notNull(),
  platform: varchar("platform", { length: 50 }), // Legacy support
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).notNull(),
  realizedPnL: decimal("realized_pnl", { precision: 18, scale: 2 }).default('0'), // Realized P&L for sell transactions
  currency: varchar("currency", { length: 10 }).default('TRY'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  userId: true,
}).extend({
  createdAt: z.union([
    z.date(),
    z.string().transform((val) => val ? new Date(val) : undefined).nullable(),
    z.null(),
    z.undefined()
  ]).optional(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Monthly performance snapshots for charts
export const performanceSnapshots = pgTable("performance_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format
  totalAssets: decimal("total_assets", { precision: 18, scale: 2 }).notNull(),
  totalDebt: decimal("total_debt", { precision: 18, scale: 2 }).default('0'),
  netWorth: decimal("net_worth", { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PerformanceSnapshot = typeof performanceSnapshots.$inferSelect;

// Accounts table (Bank, Cash, Investment, etc.)
export const accountTypes = ['bank', 'cash', 'investment', 'credit_card', 'other'] as const;
export type AccountType = typeof accountTypes[number];

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // bank, cash, investment
  balance: decimal("balance", { precision: 18, scale: 2 }).default('0').notNull(),
  currency: varchar("currency", { length: 10 }).default('TRY'),
  color: varchar("color", { length: 7 }), // For UI
  isActive: pgBoolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Categories table for Income/Expense
export const categoryTypes = ['income', 'expense', 'transfer'] as const;
export type CategoryType = typeof categoryTypes[number];

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // income, expense
  parentId: varchar("parent_id"),
  color: varchar("color", { length: 7 }),
  icon: varchar("icon", { length: 50 }),
  isSystem: pgBoolean("is_system").default(false), // For default categories
}, (table) => ({
  parentFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
  }).onDelete('cascade'),
}));

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  userId: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Cash Transactions (Income/Expense/Transfer)
export const cashTransactions = pgTable("cash_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: 'set null' }),
  toAccountId: varchar("to_account_id").references(() => accounts.id, { onDelete: 'set null' }), // For transfers
  type: varchar("type", { length: 20 }).notNull(), // income, expense, transfer
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 6 }).default('1'), // For transfers between currencies
  description: varchar("description", { length: 255 }),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCashTransactionSchema = createInsertSchema(cashTransactions).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  date: z.union([
    z.date(),
    z.string().transform((val) => val ? new Date(val) : undefined),
  ]).optional(),
});

export type InsertCashTransaction = z.infer<typeof insertCashTransactionSchema>;
export type CashTransaction = typeof cashTransactions.$inferSelect;

// Budget Targets
export const budgetTargets = pgTable("budget_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  period: varchar("period", { length: 20 }).default('monthly'), // monthly, yearly
  month: varchar("month", { length: 7 }), // YYYY-MM
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgetTargets).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type BudgetTarget = typeof budgetTargets.$inferSelect;
