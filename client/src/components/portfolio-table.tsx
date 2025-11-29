import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";
import type { Asset } from "@shared/schema";

interface PortfolioTableProps {
  assets: Asset[];
  isLoading?: boolean;
  onEdit?: (asset: Asset) => void;
  onSell?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  onRefreshPrices?: () => Promise<void>;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  "abd-hisse": "ABD Hisse",
  hisse: "BIST Hisse",
  etf: "ETF",
  kripto: "Kripto",
  gayrimenkul: "Gayrimenkul",
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  "abd-hisse": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  hisse: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  etf: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  kripto: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  gayrimenkul: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function formatCurrency(value: number, currency: string = 'TRY'): string {
  const currencyCode = currency === 'USD' ? 'USD' : 'TRY';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number, type: string): string {
  if (type === 'kripto') {
    return value.toFixed(8);
  }
  if (type === 'gayrimenkul') {
    return value.toFixed(0);
  }
  return value.toFixed(2);
}

// Konsolidasyon: Aynı varlığı (symbol+type+currency) birden fazla satın aldıysa birleştir
function consolidateAssets(assets: Asset[]): (Asset & { consolidatedIds: string[] })[] {
  const consolidated = new Map<string, Asset & { consolidatedIds: string[] }>();
  
  assets.forEach(asset => {
    // Symbol, type ve currency'ye göre key oluştur
    const key = `${asset.symbol || asset.name}-${asset.type}-${asset.currency || 'TRY'}`;
    
    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      const existingQty = Number(existing.quantity);
      const newQty = Number(asset.quantity);
      const existingPrice = Number(existing.purchasePrice);
      const newPrice = Number(asset.purchasePrice);
      
      // Ortalama alış fiyatı hesapla
      const weightedAvgPrice = (existingQty * existingPrice + newQty * newPrice) / (existingQty + newQty);
      
      // Toplam miktar
      const totalQty = existingQty + newQty;
      
      existing.quantity = totalQty as any;
      existing.purchasePrice = weightedAvgPrice as any;
      existing.consolidatedIds.push(asset.id);
    } else {
      consolidated.set(key, {
        ...asset,
        consolidatedIds: [asset.id]
      });
    }
  });
  
  return Array.from(consolidated.values());
}

export function PortfolioTable({ assets, isLoading, onEdit, onSell, onDelete, onRefreshPrices }: PortfolioTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Konsolidation yap
  const consolidatedAssets = consolidateAssets(assets);

  const handleRefreshPrices = async () => {
    if (!onRefreshPrices) return;
    setIsRefreshing(true);
    try {
      await onRefreshPrices();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="table-portfolio">
        <CardHeader>
          <CardTitle className="text-lg">Portföy Detayı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (assets.length === 0) {
    return (
      <Card data-testid="table-portfolio">
        <CardHeader>
          <CardTitle className="text-lg">Portföy Detayı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">Henüz varlık eklenmedi.</p>
            <p className="text-sm text-muted-foreground">
              "Varlıklarım" sayfasından yeni varlık ekleyebilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="table-portfolio">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">Portföy Detayı</CardTitle>
        {onRefreshPrices && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
            data-testid="button-refresh-prices"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="ml-2">{isRefreshing ? 'Güncelleniyor...' : 'Fiyatları Güncelle'}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Varlık Adı</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Alış Fiyatı</TableHead>
                <TableHead className="text-right">Güncel Fiyat</TableHead>
                <TableHead className="text-right">Değer</TableHead>
                <TableHead className="text-right">Kar/Zarar</TableHead>
                <TableHead className="text-right">Performans</TableHead>
                {(onEdit || onSell || onDelete) && <TableHead className="text-right">İşlemler</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {consolidatedAssets.map((asset) => {
                const quantity = Number(asset.quantity);
                const purchasePrice = Number(asset.purchasePrice);
                const currentPrice = Number(asset.currentPrice);
                const totalValue = quantity * currentPrice;
                const totalCost = quantity * purchasePrice;
                const performance = totalCost > 0 
                  ? ((totalValue - totalCost) / totalCost) * 100 
                  : 0;
                const isPositive = performance >= 0;

                return (
                  <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-medium text-foreground">{asset.name}</p>
                        {asset.symbol && (
                          <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={ASSET_TYPE_COLORS[asset.type] || ""}
                      >
                        {ASSET_TYPE_LABELS[asset.type] || asset.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatQuantity(quantity, asset.type)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(purchasePrice, asset.currency || 'TRY')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(currentPrice, asset.currency || 'TRY')}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(totalValue, asset.currency || 'TRY')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className={`font-medium ${
                        (totalValue - totalCost) >= 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {(totalValue - totalCost) >= 0 ? '+' : ''}{formatCurrency(totalValue - totalCost, asset.currency || 'TRY')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`flex items-center justify-end gap-1 font-medium ${
                        isPositive 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {isPositive ? '+' : ''}{performance.toFixed(2)}%
                      </div>
                    </TableCell>
                    {(onEdit || onSell || onDelete) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(asset)}
                              data-testid={`button-edit-${asset.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {onSell && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onSell(asset)}
                              data-testid={`button-sell-${asset.id}`}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(asset)}
                              className="text-destructive"
                              data-testid={`button-delete-${asset.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
