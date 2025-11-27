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
import type { Asset } from "@shared/schema";

const assetFormSchema = z.object({
  name: z.string().min(1, "Varlık adı zorunludur"),
  type: z.enum(["hisse", "etf", "kripto", "gayrimenkul"], {
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
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AssetFormValues) => void;
  defaultValues?: Partial<Asset>;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

const ASSET_TYPES = [
  { value: "hisse", label: "Hisse Senedi" },
  { value: "etf", label: "ETF" },
  { value: "kripto", label: "Kripto Para" },
  { value: "gayrimenkul", label: "Gayrimenkul" },
];

export function AssetForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isLoading,
  mode = "create",
}: AssetFormProps) {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      type: (defaultValues?.type as any) || undefined,
      symbol: defaultValues?.symbol || "",
      quantity: defaultValues?.quantity?.toString() || "",
      purchasePrice: defaultValues?.purchasePrice?.toString() || "",
      currentPrice: defaultValues?.currentPrice?.toString() || "",
      notes: defaultValues?.notes || "",
    },
  });

  const handleSubmit = (values: AssetFormValues) => {
    onSubmit(values);
    form.reset();
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      placeholder="Örn: Garanti Bankası"
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
                  <FormLabel>Sembol (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Örn: GARAN"
                      {...field}
                      data-testid="input-asset-symbol"
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
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alış Fiyatı (TL)</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="currentPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Güncel Fiyat (TL)</FormLabel>
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
