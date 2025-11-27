import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Asset } from "@shared/schema";

const assetFormSchema = z.object({
  name: z.string().min(1, "Varlık adı zorunludur"),
  type: z.enum(["hisse", "abd-hisse", "etf", "kripto", "gayrimenkul"], {
    required_error: "Varlık tipi seçiniz",
  }),
  symbol: z.string().optional(),
  quantity: z.string().min(1, "Miktar zorunludur").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Geçerli bir miktar giriniz"
  ),
  purchasePrice: z.string().min(1, "Alış fiyatı zorunludur").refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    "Geçerli bir fiyat giriniz"
  ),
  currentPrice: z.string().min(1, "Güncel fiyat zorunludur").refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    "Geçerli bir fiyat giriniz"
  ),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AssetFormValues & { currency?: string }) => void;
  defaultValues?: Partial<Asset>;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

const ASSET_TYPES = [
  { value: "hisse", label: "Hisse Senedi", currency: "TRY" },
  { value: "abd-hisse", label: "ABD Hisse Senedi", currency: "USD" },
  { value: "etf", label: "ETF", currency: "TRY" },
  { value: "kripto", label: "Kripto Para", currency: "USD" },
  { value: "gayrimenkul", label: "Gayrimenkul", currency: "TRY" },
];

export function AssetForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading,
  mode = "create",
}: AssetFormProps) {
  const [currency, setCurrency] = useState(defaultValues?.currency || "TRY");
  const [fetchingPrice, setFetchingPrice] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      type: (defaultValues?.type as any) || undefined,
      symbol: defaultValues?.symbol || "",
      quantity: defaultValues?.quantity?.toString() || "",
      purchasePrice: defaultValues?.purchasePrice?.toString() || "",
      currentPrice: defaultValues?.currentPrice?.toString() || "",
      purchaseDate: defaultValues?.purchaseDate 
        ? new Date(defaultValues.purchaseDate).toISOString().split('T')[0]
        : "",
      notes: defaultValues?.notes || "",
    },
  });

  const handleAssetTypeChange = (value: string) => {
    form.setValue("type", value as any);
    const selectedType = ASSET_TYPES.find(t => t.value === value);
    if (selectedType) {
      setCurrency(selectedType.currency);
    }
  };

  const handleFetchCurrentPrice = async () => {
    const symbol = form.getValues("symbol");
    const type = form.getValues("type");
    
    if (!symbol) {
      alert("Lütfen sembol giriniz");
      return;
    }

    setFetchingPrice(true);
    try {
      let price = null;
      
      if (type === "kripto") {
        // Use CoinGecko free API for crypto
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`);
        const data = await response.json();
        const cryptoId = Object.keys(data)[0];
        if (data[cryptoId] && data[cryptoId].usd) {
          price = data[cryptoId].usd;
        }
      } else if (type === "abd-hisse") {
        // Use Alpha Vantage free API for US stocks
        // Note: Alpha Vantage requires API key, so we'll use a simple fallback
        const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
        const data = await response.json();
        if (data.quoteResponse?.result?.[0]) {
          price = data.quoteResponse.result[0].regularMarketPrice;
        }
      }

      if (price) {
        form.setValue("currentPrice", price.toFixed(2));
      } else {
        alert("Fiyat alınamadı. Lütfen sembolü kontrol ediniz.");
      }
    } catch (error) {
      console.error("Error fetching price:", error);
      alert("Fiyat alınırken hata oluştu");
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSubmit = (values: AssetFormValues) => {
    onSubmit({ ...values, currency });
    form.reset();
    setCurrency("TRY");
  };

  const assetType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Yeni Varlık Ekle" : "Varlığı Düzenle"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Portföyünüze yeni bir varlık ekleyin."
              : "Varlık bilgilerini güncelleyin."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varlık Tipi</FormLabel>
                  <Select onValueChange={handleAssetTypeChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-asset-type">
                        <SelectValue placeholder="Varlık tipi seçiniz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Varlık Adı</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={assetType === "abd-hisse" ? "Örn: Apple Inc" : "Örn: Garanti Bankası"}
                      {...field}
                      data-testid="input-asset-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sembol {assetType === "abd-hisse" || assetType === "kripto" ? "" : "(Opsiyonel)"}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder={assetType === "abd-hisse" ? "Örn: AAPL" : assetType === "kripto" ? "Örn: bitcoin" : "Örn: GARAN"}
                        {...field}
                        data-testid="input-asset-symbol"
                      />
                    </FormControl>
                    {(assetType === "abd-hisse" || assetType === "kripto") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFetchCurrentPrice}
                        disabled={fetchingPrice || !field.value}
                        data-testid="button-fetch-price"
                      >
                        {fetchingPrice ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Fiyat Çek"
                        )}
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miktar</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="100"
                        {...field}
                        data-testid="input-asset-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Tarihi (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-asset-purchase-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Fiyatı ({currency})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="50.00"
                        {...field}
                        data-testid="input-asset-purchase-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Güncel Fiyat ({currency})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="55.00"
                        {...field}
                        data-testid="input-asset-current-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Varlık hakkında notlarınız..."
                      className="resize-none"
                      {...field}
                      data-testid="input-asset-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                İptal
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-submit-asset">
                {isLoading
                  ? "Kaydediliyor..."
                  : mode === "create"
                  ? "Ekle"
                  : "Güncelle"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
