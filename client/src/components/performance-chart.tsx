import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { PerformanceSnapshot } from "@shared/schema";

interface PerformanceChartProps {
  snapshots: PerformanceSnapshot[];
  isLoading?: boolean;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Oca',
  '02': 'Şub',
  '03': 'Mar',
  '04': 'Nis',
  '05': 'May',
  '06': 'Haz',
  '07': 'Tem',
  '08': 'Ağu',
  '09': 'Eyl',
  '10': 'Eki',
  '11': 'Kas',
  '12': 'Ara',
};

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${MONTH_NAMES[month]} ${year.slice(2)}`;
}

export function PerformanceChart({ snapshots, isLoading }: PerformanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aylık Performans</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  // Sort snapshots by month and take last 12
  const sortedSnapshots = [...snapshots]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  const data = sortedSnapshots.map((snapshot) => ({
    month: formatMonth(snapshot.month),
    netWorth: Number(snapshot.netWorth),
    totalAssets: Number(snapshot.totalAssets),
  }));

  if (data.length === 0) {
    // Generate sample data for empty state
    const now = new Date();
    const sampleData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = String(date.getMonth() + 1).padStart(2, '0');
      sampleData.push({
        month: `${MONTH_NAMES[monthKey]} ${String(date.getFullYear()).slice(2)}`,
        netWorth: 0,
        totalAssets: 0,
      });
    }

    return (
      <Card data-testid="chart-performance">
        <CardHeader>
          <CardTitle className="text-lg">Aylık Performans</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Henüz performans verisi yok.<br />
            Varlık ekleyerek performansı takip edin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-popover-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card data-testid="chart-performance">
      <CardHeader>
        <CardTitle className="text-lg">Aylık Performans</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 32%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 32%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="netWorth"
              name="Net Değer"
              stroke="hsl(217, 91%, 32%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNetWorth)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
