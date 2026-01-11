
import { useState, useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { format, subMonths, subYears, isAfter, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PerformanceSnapshot } from "@shared/schema";

interface PortfolioPerformanceChartProps {
    snapshots: PerformanceSnapshot[];
}

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "3Y" | "ALL";

export function PortfolioPerformanceChart({ snapshots }: PortfolioPerformanceChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("6M");

    // Process data for chart
    const chartData = useMemo(() => {
        if (!snapshots.length) return [];

        // Sort by date ascending (just in case)
        const sorted = [...snapshots].sort((a, b) =>
            new Date(a.month).getTime() - new Date(b.month).getTime()
        );

        const now = new Date();
        let startDate: Date | null = null;

        switch (timeRange) {
            case "1M":
                startDate = subMonths(now, 1);
                break;
            case "3M":
                startDate = subMonths(now, 3);
                break;
            case "6M":
                startDate = subMonths(now, 6);
                break;
            case "1Y":
                startDate = subYears(now, 1);
                break;
            case "3Y":
                startDate = subYears(now, 3);
                break;
            case "ALL":
            default:
                startDate = null;
        }

        let filtered = sorted;
        if (startDate) {
            // Include data points AFTER the start date
            // We also include the one immediately preceding the start date if possible to have a starting line/point
            // But usually, strict filtering is fine.
            filtered = sorted.filter(s => isAfter(new Date(s.month), startDate!) || new Date(s.month) >= startDate!);
        }

        // If filtering leaves too few points for a line, maybe include at least the last known point before range?
        // For now, let's stick to simple filtering.

        return filtered.map(s => ({
            date: s.month, // YYYY-MM
            netWorth: Number(s.netWorth),
            formattedDate: format(new Date(s.month), "MMM yy", { locale: tr }),
            fullDate: format(new Date(s.month), "MMMM yyyy", { locale: tr }),
        }));
    }, [snapshots, timeRange]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            compactDisplay: "short",
            notation: "compact", // Use K, M etc for axis
            maximumFractionDigits: 1,
        }).format(value);
    };

    const formatTooltipCurrency = (value: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2,
        }).format(value);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">Portföy Performansı</CardTitle>
                <div className="flex items-center gap-1">
                    {(["1M", "3M", "6M", "1Y", "3Y", "ALL"] as TimeRange[]).map((range) => (
                        <Button
                            key={range}
                            variant={timeRange === range ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setTimeRange(range)}
                        >
                            {range}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="formattedDate"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatCurrency}
                                    width={60}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                Tarih
                                                            </span>
                                                            <span className="font-bold text-muted-foreground">
                                                                {payload[0].payload.fullDate}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                Net Değer
                                                            </span>
                                                            <span className="font-bold text-emerald-600">
                                                                {formatTooltipCurrency(Number(payload[0].value))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="netWorth"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorNetWorth)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                            Bu aralık için yeterli veri yok.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
