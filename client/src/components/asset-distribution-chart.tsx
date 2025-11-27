import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { Asset } from "@shared/schema";

interface AssetDistributionChartProps {
  assets: Asset[];
  isLoading?: boolean;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  hisse: "Hisse Senedi",
  etf: "ETF",
  kripto: "Kripto",
  gayrimenkul: "Gayrimenkul",
};

const COLORS = [
  "hsl(217, 91%, 32%)", // Primary blue
  "hsl(160, 84%, 39%)", // Success green
  "hsl(38, 92%, 50%)",  // Warning orange
  "hsl(280, 65%, 48%)", // Purple
  "hsl(346, 87%, 43%)", // Red
];

export function AssetDistributionChart({ assets, isLoading }: AssetDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Varlık Dağılımı</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="w-48 h-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate total value by asset type
  const assetsByType = assets.reduce((acc, asset) => {
    const type = asset.type;
    const value = Number(asset.quantity) * Number(asset.currentPrice);
    acc[type] = (acc[type] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const totalValue = Object.values(assetsByType).reduce((sum, val) => sum + val, 0);

  const data = Object.entries(assetsByType).map(([type, value]) => ({
    name: ASSET_TYPE_LABELS[type] || type,
    value,
    percent: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0,
  }));

  if (data.length === 0) {
    return (
      <Card data-testid="chart-asset-distribution">
        <CardHeader>
          <CardTitle className="text-lg">Varlık Dağılımı</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Henüz varlık eklenmedi.<br />
            Varlık ekleyerek dağılımı görüntüleyin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-popover-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">%{data.percent}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card data-testid="chart-asset-distribution">
      <CardHeader>
        <CardTitle className="text-lg">Varlık Dağılımı</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              label={({ name, percent }) => `${name}: %${percent}`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
