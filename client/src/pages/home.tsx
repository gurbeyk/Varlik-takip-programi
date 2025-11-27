import { useQuery } from "@tanstack/react-query";
import { SummaryCards } from "@/components/summary-cards";
import { AssetDistributionChart } from "@/components/asset-distribution-chart";
import { PerformanceChart } from "@/components/performance-chart";
import { PortfolioTable } from "@/components/portfolio-table";
import type { Asset, PerformanceSnapshot } from "@shared/schema";

interface PortfolioSummary {
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  monthlyChange: number;
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

  const isLoading = assetsLoading || summaryLoading || snapshotsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          Portföyüm
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
        isLoading={isLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AssetDistributionChart assets={assets} isLoading={assetsLoading} />
        <PerformanceChart snapshots={snapshots} isLoading={snapshotsLoading} />
      </div>

      <PortfolioTable assets={assets} isLoading={assetsLoading} />
    </div>
  );
}
