import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "@shared/schema";

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function Transactions() {
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">İşlemler</h1>
          <p className="text-muted-foreground">Tüm alım-satım işlemleriniz</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>İşlem Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          İşlemler
        </h1>
        <p className="text-muted-foreground">
          Tüm alım-satım işlemleriniz
        </p>
      </div>

      <Card data-testid="table-transactions">
        <CardHeader>
          <CardTitle className="text-lg">İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">Henüz işlem kaydı yok.</p>
              <p className="text-sm text-muted-foreground">
                Varlık ekleyip güncellediğinizde işlemler burada görüntülenecek.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Varlık</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Miktar</TableHead>
                    <TableHead className="text-right">Fiyat</TableHead>
                    <TableHead className="text-right">Toplam</TableHead>
                    <TableHead className="text-right">Kar/Zarar</TableHead>
                    <TableHead className="text-right">Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const isBuy = transaction.type === 'buy';
                    return (
                      <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${
                              isBuy 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                              {isBuy ? (
                                <ArrowDownLeft className={`w-4 h-4 ${
                                  isBuy ? 'text-emerald-600 dark:text-emerald-400' : ''
                                }`} />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <span className={`font-medium ${
                              isBuy 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isBuy ? 'Alış' : 'Satış'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.assetName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {ASSET_TYPE_LABELS[transaction.assetType] || transaction.assetType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(transaction.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(Number(transaction.price))}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium ${
                          isBuy 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {isBuy ? '+' : '-'}{formatCurrency(Number(transaction.totalAmount))}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {transaction.type === 'sell' && transaction.realizedPnL ? (
                            <span className={Number(transaction.realizedPnL) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}>
                              {Number(transaction.realizedPnL) >= 0 ? '+' : ''}{formatCurrency(Number(transaction.realizedPnL))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
