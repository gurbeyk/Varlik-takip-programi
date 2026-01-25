import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SummaryCards } from "@/components/summary-cards";
import { AssetBreakdown } from "@/components/asset-breakdown";
import { ProfitLossSummary } from "@/components/profit-loss-summary";
import { MonthlyChangeBreakdown } from "@/components/monthly-change-breakdown";
import { AssetDistributionChart } from "@/components/asset-distribution-chart";
import { PerformanceChart } from "@/components/performance-chart";
import { PortfolioPerformanceChart } from "@/components/portfolio-performance-chart"; // Added import
import { PortfolioTable } from "@/components/portfolio-table";
import { queryClient } from "@/lib/queryClient";
import type { Asset, PerformanceSnapshot, Transaction } from "@shared/schema";

interface PortfolioSummary {
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  monthlyChange: number;
  monthlyChangeAmount?: number;
  monthlyChangeBreakdown?: Record<string, { amount: number; percentage: number }>;
}

export default function Home() {
  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery<PerformanceSnapshot[]>({
    queryKey: ["/api/portfolio/performance"],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const isLoading = assetsLoading || summaryLoading || snapshotsLoading || transactionsLoading;

  // Manual price refresh function - pass to portfolio table
  const refreshPrices = async () => {
    if (assets && assets.length > 0) {
      const priceUpdates = assets
        .filter(a => a.symbol && (a.type === 'abd-hisse' || a.type === 'etf' || a.type === 'kripto' || a.type === 'hisse'))
        .map(asset =>
          fetch(`/api/assets/${asset.id}/price`, { method: 'POST' })
            .then(res => res.json())
            .catch(err => {
              console.log("Failed to fetch price for", asset.symbol, err);
              return null;
            })
        );

      await Promise.all(priceUpdates);
      // Refetch assets to get updated prices
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/summary'] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          Portföy Özeti
        </h1>
        <p className="text-muted-foreground">
          Yatırımlarınızın genel görünümü
        </p>
      </div>

      <SummaryCards
        totalAssets={summary?.totalAssets || 0}
        totalDebt={summary?.totalDebt || 0}
        netWorth={summary?.netWorth || 0}
        monthlyChange={summary?.monthlyChange || 0}
        monthlyChangeAmount={summary?.monthlyChangeAmount}
        isLoading={isLoading}
        assets={assets}
      />

      <MonthlyChangeBreakdown data={summary?.monthlyChangeBreakdown} isLoading={isLoading} />

      <AssetBreakdown assets={assets} isLoading={assetsLoading} />

      <ProfitLossSummary assets={assets} transactions={transactions} isLoading={isLoading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AssetDistributionChart assets={assets} isLoading={assetsLoading} />
        <PerformanceChart snapshots={snapshots} isLoading={snapshotsLoading} />
      </div>
    </div>
  );
}
