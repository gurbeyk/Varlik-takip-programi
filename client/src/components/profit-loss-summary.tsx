import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Asset } from "@shared/schema";

interface ProfitLossSummaryProps {
  assets: Asset[];
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

export function ProfitLossSummary({ assets, isLoading }: ProfitLossSummaryProps) {
  if (isLoading) {
    return (
      <Card data-testid="card-profit-loss-summary">
        <CardHeader>
          <CardTitle className="text-lg">Kar/Zarar Özeti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
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
    const types: Record<string, { tryCost: number; tryValue: number; usdCost: number; usdValue: number }> = {
      "BIST Hisse": { tryCost: 0, tryValue: 0, usdCost: 0, usdValue: 0 },
      "ABD Hisse": { tryCost: 0, tryValue: 0, usdCost: 0, usdValue: 0 },
      "ETF": { tryCost: 0, tryValue: 0, usdCost: 0, usdValue: 0 },
      "Kripto": { tryCost: 0, tryValue: 0, usdCost: 0, usdValue: 0 },
      "Gayrimenkul": { tryCost: 0, tryValue: 0, usdCost: 0, usdValue: 0 },
    };

    assets.forEach((asset) => {
      const quantity = Number(asset.quantity);
      const purchasePrice = Number(asset.purchasePrice);
      const currentPrice = Number(asset.currentPrice);
      const currency = asset.currency || 'TRY';

      let typeKey = "";
      if (asset.type === "hisse") typeKey = "BIST Hisse";
      else if (asset.type === "abd-hisse") typeKey = "ABD Hisse";
      else if (asset.type === "etf") typeKey = "ETF";
      else if (asset.type === "kripto") typeKey = "Kripto";
      else if (asset.type === "gayrimenkul") typeKey = "Gayrimenkul";

      if (typeKey && types[typeKey]) {
        const totalCost = quantity * purchasePrice;
        const totalValue = quantity * currentPrice;

        if (currency === 'USD') {
          types[typeKey].usdCost += totalCost;
          types[typeKey].usdValue += totalValue;
        } else {
          types[typeKey].tryCost += totalCost;
          types[typeKey].tryValue += totalValue;
        }
      }
    });

    return types;
  };

  const profitLossByType = calculateByType();

  const summaryCards = Object.entries(profitLossByType)
    .filter(([_, data]) => data.tryCost > 0 || data.usdCost > 0)
    .map(([type, data]) => {
      const tryProfit = data.tryValue - data.tryCost;
      const usdProfit = data.usdValue - data.usdCost;
      
      const displayProfit = data.tryCost > 0 ? tryProfit : usdProfit;
      const displayCurrency = data.tryCost > 0 ? 'TRY' : 'USD';
      const isPositive = displayProfit >= 0;

      return {
        type,
        profit: displayProfit,
        currency: displayCurrency,
        isPositive,
        tryCost: data.tryCost,
        tryProfit,
        usdCost: data.usdCost,
        usdProfit,
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.type} className="p-4 border rounded-lg space-y-2 hover-elevate" data-testid={`profit-loss-${card.type}`}>
              <p className="text-sm font-medium text-muted-foreground">{card.type}</p>
              <div className={`text-2xl font-bold ${
                card.isPositive 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {card.isPositive ? '+' : ''}{formatCurrency(card.profit, card.currency)}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {card.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                )}
                {card.isPositive ? 'Kâr' : 'Zarar'}
              </div>
              {card.tryCost > 0 && card.usdCost > 0 && (
                <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                  <div>TRY: {card.tryProfit >= 0 ? '+' : ''}{formatCurrency(card.tryProfit, 'TRY')}</div>
                  <div>USD: {card.usdProfit >= 0 ? '+' : ''}{formatCurrency(card.usdProfit, 'USD')}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
