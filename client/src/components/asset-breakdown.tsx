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
  };

  // Calculate breakdown by asset type
  const calculateBreakdown = () => {
    const types: Record<string, number> = {
      "BIST Hisse": 0,
      "ABD Hisse": 0,
      "ETF": 0,
      "Kripto": 0,
      "Gayrimenkul": 0,
      "TEFAS Fon": 0,
    };

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

      if (typeKey && types.hasOwnProperty(typeKey)) {
        types[typeKey] += value;
      }
    });

    return types;
  };

  const breakdown = calculateBreakdown();
  const breakdownEntries = Object.entries(breakdown).filter(([_, value]) => value > 0);

  // Calculate total in TRY
  let totalTRY = 0;
  Object.entries(breakdown).forEach(([type, value]) => {
    const currency = primaryCurrency[type];
    if (currency === 'TRY') {
      totalTRY += value;
    } else {
      totalTRY += value * exchangeRate;
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
            Varlık tiplerine göre dağılım
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
        <div className="space-y-2">
          {breakdownEntries.map(([type, value]) => {
            const currency = primaryCurrency[type];
            return (
              <div key={type} className="flex justify-between items-center p-3 border rounded-lg hover-elevate">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{type}</span>
                  <span className="text-xs text-muted-foreground">{currency}</span>
                </div>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(value, currency)}
                </span>
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
