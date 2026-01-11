import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioTable } from "@/components/portfolio-table";
import { AssetForm } from "@/components/asset-form";
import { SellAssetDialog } from "@/components/sell-asset-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { BulkAssetDialog } from "@/components/bulk-asset-dialog";
import { Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Asset } from "@shared/schema";

export default function Assets() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [sellingAsset, setSellingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setFormOpen(false);
      toast({
        title: "Başarılı",
        description: "Varlık başarıyla eklendi.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkilendirme Hatası",
          description: "Oturumunuz sonlanmış. Yeniden giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Varlık eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/assets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      setFormOpen(false);
      setEditingAsset(null);
      toast({
        title: "Başarılı",
        description: "Varlık başarıyla güncellendi.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkilendirme Hatası",
          description: "Oturumunuz sonlanmış. Yeniden giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Varlık güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const sellMutation = useMutation({
    mutationFn: async ({ name, type, symbol, sellPrice, sellQuantity, sellDate }: { name: string; type: string; symbol?: string; sellPrice: number; sellQuantity: number; sellDate?: string }) => {
      const res = await apiRequest("POST", "/api/assets/sell-fifo", { name, type, symbol, sellPrice, sellQuantity, sellDate });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setSellOpen(false);
      setSellingAsset(null);

      const pnl = data.totalRealizedPnL !== undefined ? Number(data.totalRealizedPnL) : 0;
      const pnlText = pnl >= 0 ? `Kar: ${pnl.toFixed(2)}` : `Zarar: ${pnl.toFixed(2)}`;

      toast({
        title: "Satış Başarılı",
        description: `Varlık başarıyla satıldı. (Ortalama Maliyet) ${pnlText}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkilendirme Hatası",
          description: "Oturumunuz sonlanmış. Yeniden giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: error.message || "Varlık satılırken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setDeleteOpen(false);
      setDeletingAsset(null);
      toast({
        title: "Başarılı",
        description: "Varlık başarıyla silindi.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkilendirme Hatası",
          description: "Oturumunuz sonlanmış. Yeniden giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Varlık silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const refreshPricesMutation = useMutation({
    mutationFn: async () => {
      // Get latest assets from cache to ensure we have all assets including TEFAS funds
      const cachedAssets = queryClient.getQueryData(["/api/assets"]) as Asset[] || [];
      console.log(`[RefreshPrices] Updating ${cachedAssets.length} assets: `, cachedAssets.map(a => ({ id: a.id, name: a.name, type: a.type, symbol: a.symbol })));

      const priceUpdatePromises = cachedAssets.map((asset) =>
        apiRequest("POST", `/api/assets/${asset.id}/price`, {})
          .then(() => {
            console.log(`[RefreshPrices] ✓ Updated ${asset.name}(${asset.symbol})`);
            return true;
          })
          .catch(e => {
            console.error(`[RefreshPrices] ✗ Failed to update ${asset.name}(${asset.id}): `, e.message);
            return false;
          })
      );

      const results = await Promise.all(priceUpdatePromises);
      const successful = results.filter(r => r === true).length;
      console.log(`[RefreshPrices] Completed: ${successful} / ${cachedAssets.length} successful`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      toast({
        title: "Başarılı",
        description: "Tüm fiyatlar güncellendi.",
      });
    },
    onError: (error) => {
      console.error("[RefreshPrices] Error:", error);
      toast({
        title: "Uyarı",
        description: "Bazı fiyatlar güncellenemeyebilir, ancak mevcut veriler gösterilmektedir.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
    },
  });

  const handleCreate = () => {
    setEditingAsset(null);
    setFormOpen(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormOpen(true);
  };

  const handleSell = (asset: Asset) => {
    setSellingAsset(asset);
    setSellOpen(true);
  };

  const handleDelete = (asset: Asset) => {
    setDeletingAsset(asset);
    setDeleteOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleConfirmSell = (values: { sellPrice: number; sellQuantity: number; sellDate?: string }) => {
    if (sellingAsset) {
      sellMutation.mutate({
        name: sellingAsset.name,
        type: sellingAsset.type,
        symbol: sellingAsset.symbol || undefined,
        sellPrice: values.sellPrice,
        sellQuantity: values.sellQuantity,
        sellDate: values.sellDate,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (deletingAsset) {
      deleteMutation.mutate(deletingAsset.id);
    }
  };

  // Calculate total value
  const totalValue = assets.reduce((sum, asset) => {
    return sum + Number(asset.quantity) * Number(asset.currentPrice);
  }, 0);

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Varlık Detayı
          </h1>
          <p className="text-muted-foreground">
            Portföyünüzdeki tüm varlıkları yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} data-testid="button-bulk-add">
            <Upload className="w-4 h-4 mr-2" />
            Toplu Ekle
          </Button>
          <Button onClick={handleCreate} data-testid="button-add-asset">
            <Plus className="w-4 h-4 mr-2" />
            Varlık Ekle
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Toplam Portföy Değeri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground" data-testid="text-total-value">
            {new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(totalValue)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {assets.length} varlık
          </p>
        </CardContent>
      </Card>

      <PortfolioTable
        assets={assets}
        transactions={transactions}
        isLoading={isLoading}
        onEdit={handleEdit}
        onSell={handleSell}
        onDelete={handleDelete}
        onRefreshPrices={() => refreshPricesMutation.mutateAsync()}
      />

      <AssetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        defaultValues={editingAsset || undefined}
        isLoading={createMutation.isPending || updateMutation.isPending}
        mode={editingAsset ? "edit" : "create"}
      />

      <SellAssetDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        onSubmit={handleConfirmSell}
        asset={sellingAsset}
        isLoading={sellMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
        title="Varlığı Sil"
        description={`"${deletingAsset?.name}" varlığını silmek istediğinize emin misiniz ? Bu işlem geri alınamaz.`}
      />

      <BulkAssetDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        assets={assets}
      />
    </div>
  );
}
