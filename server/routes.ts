import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertAssetSchema } from "@shared/schema";
import { z } from "zod";
import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

      // Calculate monthly change
      let monthlyChange = 0;
      if (snapshots.length >= 2) {
        const lastMonth = snapshots[snapshots.length - 1];
        const prevMonth = snapshots[snapshots.length - 2];
        const lastValue = Number(lastMonth.netWorth);
        const prevValue = Number(prevMonth.netWorth);
        if (prevValue > 0) {
          monthlyChange = ((lastValue - prevValue) / prevValue) * 100;
        }
      }

      // Update current month snapshot
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await storage.createOrUpdatePerformanceSnapshot(userId, currentMonth, totalAssets, totalDebt, netWorth);

      res.json({
        totalAssets,
        totalDebt,
        netWorth,
        monthlyChange,
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
      const result = execSync(`python3 ${scriptPath}`, { encoding: 'utf-8' });
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
      
      const asset = await storage.createAsset(userId, validatedData);

      // Create a transaction record
      await storage.createTransaction(userId, {
        assetId: asset.id,
        type: 'buy',
        assetName: asset.name,
        assetType: asset.type,
        quantity: asset.quantity,
        price: asset.purchasePrice,
        totalAmount: (Number(asset.quantity) * Number(asset.purchasePrice)).toString(),
        currency: asset.currency,
        realizedPnL: '0',
      });

      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
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
        // Try CoinGecko for crypto
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`
          );
          const data = await response.json();
          const id = Object.keys(data)[0];
          if (data[id]?.usd) {
            price = data[id].usd;
          }
        } catch (e) {
          console.log("CoinGecko fetch failed:", e);
        }
      } else if (type === 'abd-hisse' || type === 'etf') {
        // Try Yahoo Finance first (more reliable)
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
            { 
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: controller.signal
            }
          );
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            if (data.quoteResponse?.result?.[0]?.regularMarketPrice) {
              price = data.quoteResponse.result[0].regularMarketPrice;
            }
          }
        } catch (e) {
          console.log("Yahoo Finance fetch failed:", e);
        }

        // Fallback: Try Alpha Vantage API for US stocks and ETFs
        if (!price) {
          const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
          if (apiKey) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);
              const response = await fetch(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
                { signal: controller.signal }
              );
              clearTimeout(timeout);
              if (response.ok) {
                const data = await response.json();
                if (data['Global Quote'] && data['Global Quote']['05. price']) {
                  price = parseFloat(data['Global Quote']['05. price']);
                }
              }
            } catch (e) {
              console.log("Alpha Vantage fetch failed:", e);
            }
          }
        }

        if (!price) {
          console.log(`Could not fetch price for ${symbol}`);
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
          console.log(`BIST price fetch failed for ${symbol}:`, e);
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
  await storage.seedUSStocks();

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
}
