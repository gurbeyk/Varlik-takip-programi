import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetDistributionChart } from "@/components/asset-distribution-chart";
import { PerformanceChart } from "@/components/performance-chart";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import type { Asset, PerformanceSnapshot } from "@shared/schema";

const ASSET_TYPE_LABELS: Record<string, string> = {
  hisse: "Hisse Senedi",
  etf: "ETF",
  kripto: "Kripto",
  gayrimenkul: "Gayrimenkul",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Reports() {
  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery<PerformanceSnapshot[]>({
    queryKey: ["/api/portfolio/performance"],
  });

  const isLoading = assetsLoading || snapshotsLoading;

  // Calculate metrics
  const totalValue = assets.reduce((sum, asset) => {
    return sum + Number(asset.quantity) * Number(asset.currentPrice);
  }, 0);

  const totalCost = assets.reduce((sum, asset) => {
    return sum + Number(asset.quantity) * Number(asset.purchasePrice);
  }, 0);

  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  // Top performers
  const assetsWithPerformance = assets.map(asset => {
    const value = Number(asset.quantity) * Number(asset.currentPrice);
    const cost = Number(asset.quantity) * Number(asset.purchasePrice);
    const profit = value - cost;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
    return { ...asset, value, cost, profit, profitPercent };
  });

  const topPerformers = [...assetsWithPerformance]
    .sort((a, b) => b.profitPercent - a.profitPercent)
    .slice(0, 5);

  const worstPerformers = [...assetsWithPerformance]
    .sort((a, b) => a.profitPercent - b.profitPercent)
    .slice(0, 5);

  // Asset type distribution
  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.type;
    const value = Number(asset.quantity) * Number(asset.currentPrice);
    acc[type] = (acc[type] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>
          <p className="text-muted-foreground">Detaylı portföy analizi</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          Raporlar
        </h1>
        <p className="text-muted-foreground">
          Detaylı portföy analizi ve performans raporları
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Değer
            </CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-value">
              {formatCurrency(totalValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Kar/Zarar
            </CardTitle>
            {totalProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              totalProfit >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`} data-testid="text-total-profit">
              {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
            </p>
            <p className="text-sm text-muted-foreground">
              {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Varlık Sayısı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-asset-count">
              {assets.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {Object.keys(assetsByType).length} farklı kategoride
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AssetDistributionChart assets={assets} />
        <PerformanceChart snapshots={snapshots} />
      </div>

      {/* Top Performers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-top-performers">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              En İyi Performans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Henüz varlık eklenmedi.
              </p>
            ) : (
              <div className="space-y-4">
                {topPerformers.map((asset, index) => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {ASSET_TYPE_LABELS[asset.type] || asset.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        asset.profitPercent >= 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(2)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(asset.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-worst-performers">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Dikkat Gerektiren Varlıklar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {worstPerformers.filter(a => a.profitPercent < 0).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Zarar eden varlık bulunmuyor.
              </p>
            ) : (
              <div className="space-y-4">
                {worstPerformers.filter(a => a.profitPercent < 0).map((asset, index) => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {ASSET_TYPE_LABELS[asset.type] || asset.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-600 dark:text-orange-400">
                        {asset.profitPercent.toFixed(2)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(asset.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset Type Breakdown */}
      <Card data-testid="card-asset-breakdown">
        <CardHeader>
          <CardTitle className="text-lg">Varlık Tiplerine Göre Dağılım</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(assetsByType).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Henüz varlık eklenmedi.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(assetsByType).map(([type, value]) => {
                const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
                return (
                  <div key={type} className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      {ASSET_TYPE_LABELS[type] || type}
                    </p>
                    <p className="text-xl font-bold">{formatCurrency(value)}</p>
                    <p className="text-sm text-muted-foreground">
                      %{percent.toFixed(1)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
