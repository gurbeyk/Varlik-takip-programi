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
  const [currencyMode, setCurrencyMode] = useState<'TRY' | 'USD'>('TRY');
  const [exchangeRate, setExchangeRate] = useState(1);

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

  // Calculate breakdown by asset type
  const calculateBreakdown = () => {
    const types: Record<string, { try: number; usd: number }> = {
      "BIST Hisse": { try: 0, usd: 0 },
      "ABD Hisse": { try: 0, usd: 0 },
      "ETF": { try: 0, usd: 0 },
      "Kripto": { try: 0, usd: 0 },
      "Gayrimenkul": { try: 0, usd: 0 },
      "TEFAS Fon": { try: 0, usd: 0 },
    };

    assets.forEach((asset) => {
      const quantity = Number(asset.quantity);
      const currentPrice = Number(asset.currentPrice);
      const value = quantity * currentPrice;
      const currency = asset.currency || 'TRY';

      let typeKey = "";
      if (asset.type === "hisse") typeKey = "BIST Hisse";
      else if (asset.type === "abd-hisse") typeKey = "ABD Hisse";
      else if (asset.type === "etf") typeKey = "ETF";
      else if (asset.type === "kripto") typeKey = "Kripto";
      else if (asset.type === "gayrimenkul") typeKey = "Gayrimenkul";
      else if (asset.type === "fon") typeKey = "TEFAS Fon";

      if (typeKey && types[typeKey]) {
        if (currency === 'USD') {
          types[typeKey].usd += value;
        } else {
          types[typeKey].try += value;
        }
      }
    });

    return types;
  };

  const breakdown = calculateBreakdown();
  const breakdownEntries = Object.entries(breakdown).filter(
    ([_, data]) => data.try > 0 || data.usd > 0
  );

  // Calculate totals
  const totalTRY = Object.values(breakdown).reduce((sum, data) => sum + data.try, 0);
  const totalUSD = Object.values(breakdown).reduce((sum, data) => sum + data.usd, 0);
  const displayTotal = currencyMode === 'TRY' ? totalTRY + (totalUSD * exchangeRate) : totalUSD + (totalTRY / exchangeRate);

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
          variant={currencyMode === 'TRY' ? 'default' : 'outline'}
          onClick={() => {
            if (currencyMode === 'TRY') {
              setCurrencyMode('USD');
            } else {
              fetchExchangeRate();
              setCurrencyMode('TRY');
            }
          }}
          data-testid="button-toggle-currency"
          className="gap-2"
        >
          <DollarSign className="w-4 h-4" />
          {currencyMode}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {breakdownEntries.map(([type, data]) => {
            const displayValue = currencyMode === 'TRY' 
              ? data.try + (data.usd * exchangeRate)
              : data.usd + (data.try / exchangeRate);
            
            return (
              <div key={type} className="flex justify-between items-center p-3 border rounded-lg hover-elevate">
                <span className="font-medium text-foreground">{type}</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(displayValue, currencyMode)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="font-bold text-lg text-foreground">Toplam</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(displayTotal, currencyMode)}
            </span>
          </div>
        </div>

        {currencyMode === 'TRY' && totalUSD > 0 && (
          <div className="text-xs text-muted-foreground pt-2">
            <p>Kur: 1 USD = {exchangeRate.toFixed(2)} TRY</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
