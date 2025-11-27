import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Asset } from "@shared/schema";

const sellFormSchema = z.object({
  sellPrice: z.string().min(1, "Satış fiyatı zorunludur").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Geçerli bir fiyat giriniz"
  ),
});

type SellFormValues = z.infer<typeof sellFormSchema>;

interface SellAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { sellPrice: number }) => void;
  asset: Asset | null;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function SellAssetDialog({
  open,
  onOpenChange,
  onSubmit,
  asset,
  isLoading,
}: SellAssetDialogProps) {
  const form = useForm<SellFormValues>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: {
      sellPrice: "",
    },
  });

  const handleSubmit = (values: SellFormValues) => {
    onSubmit({ sellPrice: Number(values.sellPrice) });
    form.reset();
  };

  if (!asset) return null;

  const currentQuantity = Number(asset.quantity);
  const purchasePrice = Number(asset.purchasePrice);
  const sellPrice = form.watch("sellPrice") ? Number(form.getValues("sellPrice")) : purchasePrice;
  
  const currentValue = currentQuantity * purchasePrice;
  const saleValue = currentQuantity * sellPrice;
  const realizedPnL = saleValue - currentValue;
  const realizedPnLPercent = currentValue > 0 ? (realizedPnL / currentValue) * 100 : 0;
  const isProfit = realizedPnL >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Varlığı Sat</DialogTitle>
          <DialogDescription>
            "{asset.name}" varlığını satış fiyatını belirterek satabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Asset Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Varlık Adı</span>
              <span className="font-medium">{asset.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Miktar</span>
              <span className="font-medium">{currentQuantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Alış Fiyatı</span>
              <span className="font-medium">{formatCurrency(purchasePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Alış Değeri</span>
              <span className="font-medium">{formatCurrency(currentValue)}</span>
            </div>
          </div>

          {/* Sell Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="sellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satış Fiyatı (TL)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder={purchasePrice.toString()}
                        {...field}
                        data-testid="input-sell-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Realized P&L Preview */}
              {form.getValues("sellPrice") && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Satış Değeri</span>
                    <span className="font-medium">{formatCurrency(saleValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Realize edilmiş Kar/Zarar</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      isProfit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {isProfit ? '+' : ''}{formatCurrency(realizedPnL)}
                      ({realizedPnLPercent >= 0 ? '+' : ''}{realizedPnLPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-sell"
                >
                  İptal
                </Button>
                <Button type="submit" disabled={isLoading} data-testid="button-confirm-sell">
                  {isLoading ? "Satılıyor..." : "Satışı Onayla"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
