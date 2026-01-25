import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";
import type { Asset } from "@shared/schema";

interface AssetBreakdownProps {
  assets: Asset[];
  isLoading?: boolean;
}

function formatCurrency(value: number, currency: string): string {
  const currencyCode = currency === 'USD' ? 'USD' : 'TRY';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function AssetBreakdown({ assets, isLoading }: AssetBreakdownProps) {
  const [showTotalUSD, setShowTotalUSD] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(32);

  // Fetch exchange rate on mount
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('/api/currency-rate');
      const data = await response.json();
      if (data.rate) {
        setExchangeRate(data.rate);
      }
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="card-asset-breakdown">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">Toplam Varlık Detayı</CardTitle>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Primary currency for each asset type
  const primaryCurrency: Record<string, 'TRY' | 'USD'> = {
    "BIST Hisse": "TRY",
    "ABD Hisse": "USD",
    "ETF": "USD",
    "Kripto": "USD",
    "Gayrimenkul": "TRY",
    "TEFAS Fon": "TRY",
    "BEFAS Fon": "TRY",
  };

  // Calculate breakdown by asset type and platform
  const calculateBreakdown = () => {
    const types: Record<string, { total: number, platforms: Record<string, number> }> = {};

    assets.forEach((asset) => {
      const quantity = Number(asset.quantity);
      const currentPrice = Number(asset.currentPrice);
      const value = quantity * currentPrice;

      let typeKey = "";
      if (asset.type === "hisse") typeKey = "BIST Hisse";
      else if (asset.type === "abd-hisse") typeKey = "ABD Hisse";
      else if (asset.type === "etf") typeKey = "ETF";
      else if (asset.type === "kripto") typeKey = "Kripto";
      else if (asset.type === "gayrimenkul") typeKey = "Gayrimenkul";
      else if (asset.type === "fon") typeKey = "TEFAS Fon";
      else if (asset.type === "befas") typeKey = "BEFAS Fon";

      const platformKey = asset.platform || "Diğer";

      if (typeKey) {
        if (!types[typeKey]) {
          types[typeKey] = { total: 0, platforms: {} };
        }
        types[typeKey].total += value;
        types[typeKey].platforms[platformKey] = (types[typeKey].platforms[platformKey] || 0) + value;
      }
    });

    return types;
  };

  const breakdown = calculateBreakdown();
  const breakdownEntries = Object.entries(breakdown).filter(([_, data]) => data.total > 0);

  // Calculate total in TRY
  let totalTRY = 0;
  Object.entries(breakdown).forEach(([type, data]) => {
    const currency = primaryCurrency[type] || 'TRY';
    if (currency === 'TRY') {
      totalTRY += data.total;
    } else {
      totalTRY += data.total * exchangeRate;
    }
  });

  const displayTotal = showTotalUSD ? totalTRY / exchangeRate : totalTRY;
  const displayCurrency = showTotalUSD ? 'USD' : 'TRY';

  if (breakdownEntries.length === 0) {
    return null;
  }

  return (
    <Card data-testid="card-asset-breakdown">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Toplam Varlık Detayı</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Varlık tiplerine ve platformlara göre dağılım
          </p>
        </div>
        <Button
          size="sm"
          variant={!showTotalUSD ? 'default' : 'outline'}
          onClick={() => {
            if (!showTotalUSD) {
              setShowTotalUSD(true);
            } else {
              fetchExchangeRate();
              setShowTotalUSD(false);
            }
          }}
          data-testid="button-toggle-total-currency"
          className="gap-2"
        >
          <DollarSign className="w-4 h-4" />
          {displayCurrency}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {breakdownEntries.map(([type, data]) => {
            const currency = primaryCurrency[type] || 'TRY';
            // Only show platforms if there are more than 1 or if the single one is named (not 'Diğer' implies specific info)
            // Actually user wants to see it. Let's show always if keys exist.
            const platformEntries = Object.entries(data.platforms).sort((a, b) => b[1] - a[1]);

            return (
              <div key={type} className="border rounded-lg overflow-hidden">
                <div className="flex justify-between items-center p-3 bg-muted/30">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{type}</span>
                    <span className="text-xs text-muted-foreground">{currency}</span>
                  </div>
                  <span className="font-mono font-medium text-foreground">
                    {formatCurrency(data.total, currency)}
                  </span>
                </div>

                {/* Platform Breakdown */}
                <div className="bg-background px-3 py-1">
                  {platformEntries.map(([platform, pValue]) => (
                    <div key={platform} className="flex justify-between items-center py-2 border-t first:border-0 border-muted/20">
                      <div className="flex items-center gap-2 pl-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        <span className="text-sm text-muted-foreground">{platform}</span>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">
                        {formatCurrency(pValue, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="font-bold text-lg text-foreground">Toplam</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(displayTotal, displayCurrency)}
            </span>
          </div>
        </div>

        {!showTotalUSD && (
          <div className="text-xs text-muted-foreground pt-2">
            <p>Kur: 1 USD = {exchangeRate.toFixed(2)} TRY</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
