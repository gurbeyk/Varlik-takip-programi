import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  text,
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
  assetName: varchar("asset_name", { length: 255 }).notNull(),
  assetType: varchar("asset_type", { length: 50 }).notNull(),
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
