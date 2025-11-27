import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";

interface SummaryCardsProps {
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  monthlyChange: number;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function SummaryCards({ totalAssets, totalDebt, netWorth, monthlyChange, isLoading }: SummaryCardsProps) {
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

  const cards = [
    {
      title: "Toplam Varlık",
      value: formatCurrency(totalAssets),
      icon: Wallet,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      change: null,
      testId: "card-total-assets",
    },
    {
      title: "Toplam Borç",
      value: formatCurrency(totalDebt),
      icon: CreditCard,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      change: null,
      testId: "card-total-debt",
    },
    {
      title: "Net Değer",
      value: formatCurrency(netWorth),
      icon: PiggyBank,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      change: null,
      testId: "card-net-worth",
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
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} data-testid={card.testId}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.iconBg}`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              card.change !== null 
                ? card.change >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-orange-600 dark:text-orange-400'
                : 'text-foreground'
            }`}>
              {card.value}
            </div>
            {card.title === "Aylık Değişim" && (
              <p className="text-xs text-muted-foreground mt-1">
                Son 30 gün
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
