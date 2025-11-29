import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
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
  currentPrice: z.string().optional(),
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
  { value: "hisse", label: "BİST Hisse Senedi", currency: "TRY" },
  { value: "abd-hisse", label: "ABD Hisse Senedi", currency: "USD" },
  { value: "etf", label: "ETF", currency: "TRY" },
  { value: "kripto", label: "Kripto Para", currency: "USD" },
  { value: "gayrimenkul", label: "Gayrimenkul", currency: "TRY" },
];

interface USStock {
  id: string;
  symbol: string;
  name: string;
}

export function AssetForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading,
  mode = "create",
}: AssetFormProps) {
  const [currency, setCurrency] = useState(defaultValues?.currency || "TRY");
  const [symbolSearch, setSymbolSearch] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

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

  const assetType = form.watch("type");

  // Search stocks (US or BIST) when typing
  const { data: stocks = [] } = useQuery<USStock[]>({
    queryKey: ["/api/stocks/search", symbolSearch, assetType],
    queryFn: async () => {
      const endpoint = assetType === "abd-hisse" ? "/api/stocks/search" : "/api/stocks/bist-search";
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(symbolSearch)}`);
      return response.json();
    },
    enabled: (assetType === "abd-hisse" || assetType === "hisse") && symbolSearch.length > 0,
    staleTime: Infinity,
  });

  const handleAssetTypeChange = (value: string) => {
    form.setValue("type", value as any);
    const selectedType = ASSET_TYPES.find(t => t.value === value);
    if (selectedType) {
      setCurrency(selectedType.currency);
    }
    // Reset currentPrice for non-hisse types
    if (value !== "hisse") {
      form.setValue("currentPrice", "");
    }
  };

  const handleSelectStock = (stock: USStock) => {
    form.setValue("symbol", stock.symbol);
    form.setValue("name", stock.name);
    setOpenCombobox(false);
    setSymbolSearch("");
  };

  const handleSubmit = (values: AssetFormValues) => {
    // For abd-hisse, hisse - ensure currentPrice is set
    if (assetType === "abd-hisse" && !values.currentPrice) {
      values.currentPrice = values.purchasePrice;
    }
    if (assetType === "hisse" && !values.currentPrice) {
      values.currentPrice = values.purchasePrice;
    }
    
    const submitData: any = { ...values, currency };
    // Keep purchaseDate as is - can be empty string or ISO date string
    
    onSubmit(submitData);
    form.reset();
    setCurrency("TRY");
  };

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
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Sembol {assetType === "abd-hisse" || assetType === "hisse" ? "" : "(Opsiyonel)"}
                  </FormLabel>
                  {assetType === "abd-hisse" || assetType === "hisse" ? (
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                          data-testid="input-asset-symbol"
                        >
                          {field.value
                            ? stocks.find((s) => s.symbol === field.value)?.symbol ||
                              field.value
                            : "Sembol seçiniz..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Sembol ara..."
                            value={symbolSearch}
                            onValueChange={setSymbolSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {symbolSearch ? "Sonuç bulunamadı" : "Yazarak arayınız"}
                            </CommandEmpty>
                            <CommandGroup>
                              {stocks.map((stock) => (
                                <CommandItem
                                  key={stock.id}
                                  value={stock.symbol}
                                  onSelect={() => handleSelectStock(stock)}
                                  data-testid={`stock-option-${stock.symbol}`}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      field.value === stock.symbol
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{stock.symbol}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {stock.name}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <FormControl>
                      <Input
                        placeholder={assetType === "etf" ? "Örn: ISENTETF" : assetType === "kripto" ? "Örn: BTC" : "Sembol"}
                        {...field}
                        data-testid="input-asset-symbol"
                      />
                    </FormControl>
                  )}
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
                      placeholder={assetType === "abd-hisse" || assetType === "hisse" ? "Otomatik doldurulacak" : "Örn: Garanti Bankası"}
                      readOnly={assetType === "abd-hisse" || assetType === "hisse"}
                      {...field}
                      data-testid="input-asset-name"
                    />
                  </FormControl>
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

            <div className={assetType === "abd-hisse" || assetType === "hisse" ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
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

              {assetType === "hisse" && (
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
              )}
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
