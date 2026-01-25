import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, Percent, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";

interface SummaryCardsProps {
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  monthlyChange: number;
  monthlyChangeAmount?: number;
  isLoading?: boolean;
  assets?: Asset[];
}

function formatCurrency(value: number, currency: string = 'TRY'): string {
  const currencyCode = currency === 'USD' ? 'USD' : 'TRY';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function SummaryCards({ totalAssets, totalDebt, netWorth, monthlyChange, monthlyChangeAmount, isLoading, assets = [] }: SummaryCardsProps) {
  const [showTotalUSD, setShowTotalUSD] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(32);

  // Fetch exchange rate on toggle
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

  // Primary currency for each asset type
  const primaryCurrency: Record<string, 'TRY' | 'USD'> = {
    "hisse": "TRY",
    "abd-hisse": "USD",
    "etf": "USD",
    "kripto": "USD",
    "gayrimenkul": "TRY",
    "fon": "TRY",
  };

  // Calculate total assets correctly by currency
  const calculateTotalAssets = (): number => {
    let totalTRY = 0;
    assets.forEach((asset) => {
      const quantity = Number(asset.quantity);
      const currentPrice = Number(asset.currentPrice);
      const value = quantity * currentPrice;
      const currency = asset.currency || 'TRY';
      const assetType = asset.type;
      const primaryCurr = primaryCurrency[assetType] || 'TRY';

      if (primaryCurr === 'TRY' || currency === 'TRY') {
        totalTRY += value;
      } else {
        totalTRY += value * exchangeRate;
      }
    });
    return totalTRY;
  };

  const calculatedTotal = assets.length > 0 ? calculateTotalAssets() : totalAssets;
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const displayCurrency = showTotalUSD ? 'USD' : 'TRY';
  const displayTotal = showTotalUSD ? calculatedTotal / exchangeRate : calculatedTotal;

  const cards = [
    {
      title: "Toplam Varlık",
      value: formatCurrency(displayTotal, displayCurrency),
      icon: Wallet,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      change: null,
      testId: "card-total-assets",
      showButton: true,
    },
    {
      title: "Aylık Değişim",
      value: formatPercent(monthlyChange),
      icon: monthlyChange >= 0 ? TrendingUp : TrendingDown,
      iconBg: monthlyChange >= 0
        ? "bg-emerald-100 dark:bg-emerald-900/30"
        : "bg-orange-100 dark:bg-orange-900/30",
      iconColor: monthlyChange >= 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-orange-600 dark:text-orange-400",
      change: monthlyChange,
      testId: "card-monthly-change",
      showButton: false,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {cards.map((card) => (
        <Card key={card.title} data-testid={card.testId}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {card.showButton && (
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
                  data-testid="button-toggle-summary-currency"
                  className="gap-1 h-8"
                >
                  <DollarSign className="w-3 h-3" />
                  <span className="text-xs">{displayCurrency}</span>
                </Button>
              )}
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.change !== null
              ? card.change >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-orange-600 dark:text-orange-400'
              : 'text-foreground'
              }`}>
              {card.value}
            </div>
            {card.title === "Aylık Değişim" && (
              <div className="flex flex-col">
                {monthlyChangeAmount !== undefined && (
                  <span className={`text-xs font-semibold ${monthlyChangeAmount >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    ({monthlyChangeAmount >= 0 ? '+' : ''}{formatCurrency(monthlyChangeAmount, 'TRY')})
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Son 30 gün
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
