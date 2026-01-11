
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AnalyticsData {
    portfolio: {
        xirr: number;
        totalValue: number;
        benchmarks: {
            bist100: number;
            gold: number;
            dollar: number;
        }
    };
    assets: {
        id: string;
        name: string;
        symbol: string;
        type: string;
        quantity: string;
        currentPrice: string;
        purchasePrice: string;
        currency: string;
        analysis: {
            xirr: number;
            marketReturns: {
                '1m': number;
                '3m': number;
                '6m': number;
                '1y': number;
                '3y': number;
            }
        }
    }[];
}

export default function Analytics() {
    const { data, isLoading, error } = useQuery<AnalyticsData>({
        queryKey: ["/api/analytics/detailed"],
        // Refetch rarely as it's heavy
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-destructive">
                Veriler yüklenirken bir hata oluştu: {(error as Error)?.message || "Bilinmeyen Hata"}
                <br />
                <span className="text-xs text-muted-foreground">
                    {(error as any)?.info?.message || JSON.stringify(error)}
                </span>
            </div>
        );
    }

    const { portfolio, assets } = data;

    const formatPercent = (val: number) => {
        if (val === undefined || val === null || isNaN(val)) return "-";
        return new Intl.NumberFormat('tr-TR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val); // XIRR is usually decimal 0.15 for 15%? Backend returns rate?
        // My calculateXIRR returns decimal rate (0.15).
        // My calculatePeriodReturn returns PERCENTAGE (15.0).
        // Need to handle this difference.
        // Let's assume calculateXIRR returns decimal (0.15) -> formatPercent handles decimals 0-1 well?
        // Intl 'percent' expects 0.15 for 15%.
        // PeriodReturn 15.0 -> needs div 100? Or just change formatter.
    };

    const formatDecimalPercent = (val: number) => {
        // Inputs: 0.15 -> 15%
        return new Intl.NumberFormat('tr-TR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val);
    };

    const formatNumberPercent = (val: number) => {
        // Inputs: 15.5 -> 15.5%
        if (val === undefined || val === null || isNaN(val)) return "-";
        return `${val.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    const getColor = (val: number) => {
        if (!val) return "";
        return val > 0 ? "text-emerald-600" : (val < 0 ? "text-red-600" : "");
    };

    const getXirrColor = (val: number) => {
        // XIRR is decimal. 0 is neutral.
        if (val > 0) return "text-emerald-600";
        if (val < 0) return "text-red-600";
        return "";
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Gelişmiş Performans Analizi</h1>

            {/* Scorecards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Portföy İç Verim Oranı (XIRR)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getXirrColor(portfolio.xirr)}`}>
                            {formatDecimalPercent(portfolio.xirr)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Nakdin zaman değerini dikkate alan gerçek getiri
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            BIST 100 Getirisi (1 Yıl)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${portfolio.benchmarks.bist100 > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatNumberPercent(portfolio.benchmarks.bist100)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Karşılaştırma ölçütü
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Gram Altın Getirisi (1 Yıl)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${portfolio.benchmarks.gold > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatNumberPercent(portfolio.benchmarks.gold)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Karşılaştırma ölçütü
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Portföy Değeri
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(portfolio.totalValue)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assets Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Varlık Bazlı Performans</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Varlık</TableHead>
                                <TableHead className="text-right">Maliyet (Avg)</TableHead>
                                <TableHead className="text-right">Fiyat</TableHead>
                                <TableHead className="text-right">XIRR</TableHead>
                                <TableHead className="text-right">1 Ay</TableHead>
                                <TableHead className="text-right">3 Ay</TableHead>
                                <TableHead className="text-right">6 Ay</TableHead>
                                <TableHead className="text-right">1 Yıl</TableHead>
                                <TableHead className="text-right">3 Yıl</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.map((asset) => (
                                <TableRow key={asset.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{asset.symbol || asset.name}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{asset.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(asset.purchasePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {asset.currency}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(asset.currentPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {asset.currency}
                                    </TableCell>
                                    <TableCell className={`text-right font-semibold ${getXirrColor(asset.analysis.xirr)}`}>
                                        {formatDecimalPercent(asset.analysis.xirr)}
                                    </TableCell>
                                    <TableCell className={`text-right ${getColor(asset.analysis.marketReturns['1m'])}`}>
                                        {formatNumberPercent(asset.analysis.marketReturns['1m'])}
                                    </TableCell>
                                    <TableCell className={`text-right ${getColor(asset.analysis.marketReturns['3m'])}`}>
                                        {formatNumberPercent(asset.analysis.marketReturns['3m'])}
                                    </TableCell>
                                    <TableCell className={`text-right ${getColor(asset.analysis.marketReturns['6m'])}`}>
                                        {formatNumberPercent(asset.analysis.marketReturns['6m'])}
                                    </TableCell>
                                    <TableCell className={`text-right ${getColor(asset.analysis.marketReturns['1y'])}`}>
                                        {formatNumberPercent(asset.analysis.marketReturns['1y'])}
                                    </TableCell>
                                    <TableCell className={`text-right ${getColor(asset.analysis.marketReturns['3y'])}`}>
                                        {formatNumberPercent(asset.analysis.marketReturns['3y'])}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
