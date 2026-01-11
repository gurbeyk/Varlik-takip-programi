import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Trash2, X, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { type Transaction, assetTypeLabels } from "@shared/schema";

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    price: "",
    quantity: "",
    createdAt: "",
  });

  const { toast } = useToast();

  // URL Filter Logic
  const [location, setLocation] = useLocation();
  const [filterAsset, setFilterAsset] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetParam = params.get("asset");
    if (assetParam) {
      setFilterAsset(decodeURIComponent(assetParam));
    } else {
      setFilterAsset(null);
    }
  }, [location]); // Re-run when location changes (wouter navigation)

  const clearFilter = () => {
    setLocation("/islemler"); // This clears query params effectively by navigating to clean path
  };

  const filteredTransactions = filterAsset
    ? transactions.filter(t => t.assetName === filterAsset)
    : transactions;


  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/transactions");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Başarılı",
        description: "Tüm işlem geçmişi silindi.",
      });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "İşlemler silinirken bir hata oluştu.",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Başarılı",
        description: "İşlem silindi.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "İşlem silinirken hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/transactions/${editingTransaction?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Başarılı",
        description: "İşlem güncellendi ve varlık hesapları yeniden yapıldı.",
      });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "İşlem güncellenirken hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      price: transaction.price.toString(),
      quantity: transaction.quantity.toString(),
      createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString().slice(0, 16) : "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    editMutation.mutate({
      price: editForm.price,
      quantity: editForm.quantity,
      createdAt: editForm.createdAt ? new Date(editForm.createdAt).toISOString() : null,
    });
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Bu işlemi silmek istediğinize emin misiniz?")) {
      deleteOneMutation.mutate(id);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            İşlemler
          </h1>
          <p className="text-muted-foreground">
            Tüm alım-satım işlemleriniz
          </p>
        </div>

        {transactions.length > 0 && !filterAsset && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Tüm İşlemleri Sil
          </Button>
        )}
      </div>

      {filterAsset && (
        <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Şu an filtreleniyor:</span>
            <Badge variant="outline" className="bg-background">{filterAsset}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 px-2 lg:px-3">
            Filtreyi Temizle
            <X className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      <Card data-testid="table-transactions">
        <CardHeader>
          <CardTitle className="text-lg">İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">
                {filterAsset ? `"${filterAsset}" için işlem bulunamadı.` : 'Henüz işlem kaydı yok.'}
              </p>
              {!filterAsset && (
                <p className="text-sm text-muted-foreground">
                  Varlık ekleyip güncellediğinizde işlemler burada görüntülenecek.
                </p>
              )}
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
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => {
                    const isBuy = transaction.type === 'buy';
                    return (
                      <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${isBuy
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                              }`}>
                              {isBuy ? (
                                <ArrowDownLeft className={`w-4 h-4 ${isBuy ? 'text-emerald-600 dark:text-emerald-400' : ''
                                  }`} />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <span className={`font-medium ${isBuy
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
                            {assetTypeLabels[transaction.assetType as keyof typeof assetTypeLabels] || transaction.assetType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(transaction.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(Number(transaction.price))}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium ${isBuy
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
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditClick(transaction)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tüm işlemleri silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Tüm işlem geçmişiniz, portföyünüzdeki tüm varlıklar ve performans verileriniz kalıcı olarak silinecektir.
              Hesabınız sıfırlanacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Evet, Hepsini Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İşlemi Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Fiyat</Label>
              <Input
                id="price"
                type="number"
                step="0.00000001"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Miktar</Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="createdAt">Tarih</Label>
              <Input
                id="createdAt"
                type="datetime-local"
                value={editForm.createdAt}
                onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
}

