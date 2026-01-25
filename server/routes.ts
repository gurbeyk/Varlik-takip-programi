
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertAssetSchema, type Asset, type Transaction, insertAccountSchema, insertCategorySchema, insertCashTransactionSchema, insertBudgetSchema } from "@shared/schema";
import { z } from "zod";
import { exec, execSync } from "child_process";
import * as util from "util";
import * as path from "path";
import { calculateXIRR, getBenchmarkReturn, calculatePeriodReturn, calculatePortfolioMonthlyChange } from "./analytics";
import { subMonths, subYears, isBefore, isAfter, parseISO } from "date-fns";

const execAsync = util.promisify(exec);

const __dirname = path.join(process.cwd(), 'server');

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Portfolio summary
  app.get('/api/portfolio/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assets = await storage.getAssets(userId);
      const snapshots = await storage.getPerformanceSnapshots(userId);

      // Calculate totals
      const totalAssets = assets.reduce((sum, asset) => {
        return sum + Number(asset.quantity) * Number(asset.currentPrice);
      }, 0);

      const totalDebt = 0; // For now, we don't track debt

      const netWorth = totalAssets - totalDebt;

      // Calculate monthly change using the robust Net Flow method
      const transactions = await storage.getTransactions(userId);
      const monthlyChangeResult = await calculatePortfolioMonthlyChange(assets, transactions);
      const monthlyChange = monthlyChangeResult.total.percentage;
      const monthlyChangeAmount = monthlyChangeResult.total.amount;
      const monthlyChangeBreakdown = monthlyChangeResult.breakdown;

      // Update current month snapshot (Keep this for historical tracking if needed, or maybe we don't need it as much now?)
      // Let's keep it for the chart history.
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await storage.createOrUpdatePerformanceSnapshot(userId, currentMonth, totalAssets, totalDebt, netWorth);

      res.json({
        totalAssets,
        totalDebt,
        netWorth,
        monthlyChange,
        monthlyChangeAmount,
        monthlyChangeBreakdown
      });
    } catch (error) {
      console.error("Error fetching portfolio summary:", error);
      res.status(500).json({ message: "Failed to fetch portfolio summary" });
    }
  });

  // Currency rate
  app.get('/api/currency-rate', async (req: any, res) => {
    try {
      const scriptPath = path.join(__dirname, 'fetch-currency-rate.py');
      const result = execSync(`python3 ${scriptPath} `, { encoding: 'utf-8' });
      const data = JSON.parse(result);
      res.json(data);
    } catch (error) {
      console.error("Error fetching currency rate:", error);
      res.status(500).json({ rate: 1 }); // Fallback to 1:1 if error
    }
  });

  // Asset name lookup (for US stocks and ETFs)
  app.get('/api/asset-name/:symbol', async (req: any, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase().trim();
      const scriptPath = path.join(__dirname, 'get-asset-name.py');
      const result = execSync(`python3 ${scriptPath} "${symbol}"`, { encoding: 'utf-8', timeout: 12000 });
      const data = JSON.parse(result);
      res.json(data);
    } catch (error) {
      console.error("Error fetching asset name:", error);
      res.json({ name: "Bilinmeyen Kod" });
    }
  });

  // Legacy ETF name lookup (redirect to asset-name)
  app.get('/api/etf-name/:symbol', async (req: any, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase().trim();
      const scriptPath = path.join(__dirname, 'get-asset-name.py');
      const result = execSync(`python3 ${scriptPath} "${symbol}"`, { encoding: 'utf-8', timeout: 12000 });
      const data = JSON.parse(result);
      res.json(data);
    } catch (error) {
      console.error("Error fetching ETF name:", error);
      res.json({ name: "Bilinmeyen Kod" });
    }
  });

  // Performance snapshots
  app.get('/api/portfolio/performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const snapshots = await storage.getPerformanceSnapshots(userId);
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  // Assets CRUD
  app.get('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assets = await storage.getAssets(userId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      // Verify ownership
      if (asset.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Validate request body
      const validatedData = insertAssetSchema.parse(req.body);

      // 1. Check for existing asset (Same Symbol/Type) to merge
      const allAssets = await storage.getAssets(userId);
      const existingAssets = allAssets.filter(a => {
        const sameType = a.type === validatedData.type;
        const sameSymbol = validatedData.symbol
          ? (a.symbol?.toUpperCase() === validatedData.symbol.toUpperCase())
          : (!a.symbol && a.name === validatedData.name);
        // Platform check: treat null/undefined/empty string as equivalent 'unknown' for relaxed matching, 
        // OR strict matching. Given the user wants separation, strict matching is better.
        // If existing is 'Midas' and new is undefined, do we merge? No, separate.
        // If existing is null and new is 'Midas', separate.
        // If both null, merge.
        const existingPlatform = a.platform || '';
        const newPlatform = validatedData.platform || '';
        const samePlatform = existingPlatform === newPlatform;

        return sameType && sameSymbol && samePlatform;
      });

      let finalAsset;

      if (existingAssets.length > 0) {
        // MERGE LOGIC (Perpetual Moving Average)
        // new_total_qty = old_qty + buy_qty
        // new_total_cost = old_total_cost + (buy_qty * buy_price)
        // new_avg_cost = new_total_cost / new_total_qty

        let oldTotalQty = 0;
        let oldTotalCost = 0;

        existingAssets.forEach(a => {
          oldTotalQty += Number(a.quantity);
          oldTotalCost += Number(a.quantity) * Number(a.purchasePrice);
        });

        const buyQty = Number(validatedData.quantity);
        const buyPrice = Number(validatedData.purchasePrice);
        const buyCost = buyQty * buyPrice;

        const newTotalQty = oldTotalQty + buyQty;
        const newTotalCost = oldTotalCost + buyCost;
        const newAvgCost = newTotalQty > 0 ? newTotalCost / newTotalQty : 0;

        console.log(`[BUY - MERGE] ${validatedData.symbol || validatedData.name}: OldQty = ${oldTotalQty}, OldAvg = ${oldTotalCost / oldTotalQty} -> NewQty=${newTotalQty}, NewAvg = ${newAvgCost} `);

        // Update the FIRST existing asset with new values
        const mainAssetId = existingAssets[0].id;
        finalAsset = await storage.updateAsset(mainAssetId, {
          quantity: newTotalQty.toString(),
          purchasePrice: newAvgCost.toString(),
          currentPrice: validatedData.currentPrice.toString(), // Update current market price too
        });

        // Delete other fragmented assets if any
        for (let i = 1; i < existingAssets.length; i++) {
          await storage.deleteAsset(existingAssets[i].id);
        }

      } else {
        // CREATE NEW if doesn't exist
        finalAsset = await storage.createAsset(userId, validatedData);
      }

      if (!finalAsset) {
        throw new Error("Failed to retrieve or create asset");
      }

      // Create a transaction record (History)
      await storage.createTransaction(userId, {
        assetId: finalAsset.id,
        type: 'buy',
        assetName: finalAsset.name,
        assetType: finalAsset.type,
        quantity: validatedData.quantity.toString(),
        price: validatedData.purchasePrice.toString(),
        totalAmount: (Number(validatedData.quantity) * Number(validatedData.purchasePrice)).toString(),
        currency: finalAsset.currency,
        realizedPnL: '0',
        createdAt: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : undefined,
      });

      res.status(201).json(finalAsset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error processing asset buy:", error);
      res.status(500).json({ message: "Failed to process asset buy" });
    }
  });

  app.patch('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Verify ownership
      const existingAsset = await storage.getAsset(req.params.id);
      if (!existingAsset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (existingAsset.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate request body
      const validatedData = insertAssetSchema.partial().parse(req.body);

      const asset = await storage.updateAsset(req.params.id, validatedData);
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  // Sell asset
  app.post('/api/assets/:id/sell', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sellPrice, sellQuantity, sellDate } = req.body;

      if (!sellPrice || Number(sellPrice) <= 0) {
        return res.status(400).json({ message: "Invalid sell price" });
      }

      if (!sellQuantity || Number(sellQuantity) <= 0) {
        return res.status(400).json({ message: "Invalid sell quantity" });
      }

      // Verify ownership
      const existingAsset = await storage.getAsset(req.params.id);
      if (!existingAsset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (existingAsset.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const totalQuantity = Number(existingAsset.quantity);
      const qtyToSell = Number(sellQuantity);
      const purchasePrice = Number(existingAsset.purchasePrice);
      const salePrice = Number(sellPrice);

      // Validate sell quantity
      if (qtyToSell > totalQuantity) {
        return res.status(400).json({ message: "Cannot sell more than available quantity" });
      }

      // Calculate realized P&L for sold portion
      const totalCostForSold = qtyToSell * purchasePrice;
      const totalRevenue = qtyToSell * salePrice;
      const realizedPnL = totalRevenue - totalCostForSold;

      // Create a sell transaction
      await storage.createTransaction(userId, {
        assetId: req.params.id,
        type: 'sell',
        assetName: existingAsset.name,
        assetType: existingAsset.type,
        quantity: qtyToSell.toString(),
        price: salePrice.toString(),
        totalAmount: totalRevenue.toString(),
        currency: existingAsset.currency,
        realizedPnL: realizedPnL.toString(),
        createdAt: sellDate ? new Date(sellDate) : undefined,
      });

      // If selling all quantity, delete the asset. Otherwise, update quantity
      if (qtyToSell === totalQuantity) {
        await storage.deleteAsset(req.params.id);
      } else {
        // Update asset with reduced quantity
        const remainingQuantity = totalQuantity - qtyToSell;
        await storage.updateAsset(req.params.id, {
          quantity: remainingQuantity.toString(),
        });
      }

      res.status(200).json({
        message: "Asset sold successfully",
        realizedPnL,
        soldQuantity: qtyToSell,
        remainingQuantity: qtyToSell === totalQuantity ? 0 : totalQuantity - qtyToSell,
      });
    } catch (error) {
      console.error("Error selling asset:", error);
      res.status(500).json({ message: "Failed to sell asset" });
    }
  });

  app.delete('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Verify ownership
      const existingAsset = await storage.getAsset(req.params.id);
      if (!existingAsset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (existingAsset.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Create a sell transaction before deleting (at current price, so no P&L)
      const quantity = Number(existingAsset.quantity);
      const currentPrice = Number(existingAsset.currentPrice);
      const purchasePrice = Number(existingAsset.purchasePrice);
      const totalRevenue = quantity * currentPrice;
      const totalCost = quantity * purchasePrice;
      const realizedPnL = totalRevenue - totalCost;

      await storage.createTransaction(userId, {
        assetId: null,
        type: 'sell',
        assetName: existingAsset.name,
        assetType: existingAsset.type,
        quantity: existingAsset.quantity,
        price: currentPrice.toString(),
        totalAmount: totalRevenue.toString(),
        currency: existingAsset.currency,
        realizedPnL: realizedPnL.toString(),
      });

      await storage.deleteAsset(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // US Stocks search
  app.get('/api/stocks/search', async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 1) {
        return res.json([]);
      }
      const stocks = await storage.searchUSStocks(query);
      res.json(stocks);
    } catch (error) {
      console.error("Error searching stocks:", error);
      res.status(500).json({ message: "Failed to search stocks" });
    }
  });

  // BIST Stocks search
  app.get('/api/stocks/bist-search', async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 1) {
        return res.json([]);
      }
      const stocks = await storage.searchBISTStocks(query);
      res.json(stocks);
    } catch (error) {
      console.error("Error searching BIST stocks:", error);
      res.status(500).json({ message: "Failed to search BIST stocks" });
    }
  });

  // Fetch TEFAS fund name from symbol
  app.get('/api/tefas-fund-name/:symbol', async (req: any, res) => {
    try {
      const symbol = req.params.symbol;
      const scriptPath = path.join(__dirname, 'fetch-tefas-fund-name.py');
      const result = execSync(`python3 ${scriptPath} "${symbol}"`, { encoding: 'utf-8', timeout: 15000 });
      const data = JSON.parse(result);

      if (data.name) {
        res.json({ name: data.name });
      } else {
        res.status(404).json({ error: "Fund not found" });
      }
    } catch (error) {
      console.error("Error fetching TEFAS fund name:", error);
      res.status(500).json({ error: "Failed to fetch fund name" });
    }
  });

  // BEFAS Fund search
  app.get('/api/befas/search', async (req: any, res) => {
    try {
      const query = (req.query.q as string || "").toUpperCase();
      const befasPath = path.join(__dirname, 'befas_funds.json');

      // Read the JSON file (cache this in production realistically, but fs read is fine for now)
      // or we can import it if it's static, but it's generated.
      const fs = await import('fs/promises');
      try {
        const data = await fs.readFile(befasPath, 'utf-8');
        const funds = JSON.parse(data);

        if (!query) {
          return res.json(funds.slice(0, 50));
        }

        const filtered = funds.filter((f: any) =>
          f.code.includes(query) || f.name.toUpperCase().includes(query)
        );
        res.json(filtered.slice(0, 50));
      } catch (e) {
        console.error("Error reading BEFAS file:", e);
        res.json([]);
      }
    } catch (error) {
      console.error("Error searching BEFAS funds:", error);
      res.status(500).json({ message: "Failed to search BEFAS funds" });
    }
  });

  // Fetch BEFAS fund name from symbol
  app.get('/api/befas-fund-name/:symbol', async (req: any, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const befasPath = path.join(__dirname, 'befas_funds.json');
      const fs = await import('fs/promises');

      try {
        const data = await fs.readFile(befasPath, 'utf-8');
        const funds = JSON.parse(data);
        const fund = funds.find((f: any) => f.code === symbol);

        if (fund) {
          res.json({ name: fund.name });
        } else {
          res.status(404).json({ error: "Fund not found" });
        }
      } catch (e) {
        res.status(404).json({ error: "Data not available" });
      }
    } catch (error) {
      console.error("Error fetching BEFAS fund name:", error);
      res.status(500).json({ error: "Failed to fetch fund name" });
    }
  });

  // Fetch historical price for a fund
  app.get('/api/asset-price-history', async (req: any, res) => {
    try {
      const { symbol, date } = req.query;
      if (!symbol || !date) {
        return res.status(400).json({ error: "Symbol and date are required" });
      }

      const scriptPath = path.join(__dirname, 'fetch-historical-price.py');
      // Use proper quoting for arguments
      const command = `python3 ${scriptPath} "${symbol.toString().toUpperCase()}" "${date.toString()}"`;

      const result = execSync(command, { encoding: 'utf-8', timeout: 15000 });
      try {
        const data = JSON.parse(result);
        if (data.price) {
          res.json({ price: data.price });
        } else {
          res.json({ error: data.error || "Price not found" });
        }
      } catch (e) {
        console.error("Historical price parse error:", e);
        res.status(500).json({ error: "Failed to parse price data" });
      }
    } catch (error) {
      console.error("Error fetching historical price:", error);
      res.status(500).json({ error: "Failed to fetch historical price" });
    }
  });

  // Fetch and update current price from public APIs
  app.post('/api/assets/:id/price', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assetId = req.params.id;

      // Verify ownership
      const asset = await storage.getAsset(assetId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      if (asset.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { symbol, type } = asset;
      if (!symbol) {
        return res.status(400).json({ message: "Asset has no symbol" });
      }

      let price = null;

      if (type === 'kripto') {
        // Crypto: use Python script with CoinGecko API and proper symbol mapping
        try {
          const scriptPath = path.join(__dirname, 'fetch-crypto-price.py');
          const result = execSync(`python3 ${scriptPath} "${symbol.toUpperCase()}"`, { encoding: 'utf-8', timeout: 10000 });
          const data = JSON.parse(result);
          if (data.price) {
            price = data.price;
          }
        } catch (e) {
          console.log(`Crypto price fetch failed for ${symbol}: `, e);
        }
      } else if (type === 'fon') {
        // TEFAS funds: use Python script with tefas-crawler library
        try {
          const scriptPath = path.join(__dirname, 'fetch-tefas-price.py');
          const result = execSync(`python3 ${scriptPath} "${symbol.toUpperCase()}"`, { encoding: 'utf-8', timeout: 30000 });
          const data = JSON.parse(result);
          if (data.price) {
            price = data.price;
          } else if (data.error) {
            console.log(`TEFAS error for ${symbol}: `, data.error);
          }
        } catch (e) {
          console.error(`TEFAS price fetch failed for ${symbol}: `, (e as Error).message);
        }
      } else if (type === 'befas') {
        // BEFAS funds: use Python script with tefas-crawler library (kind=EMK)
        try {
          const scriptPath = path.join(__dirname, 'fetch-befas-price.py');
          const result = execSync(`python3 ${scriptPath} "${symbol.toUpperCase()}"`, { encoding: 'utf-8', timeout: 30000 });
          const data = JSON.parse(result);
          if (data.price) {
            price = data.price;
          } else if (data.error) {
            console.log(`BEFAS error for ${symbol}: `, data.error);
          }
        } catch (e) {
          console.error(`BEFAS price fetch failed for ${symbol}: `, (e as Error).message);
        }
      } else if (type === 'abd-hisse' || type === 'etf') {
        // US stocks and ETFs: use Python yfinance to get price
        try {
          const scriptPath = path.join(__dirname, 'fetch-us-stock-price.py');
          const result = execSync(`python3 ${scriptPath} "${symbol.toUpperCase()}"`, { encoding: 'utf-8', timeout: 10000 });
          const data = JSON.parse(result);
          if (data.price) {
            price = data.price;
          }
        } catch (e) {
          console.log(`US stock price fetch failed for ${symbol}: `, e);
        }
      } else if (type === 'hisse') {
        // BIST stocks: use Python yfinance to get price
        try {
          const scriptPath = path.join(__dirname, 'fetch-bist-price.py');
          const result = execSync(`python3 ${scriptPath} "${symbol}"`, { encoding: 'utf-8', timeout: 10000 });
          const data = JSON.parse(result);
          if (data.price) {
            price = data.price;
          }
        } catch (e) {
          console.log(`BIST price fetch failed for ${symbol}: `, e);
          // If price fetch fails, price remains unset - user must update manually
        }
      }

      if (price) {
        // Update asset currentPrice in database
        await storage.updateAsset(assetId, { currentPrice: price.toString() });
        return res.json({ price: Number(price).toFixed(2) });
      }

      res.status(404).json({ message: "Could not fetch price" });
    } catch (error) {
      console.error("Error fetching price:", error);
      res.status(500).json({ message: "Failed to fetch price" });
    }
  });

  // Seed US stocks (called on startup)
  await storage.seedUSStocks(); // seeded

  // Transactions
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.patch('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quantity, price, totalAmount, createdAt, notes } = req.body;

      // 1. Get Existing Transaction
      const txs = await storage.getTransactions(userId);
      const existingTx = txs.find(t => t.id === req.params.id);

      if (!existingTx) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // 2. Validate & Update
      const updatedData: any = {};
      if (quantity !== undefined) updatedData.quantity = quantity.toString();
      if (price !== undefined) updatedData.price = price.toString();
      if (totalAmount !== undefined) updatedData.totalAmount = totalAmount.toString();
      if (createdAt !== undefined) updatedData.createdAt = createdAt ? new Date(createdAt) : null;
      if (notes !== undefined) updatedData.notes = notes;

      // Logic: If user updates Price & Qty, totalAmount might need auto-calc or be passed.
      // For now, trust frontend passed consistent data. 

      await storage.updateTransaction(req.params.id, updatedData);

      // 3. Recalculate Asset
      if (existingTx.assetName && existingTx.assetType) {
        // Note: If assetId exists, use it.
        await recalculateAssetFromTransactions(
          userId,
          existingTx.assetId || "unknown",
          existingTx.assetName,
          existingTx.assetType
        );
      }

      res.json({ message: "Transaction updated" });
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  // Helper: Recalculate asset state from transactions
  async function recalculateAssetFromTransactions(userId: string, assetId: string, assetName: string, assetType: string) {
    // 1. Fetch all transactions for this asset
    const allTxs = await storage.getTransactions(userId);
    // Filter for this specific asset (by ID if possible, or Name+Type fallback)
    // Note: Transaction schema has assetId.
    const assetTxs = allTxs.filter(t => t.assetId === assetId || (t.assetName === assetName && t.assetType === assetType));

    // Sort oldest to newest
    assetTxs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    let totalQty = 0;
    let totalCost = 0;

    for (const tx of assetTxs) {
      const qty = Number(tx.quantity);
      const price = Number(tx.price);

      if (tx.type === 'buy') {
        // Weighted Average Cost Calculation
        // New Avg = (OldTotalCost + NewBuyCost) / (OldQty + NewQty)
        totalCost += (qty * price);
        totalQty += qty;
      } else if (tx.type === 'sell') {
        // Selling reduces quantity but keeps Avg Cost same
        // We reduce Total Cost proportionally
        if (totalQty > 0) {
          const avgCost = totalCost / totalQty;
          totalCost -= (qty * avgCost);
          totalQty -= qty;
        }
      }
    }

    // Avoid negative dust
    if (totalQty < 0.00000001) {
      totalQty = 0;
      totalCost = 0;
    }

    const newAvgCost = totalQty > 0 ? totalCost / totalQty : 0;

    // 2. Fetch existing asset to update
    const asset = await storage.getAsset(assetId);

    if (totalQty === 0) {
      // Option A: Delete asset if 0 quantity? 
      // User might want to keep it. But usually 0 balances are hidden or treated as closed.
      // Current system deleteAsset on full sell. So we should probably delete if 0 OR update to 0.
      // If we update to 0, it might show up as empty.
      // Let's update to 0 for now to be safe, or delete if policy assumes no empty assets.
      // The 'sell' endpoint deletes if qty=0. So we should probably delete.
      if (asset) {
        await storage.deleteAsset(assetId);
      }
    } else {
      if (asset) {
        await storage.updateAsset(assetId, {
          quantity: totalQty.toString(),
          purchasePrice: newAvgCost.toString()
        });
      } else {
        // Asset might have been deleted but transactions exist?
        // Recover asset? Complex. 
        // For now, only update if exists.
        // If asset was deleted but we are undoing a 'sell' that caused deletion, we might need to recreate it.
        // BUT this task is about DELETING a transaction.
        // If we delete a BUY, qty decreases.
        // If we delete a SELL, qty increases.
        // If asset was deleted (qty=0), and we delete the SELL that made it 0, we need to recreate the asset!

        // Recreation Logic:
        // We need basic info (Symbol, Name, Type) which we have from the transactions.
        // We can use the last known transaction for metadata.
        if (assetTxs.length > 0) {
          const lastTx = assetTxs[assetTxs.length - 1]; // Use metadata from a tx
          // We need to recreate it.
          // Check if another asset with same details exists?
          // storage.createAsset requires userId, InsertAsset.
          // We might lack 'currentPrice' or 'currency' if not in TX.
          // TX has currency.
          // We need 'currentPrice'. We can default to 'purchasePrice' (newAvgCost) or 0.

          // This is an edge case: "Undo Sell of a completely sold asset".
          // Since the user asked specifically about "modifying/deleting affects asset", handling this makes it robust.

          await storage.createAsset(userId, {
            name: assetName,
            type: assetType as any, // Cast to AssetType
            symbol: undefined, // specific symbol info might be lost if strict, but let's try to infer if we had it or skip symbol for non-stocks
            quantity: totalQty.toString(),
            purchasePrice: newAvgCost.toString(),
            currentPrice: newAvgCost.toString(), // Estimate
            currency: assetTxs[0].currency || 'TRY',
            purchaseDate: assetTxs[0].createdAt ? new Date(assetTxs[0].createdAt) : new Date(),
          });
        }
      }
    }
  }

  app.delete('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // 1. Get Transaction Details BEFORE deletion
      const txs = await storage.getTransactions(userId);
      const targetTx = txs.find(t => t.id === req.params.id);

      if (!targetTx) {
        return res.status(404).json({ message: "Transaction not found or denied" });
      }

      // Capture details for recalculation
      const { assetId, assetName, assetType } = targetTx;

      // 2. Delete Transaction
      await storage.deleteTransaction(req.params.id);

      // 3. Recalculate Asset State
      // Only if we have asset info
      if (assetName && assetType) {
        // Note: assetId might be null in DB for some reason, or valid.
        // If assetId is null, we try to match by Name+Type in our helper fallback.
        // Ideally we pass assetId if it exists.
        // If the asset was deleted, assetId refers to a non-existent row.
        // Pass it anyway, helper checks existence.
        await recalculateAssetFromTransactions(userId, assetId || "unknown_id", assetName, assetType);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  app.delete('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteAllTransactions(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting all transactions:", error);
      res.status(500).json({ message: "Failed to delete transactions" });
    }
  });

  // Weighted Average Sell Endpoint (Consolidated)
  app.post('/api/assets/sell-fifo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, type, symbol, sellQuantity, sellPrice, sellDate } = req.body;

      if (!sellQuantity || Number(sellQuantity) <= 0) {
        return res.status(400).json({ message: "Invalid sell quantity" });
      }

      // 1. Fetch matching assets
      const allAssets = await storage.getAssets(userId);
      // Let's just fix the block cleanly.
      console.log(`[SELL-FIFO-DEBUG] Request: name='${name}', type='${type}', symbol='${symbol}'`);

      const matchingAssets = allAssets.filter(asset => {
        const sameType = asset.type === type;

        // Strict Symbol Match if provided
        if (symbol) {
          return sameType && asset.symbol?.toUpperCase() === symbol.toUpperCase();
        }

        // Fallback: Name Match (Relaxed: allow matching assets with symbol if names match exactly)
        // Previous logic (!asset.symbol) prevented matching assets that had symbols if request lacked it.
        return sameType && asset.name === name;
      });

      if (matchingAssets.length === 0) {
        console.log(`[SELL-FIFO-DEBUG] No matching assets found for '${name}'`);
        return res.status(404).json({ message: "Varlık bulunamadı." });
      }

      // 2. Consolidate logic (Calculate current position)
      // Even if multiple rows exist, we treat them as one pool with a weighted avg price.
      let totalOwned = 0;
      let totalCost = 0;

      matchingAssets.forEach(a => {
        const qty = Number(a.quantity);
        const price = Number(a.purchasePrice);
        totalOwned += qty;
        totalCost += (qty * price);
      });

      const avgCost = totalOwned > 0 ? totalCost / totalOwned : 0;
      const qtyToSell = Number(sellQuantity);

      if (totalOwned < qtyToSell) {
        return res.status(400).json({ message: `Yetersiz bakiye.Mevcut: ${totalOwned}, Satılacak: ${qtyToSell} ` });
      }

      // 3. Calculate Realized P&L
      // sell_cost_basis = sell_qty * current_avg_cost
      // realized_pnl = (sell_qty * sell_price) - sell_cost_basis
      const costBasis = qtyToSell * avgCost;
      const revenue = qtyToSell * Number(sellPrice);
      const realizedPnL = revenue - costBasis;

      // 4. Update Database (Consolidate into ONE asset)
      const newTotalQty = totalOwned - qtyToSell;
      // new_total_cost = old_total_cost - sell_cost_basis
      // New Avg Cost = new_total_cost / new_total_qty 
      // Mathematically, if we subtract using AvgCost, the AvgCost remains CONSTANT.
      // e.g. (1500 - 5*150) / (10 - 5) = (750) / 5 = 150. Matches.

      console.log(`[SELL] Selling ${qtyToSell} @${sellPrice}.AvgCost: ${avgCost}.PnL: ${realizedPnL}.Remaining: ${newTotalQty} `);

      // We will keep the FIRST asset as the survivor, update it, and delete the rest.
      const survivorAsset = matchingAssets[0];

      if (newTotalQty <= 0.00000001) {
        // Sold everything, delete all
        for (const asset of matchingAssets) {
          await storage.deleteAsset(asset.id);
        }
      } else {
        // Update survivor
        await storage.updateAsset(survivorAsset.id, {
          quantity: newTotalQty.toString(),
          purchasePrice: avgCost.toString(), // Explicitly ensuring it stays as AvgCost (though it shouldn't change)
        });

        // Delete others
        for (let i = 1; i < matchingAssets.length; i++) {
          await storage.deleteAsset(matchingAssets[i].id);
        }
      }

      // 5. Create Transaction Record
      await storage.createTransaction(userId, {
        assetId: survivorAsset.id,
        type: 'sell',
        assetName: name,
        assetType: type,
        symbol: symbol || survivorAsset.symbol, // Ensure symbol is passed
        quantity: qtyToSell.toString(),
        price: sellPrice.toString(),
        totalAmount: revenue.toString(),
        currency: survivorAsset.currency || 'TRY',
        realizedPnL: realizedPnL.toString(),
        createdAt: sellDate ? new Date(sellDate) : undefined,
      });

      res.json({
        message: "Sell completed (Perpetual Avg)",
        soldQuantity: qtyToSell,
        totalRealizedPnL: realizedPnL,
        avgCostUsed: avgCost,
        remainingQty: newTotalQty
      });

    } catch (error) {
      console.error("Error in sell:", error);
      res.status(500).json({ message: "Failed to process sell" });
    }
  });



  // Analytics Detailed Endpoint
  app.get('/api/analytics/detailed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assets = await storage.getAssets(userId);
      const transactions = await storage.getTransactions(userId);

      // 1. Calculate Portfolio-Wide XIRR
      // Cash Flows: 
      // - Buys: Negative Amount, Date=CreatedAt
      // - Sells: Positive Amount (TotalAmount), Date=CreatedAt
      // - Terminal: Sum of all Current Asset Values, Date=NOW

      const portfolioCashFlows = transactions.map(t => {
        const d = new Date(t.createdAt || new Date());
        return {
          amount: t.type === 'buy' ? -Number(t.totalAmount) : Number(t.totalAmount),
          date: isNaN(d.getTime()) ? new Date() : d
        };
      });

      const totalPortfolioValue = assets.reduce((sum, a) => sum + (Number(a.quantity) * Number(a.currentPrice)), 0);
      portfolioCashFlows.push({
        amount: totalPortfolioValue,
        date: new Date()
      });

      let portfolioXirr = 0; // Default to 0 or NaN
      try {
        portfolioXirr = calculateXIRR(portfolioCashFlows);
      } catch (xirrError) {
        console.error("Error calculating portfolio XIRR:", xirrError);
        // portfolioXirr remains 0
      }

      // 2. Benchmarks (1 Year Return for now as standard comparison, or YTD)

      // 2. Benchmarks (Best Effort)
      // 2. Benchmarks (Best Effort)
      // 2. Benchmarks (Best Effort)
      let benchmarkComparison = { bist100: 0, gold: 0, dollar: 0 };
      try {
        const oneYearAgo = subYears(new Date(), 1);
        const [bist100Return, goldReturn] = await Promise.all([
          getBenchmarkReturn('XU100', oneYearAgo).catch(e => { console.error('BIST100 fetch failed', e); return 0; }),
          getBenchmarkReturn('GOLD', oneYearAgo).catch(e => { console.error('GOLD fetch failed', e); return 0; })
        ]);
        benchmarkComparison = { bist100: bist100Return, gold: goldReturn, dollar: 0 };
      } catch (e) {
        console.error("Benchmark fetch failed completely:", e);
      }

      // 3. Asset-Level Analysis
      // For each asset, we need: XIRR, Period Returns (1m,3m,6m,1y,3y)
      // This requires fetching history for each asset.
      // Optimization: We could do this in parallel.


      // 3. Asset-Level Analysis
      // Batch Fetch History Optimization
      const historyStart = subYears(new Date(), 3);
      const startStr = historyStart.toISOString().split('T')[0];
      const scriptPath = path.join(__dirname, 'fetch-asset-history.py');

      const batchRequests = assets.map(a => ({
        symbol: a.symbol,
        type: a.type,
        startDate: startStr
      })).filter(r => r.symbol);

      let batchHistory: Record<string, any[]> = {};

      try {
        if (batchRequests.length > 0) {
          // Use spawn to write to stdin, avoiding shell argument limits
          const pythonProcess = require("child_process").spawn('python3', [scriptPath]);

          const jsonArg = JSON.stringify(batchRequests);

          const stdoutChunks: any[] = [];
          const stderrChunks: any[] = [];

          await new Promise((resolve, reject) => {
            pythonProcess.stdout.on('data', (data: any) => stdoutChunks.push(data));
            pythonProcess.stderr.on('data', (data: any) => stderrChunks.push(data));

            // Increase timeout for python process
            const timeout = setTimeout(() => {
              pythonProcess.kill();
              reject(new Error("Python script timed out after 60s"));
            }, 60000);

            pythonProcess.on('close', (code: number) => {
              clearTimeout(timeout);
              if (code === 0) resolve(Buffer.concat(stdoutChunks).toString());
              else reject(new Error(`Python exit code ${code}: ${Buffer.concat(stderrChunks).toString()}`));
            });

            pythonProcess.on('error', (err: any) => {
              clearTimeout(timeout);
              reject(err);
            });

            pythonProcess.stdin.write(jsonArg);
            pythonProcess.stdin.end();
          }).then((output) => {
            try {
              const rawHistory = JSON.parse(output as string);
              // Ensure history is sorted Ascending (Oldest -> Newest)
              for (const key in rawHistory) {
                if (Array.isArray(rawHistory[key])) {
                  rawHistory[key].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                }
              }
              batchHistory = rawHistory;
            } catch (jsonErr) {
              console.error("Failed to parse batch history JSON:", jsonErr, output);
            }
          });
        }
      } catch (e) {
        console.error("Batch history fetch failed:", e);
      }

      const assetAnalysis = assets.map((asset) => {
        try {
          // A. Asset XIRR
          const assetTxs = transactions.filter(t =>
            (t.assetName === asset.name && t.assetType === asset.type) ||
            (t.assetId === asset.id)
          );

          const flows = assetTxs.map(t => {
            const d = new Date(t.createdAt || new Date());
            return {
              amount: t.type === 'buy' ? -Number(t.totalAmount) : Number(t.totalAmount),
              date: isNaN(d.getTime()) ? new Date() : d
            };
          });

          const currentValue = Number(asset.quantity) * Number(asset.currentPrice);
          flows.push({ amount: currentValue, date: new Date() });

          let assetXirr = 0;
          try {
            assetXirr = calculateXIRR(flows);
          } catch (xirrErr) { console.error(`XIRR error for ${asset.symbol}:`, xirrErr); }

          // B. Period Returns (Market Performance)
          let history = (asset.symbol ? batchHistory[asset.symbol] : []) || [];

          // Helper to find price at date
          const findPriceAt = (date: Date): number | null => {
            if (!history || history.length === 0) return null;
            const target = date.toISOString().split('T')[0];
            const exact = history.find((h: any) => h.date === target);
            if (exact) return exact.price;
            const found = history.find((h: any) => h.date >= target);
            if (found) return found.price;
            return null;
          };

          const currentPrice = Number(asset.currentPrice);
          const periods = {
            '1m': calculatePeriodReturn(currentPrice, findPriceAt(subMonths(new Date(), 1)) || Number(asset.purchasePrice)),
            '3m': calculatePeriodReturn(currentPrice, findPriceAt(subMonths(new Date(), 3)) || 0),
            '6m': calculatePeriodReturn(currentPrice, findPriceAt(subMonths(new Date(), 6)) || 0),
            '1y': calculatePeriodReturn(currentPrice, findPriceAt(subYears(new Date(), 1)) || 0),
            '3y': calculatePeriodReturn(currentPrice, findPriceAt(subYears(new Date(), 3)) || 0),
          };

          return {
            ...asset,
            analysis: {
              xirr: assetXirr,
              marketReturns: periods
            }
          };
        } catch (assetErr) {
          console.error(`Analysis failed for asset ${asset.symbol}:`, assetErr);
          // Return safe fallback
          return {
            ...asset,
            analysis: {
              xirr: 0,
              marketReturns: { '1m': 0, '3m': 0, '6m': 0, '1y': 0, '3y': 0 }
            }
          };
        }
      });

      res.json({
        portfolio: {
          xirr: portfolioXirr,
          totalValue: totalPortfolioValue,
          benchmarks: benchmarkComparison
        },
        assets: assetAnalysis
      });

    } catch (error) {
      console.error("Error in analytics:", error);
      res.status(500).json({
        message: "Veriler yüklenirken bir hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata"
      });
    }
  });

  // Account Routes
  app.get('/api/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getAccounts(userId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post('/api/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(userId, data);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.get('/api/accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getAccount(req.params.id);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.delete('/api/accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Check ownership
      const account = await storage.getAccount(req.params.id);
      if (!account || account.userId !== userId) {
        return res.status(403).send();
      }
      await storage.deleteAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Category Routes
  app.get('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categories = await storage.getCategories(userId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(userId, data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Check ownership (simple check via getCategories filter or direct check if implemented)
      // Optimization: assuming deleteCategory checks or just tries. Storage delete uses ID.
      // Robust: fetch first.
      const categories = await storage.getCategories(userId);
      const exists = categories.find(c => c.id === req.params.id);
      if (!exists) return res.status(404).send();

      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Cash Transaction Routes
  app.get('/api/cash-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const txs = await storage.getCashTransactions(userId);
      res.json(txs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cash transactions" });
    }
  });

  app.post('/api/cash-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertCashTransactionSchema.parse(req.body);

      // If transfer, validate secondary account
      if (data.type === 'transfer' && !data.toAccountId) {
        return res.status(400).json({ message: "Destination account required for transfer" });
      }

      const tx = await storage.createCashTransaction(userId, data);
      res.status(201).json(tx);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cash transaction" });
    }
  });

  app.delete('/api/cash-transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Check ownership
      const txs = await storage.getCashTransactions(userId);
      const exists = txs.find(t => t.id === req.params.id);
      if (!exists) return res.status(403).send();

      await storage.deleteCashTransaction(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete cash transaction" });
    }
  });

  app.patch('/api/cash-transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Check ownership
      const txs = await storage.getCashTransactions(userId);
      const exists = txs.find(t => t.id === req.params.id);
      if (!exists) return res.status(403).send();

      const data = insertCashTransactionSchema.partial().parse(req.body);
      const updated = await storage.updateCashTransaction(req.params.id, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cash transaction" });
    }
  });

  // Budget Routes
  app.get('/api/budgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgets = await storage.getBudgets(userId);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.post('/api/budgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertBudgetSchema.parse(req.body);
      const budget = await storage.createBudget(userId, data);
      res.status(201).json(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  app.delete('/api/budgets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Check ownership
      const budgets = await storage.getBudgets(userId);
      const exists = budgets.find(b => b.id === req.params.id);
      if (!exists) return res.status(403).send();

      await storage.deleteBudget(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  app.patch('/api/budgets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgets = await storage.getBudgets(userId);
      const exists = budgets.find(b => b.id === req.params.id);
      if (!exists) return res.status(403).send();

      const data = insertBudgetSchema.partial().parse(req.body);
      const updated = await storage.updateBudget(req.params.id, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

}
