import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Asset, Transaction } from "@shared/schema";

interface AssetTransactionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: Asset | null;
    transactions: Transaction[];
}

function formatCurrency(value: number, currency: string = 'TRY'): string {
    const currencyCode = currency === 'USD' ? 'USD' : 'TRY';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: currencyCode,
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

export function AssetTransactionsDialog({ open, onOpenChange, asset, transactions }: AssetTransactionsDialogProps) {
    if (!asset) return null;

    // Filter transactions for this asset
    const assetTransactions = transactions.filter(t =>
        t.assetName === asset.name &&
        t.assetType === asset.type
    ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{asset.name} - İşlem Geçmişi</DialogTitle>
                </DialogHeader>

                {assetTransactions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        Bu varlık için işlem kaydı bulunamadı.
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[60vh]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>İşlem</TableHead>
                                    <TableHead className="text-right">Miktar</TableHead>
                                    <TableHead className="text-right">Fiyat</TableHead>
                                    <TableHead className="text-right">Toplam</TableHead>
                                    <TableHead className="text-right">Kar/Zarar</TableHead>
                                    <TableHead className="text-right">Tarih</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assetTransactions.map((transaction) => {
                                    const isBuy = transaction.type === 'buy';
                                    return (
                                        <TableRow key={transaction.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-full ${isBuy
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                        : 'bg-red-100 dark:bg-red-900/30'
                                                        }`}>
                                                        {isBuy ? (
                                                            <ArrowDownLeft className={`w-3 h-3 ${isBuy ? 'text-emerald-600 dark:text-emerald-400' : ''
                                                                }`} />
                                                        ) : (
                                                            <ArrowUpRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                                                        )}
                                                    </div>
                                                    <span className={`font-medium text-sm ${isBuy
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                        {isBuy ? 'Alış' : 'Satış'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {Number(transaction.quantity).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(Number(transaction.price), transaction.currency || 'TRY')}
                                            </TableCell>
                                            <TableCell className={`text-right font-mono ${isBuy
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                {isBuy ? '+' : '-'}{formatCurrency(Number(transaction.totalAmount), transaction.currency || 'TRY')}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {transaction.type === 'sell' && transaction.realizedPnL ? (
                                                    <span className={Number(transaction.realizedPnL) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}>
                                                        {Number(transaction.realizedPnL) >= 0 ? '+' : ''}{formatCurrency(Number(transaction.realizedPnL), transaction.currency || 'TRY')}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-sm">
                                                {formatDate(transaction.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
