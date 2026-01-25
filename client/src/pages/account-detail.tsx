import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type Account, type CashTransaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, ArrowRightLeft, Trash2, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo } from "react";
import { AccountDialog } from "@/components/account-dialog";
import { TransferDialog } from "@/components/transfer-dialog";
import { BulkCashTransactionDialog } from "@/components/bulk-cash-transaction-dialog";
import { CashTransactionDialog } from "@/components/cash-transaction-dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"; // Reuse existing
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AccountDetail() {
    const [, params] = useRoute("/hesaplar/:id");
    const accountId = params?.id;
    const [_, setLocation] = useLocation();
    const { toast } = useToast();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    // Transaction Edit/Delete State
    const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);

    const { data: account, isLoading: isLoadingAccount } = useQuery<Account>({
        queryKey: [`/api/accounts/${accountId}`],
        enabled: !!accountId
    });

    const { data: allTransactions, isLoading: isLoadingTransactions } = useQuery<CashTransaction[]>({
        queryKey: ["/api/cash-transactions"],
        enabled: !!accountId
    });

    const deleteTransactionMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/cash-transactions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            queryClient.invalidateQueries({ queryKey: [`/api/accounts/${accountId}`] });
            toast({ title: "Başarılı", description: "İşlem silindi." });
            setTransactionToDelete(null);
        },
        onError: () => {
            toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" });
        }
    });

    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/accounts/${accountId}`);
        },
        onSuccess: () => {
            toast({
                title: "Hesap Silindi",
                description: "Hesap ve ilişkili veriler başarıyla silindi.",
            });
            setLocation("/hesaplar");
        },
        onError: () => {
            toast({
                title: "Hata",
                description: "Hesap silinirken bir hata oluştu.",
                variant: "destructive",
            });
        }
    });

    // Filter transactions for this account (Client side filter for MVP)
    const transactions = allTransactions?.filter(
        t => t.accountId === accountId || t.toAccountId === accountId
    );

    // Calculate Running Balance (Backwards)
    const processedTransactions = useMemo(() => {
        if (!transactions || !account) return [];

        // Sort descending (Newest first)
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let currentIterativeBalance = Number(account.balance);

        return sorted.map(tx => {
            const balanceSnapshot = currentIterativeBalance;

            // Reverse logic to find "Previous Balance" for next iteration
            // Since Current = Previous + Amount
            // Then Previous = Current - Amount

            // Amount Handling:
            // Storage now stores: Income (+), Expense (-), Transfer Out (-)
            // So for Source Account (tx.accountId === accountId), we effectively ADD tx.amount.
            // But if we are the Target Account (tx.toAccountId === accountId), we receive +ABS(amount).

            let effectAmount = Number(tx.amount); // Default signed amount

            if (tx.type === 'transfer' && tx.toAccountId === accountId) {
                // We are target. Amount is Outflow from Source (-). We need Inflow (+).
                // Apply exchange rate if present
                let rawAmount = Math.abs(Number(tx.amount));
                if (tx.exchangeRate) {
                    const rate = Number(tx.exchangeRate.toString().replace(',', '.'));
                    rawAmount = rawAmount * (isNaN(rate) ? 1 : rate);
                }
                effectAmount = rawAmount;
            } else {
                // We are source (or simple income/expense).
                // Database amount is already signed correctly.
                // e.g. Expense is -100.
                // Income is +100.
                // Transfer Out is -100.
                effectAmount = Number(tx.amount);
            }

            // Since we go backwards:
            // Current = Previous + Effect
            // Previous = Current - Effect
            currentIterativeBalance -= effectAmount;

            return { ...tx, balanceSnapshot, effectiveAmount: effectAmount };
        });
    }, [transactions, account]);

    if (isLoadingAccount) {
        return <div className="p-8">Yükleniyor...</div>;
    }

    if (!account) {
        return <div className="p-8">Hesap bulunamadı.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setLocation("/hesaplar")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        {account.name}
                        {account.type && <Badge variant="outline" className="text-xs font-normal capitalize">{account.type.replace('_', ' ')}</Badge>}
                    </h1>
                    <div className="text-muted-foreground text-sm">
                        {formatCurrency(Number(account.balance), account.currency || undefined)}
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsTransferOpen(true)}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Transfer
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsBulkOpen(true)}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Toplu İşlem
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Düzenle
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteAccountDialogOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Sil
                    </Button>
                </div>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>İşlem Geçmişi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Açıklama</TableHead>
                                    <TableHead>Tutar</TableHead>
                                    <TableHead>Bakiye</TableHead>
                                    <TableHead>Durum</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedTransactions.map((tx) => {
                                    const amount = Number(tx.effectiveAmount || tx.amount);
                                    const amountClass = amount > 0 ? "text-green-600" : amount < 0 ? "text-red-600" : "text-muted-foreground";
                                    const prefix = amount > 0 ? "+" : "";

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{new Date(tx.date).toLocaleDateString("tr-TR")}</TableCell>
                                            <TableCell>{tx.description || "-"}</TableCell>
                                            <TableCell className={`font-medium ${amountClass}`}>
                                                {prefix}{formatCurrency(amount, account.currency || undefined)}
                                            </TableCell>
                                            <TableCell className={`font-medium ${tx.balanceSnapshot > 0 ? "text-green-600" : tx.balanceSnapshot < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                                                {tx.balanceSnapshot > 0 ? "+" : ""}{formatCurrency(tx.balanceSnapshot, account.currency || undefined)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize">{tx.type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditingTransaction(tx); setIsTransactionDialogOpen(true); }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setTransactionToDelete(tx.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {processedTransactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            İşlem bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hesap Özeti</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Güncel Bakiye</div>
                                <div className="text-2xl font-bold">{formatCurrency(Number(account.balance), account.currency || undefined)}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Oluşturulma Tarihi</div>
                                <div>{new Date(account.createdAt || "").toLocaleDateString("tr-TR")}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AccountDialog open={isEditOpen} onOpenChange={setIsEditOpen} account={account} />
            <TransferDialog open={isTransferOpen} onOpenChange={setIsTransferOpen} defaultSourceId={account.id} />
            <BulkCashTransactionDialog open={isBulkOpen} onOpenChange={setIsBulkOpen} accountId={account.id} />

            <CashTransactionDialog
                open={isTransactionDialogOpen}
                onOpenChange={(open) => {
                    setIsTransactionDialogOpen(open);
                    if (!open) setEditingTransaction(null);
                }}
                transaction={editingTransaction}
                defaultAccountId={account.id}
            />

            <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>İşlemi silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz ve hesap bakiyenizden düşülecektir/eklenecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => transactionToDelete && deleteTransactionMutation.mutate(transactionToDelete)}
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hesabı silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. Hesap ve bu hesaba ait <strong>TÜM İŞLEM GEÇMİŞİ</strong> silinecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteAccountMutation.mutate()}
                            disabled={deleteAccountMutation.isPending}
                        >
                            {deleteAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Hesabı Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
