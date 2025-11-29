import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioTable } from "@/components/portfolio-table";
import { AssetForm } from "@/components/asset-form";
import { SellAssetDialog } from "@/components/sell-asset-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Asset } from "@shared/schema";

export default function Assets() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    mutationFn: async ({ id, sellPrice, sellQuantity, sellDate }: { id: string; sellPrice: number; sellQuantity: number; sellDate?: string }) => {
      return await apiRequest("POST", `/api/assets/${id}/sell`, { sellPrice, sellQuantity, sellDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setSellOpen(false);
      setSellingAsset(null);
      toast({
        title: "Başarılı",
        description: "Varlık başarıyla satıldı.",
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
        description: "Varlık satılırken bir hata oluştu.",
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
        id: sellingAsset.id, 
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Varlıklarım
          </h1>
          <p className="text-muted-foreground">
            Portföyünüzdeki tüm varlıkları yönetin
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-add-asset">
          <Plus className="w-4 h-4 mr-2" />
          Varlık Ekle
        </Button>
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
        isLoading={isLoading}
        onEdit={handleEdit}
        onSell={handleSell}
        onDelete={handleDelete}
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
        description={`"${deletingAsset?.name}" varlığını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
