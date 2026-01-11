import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Asset, Transaction } from "@shared/schema";

interface ProfitLossSummaryProps {
  assets: Asset[];
  transactions?: Transaction[];
  isLoading?: boolean;
}

function formatCurrency(value: number, currency: string = 'TRY'): string {
  const currencyCode = currency === 'USD' ? 'USD' : 'TRY';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProfitLossSummary({ assets, transactions = [], isLoading }: ProfitLossSummaryProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-profit-loss-summary">
        <CardHeader>
          <CardTitle className="text-lg">Kar/Zarar Özeti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate profit/loss by asset type
  const calculateByType = () => {
    // Structure: { [key]: { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 } }
    const types: Record<string, {
      tryUnrealized: number;
      tryRealized: number;
      usdUnrealized: number;
      usdRealized: number;
    }> = {
      "BIST Hisse": { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 },
      "ABD Hisse": { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 },
      "ETF": { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 },
      "Kripto": { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 },
      "Gayrimenkul": { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 },
      "Fon": { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 }, // Added Fon as it might be used
      "Tahvil": { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 },
    };

    // Helper to map type codes to display names
    const getTypeName = (typeCode: string | null) => {
      if (!typeCode) return "Diğer";
      if (typeCode === "hisse") return "BIST Hisse";
      if (typeCode === "abd-hisse") return "ABD Hisse";
      if (typeCode === "etf") return "ETF";
      if (typeCode === "kripto") return "Kripto";
      if (typeCode === "gayrimenkul") return "Gayrimenkul";
      if (typeCode === "fon" || typeCode === "befas") return "Fon";
      return "Diğer";
    };

    // 1. Calculate Unrealized P/L from current Assets
    assets.forEach((asset) => {
      const quantity = Number(asset.quantity);
      const purchasePrice = Number(asset.purchasePrice);
      const currentPrice = Number(asset.currentPrice);
      const currency = asset.currency || 'TRY';

      const typeKey = getTypeName(asset.type);

      if (!types[typeKey]) {
        types[typeKey] = { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 };
      }

      const totalCost = quantity * purchasePrice;
      const totalValue = quantity * currentPrice;
      const profit = totalValue - totalCost;

      if (currency === 'USD') {
        types[typeKey].usdUnrealized += profit;
      } else {
        types[typeKey].tryUnrealized += profit;
      }
    });

    // 2. Calculate Realized P/L from Transactions
    transactions.forEach((tx) => {
      if (tx.type === 'sell' && tx.realizedPnL) {
        const typeKey = getTypeName(tx.assetType);
        const pnl = Number(tx.realizedPnL);
        const currency = tx.currency || 'TRY';

        if (!types[typeKey]) {
          types[typeKey] = { tryUnrealized: 0, tryRealized: 0, usdUnrealized: 0, usdRealized: 0 };
        }

        if (currency === 'USD') {
          types[typeKey].usdRealized += pnl;
        } else {
          types[typeKey].tryRealized += pnl;
        }
      }
    });

    return types;
  };

  const profitLossByType = calculateByType();

  const summaryCards = Object.entries(profitLossByType)
    .filter(([_, data]) =>
      Math.abs(data.tryUnrealized) > 0.01 || Math.abs(data.tryRealized) > 0.01 ||
      Math.abs(data.usdUnrealized) > 0.01 || Math.abs(data.usdRealized) > 0.01
    )
    .map(([type, data]) => {
      // Determine dominant currency for display simplicity, OR show both if significant?
      // For now, let's assume if any USD involved, show appropriate currency or fallback to TRY.
      // Ideally, we might want to show total in TRY equivalent, but we don't have live rate here easily without prop.
      // So let's stick to the dominant currency of that asset type or TRY if mixed/none.
      // Usually "ABD Hisse" is USD, others TRY.

      const isUsd = (type === "ABD Hisse" || type === "ETF" || type === "Kripto"); // Heuristic
      // Or check non-zero components.
      const useUsd = (Math.abs(data.usdUnrealized) + Math.abs(data.usdRealized)) > (Math.abs(data.tryUnrealized) + Math.abs(data.tryRealized));

      const currency = useUsd ? 'USD' : 'TRY';

      const unrealized = useUsd ? data.usdUnrealized : data.tryUnrealized;
      const realized = useUsd ? data.usdRealized : data.tryRealized;
      const total = unrealized + realized;

      return {
        type,
        currency,
        unrealized,
        realized,
        total,
      };
    });

  if (summaryCards.length === 0) {
    return null;
  }

  return (
    <Card data-testid="card-profit-loss-summary">
      <CardHeader>
        <CardTitle className="text-lg">Kar/Zarar Özeti</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Changed grid columns to be slightly wider to accommodate 3 columns of data */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.type} className="p-4 border rounded-lg hover-elevate bg-card text-card-foreground shadow-sm">
              <div className="mb-3 font-semibold text-base border-b pb-2 flex justify-between items-center">
                <span>{card.type}</span>
                <span className={`text-sm ${card.total >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                  (Topl: {formatCurrency(card.total, card.currency)})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">

                {/* Realize Edilmemiş */}
                <div className="flex flex-col gap-1 p-2 rounded bg-muted/20">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Realize Edilmemiş</span>
                  <span className={`font-bold ${card.unrealized >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {formatCurrency(card.unrealized, card.currency)}
                  </span>
                </div>

                {/* Realize Edilen */}
                <div className="flex flex-col gap-1 p-2 rounded bg-muted/20">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Realize Edilen</span>
                  <span className={`font-bold ${card.realized >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {formatCurrency(card.realized, card.currency)}
                  </span>
                </div>

                {/* Toplam */}
                <div className="flex flex-col gap-1 p-2 rounded bg-muted/20">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Toplam K/Z</span>
                  <span className={`font-bold ${card.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {formatCurrency(card.total, card.currency)}
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
