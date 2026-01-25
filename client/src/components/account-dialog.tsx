import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertAccountSchema, type InsertAccount, type Account } from "@shared/schema";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { z } from "zod";

interface AccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: Account; // Pass account for edit mode
}

// Extend schema for form to include optional initial transaction fields
const accountFormSchema = insertAccountSchema.extend({
    openingDate: z.date().optional(),
    exchangeRate: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

const PRESET_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#84cc16", // lime
    "#22c55e", // emerald
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#a855f7", // purple
    "#ec4899", // pink
    "#64748b", // slate
];

export function AccountDialog({ open, onOpenChange, account }: AccountDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isEdit = !!account;

    // Fetch opening balance if editing
    const { data: openingTx } = useQuery<{ amount: string }>({
        queryKey: [`/api/accounts/${account?.id}/opening-transaction`],
        enabled: isEdit,
    });

    const form = useForm<AccountFormData>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            name: "",
            type: "bank",
            balance: "0",
            currency: "TRY",
            color: "#2ecc71",
            isActive: true,
            openingDate: new Date(),
            exchangeRate: "1",
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: AccountFormData) => {
            if (isEdit) {
                const res = await apiRequest("PATCH", `/api/accounts/${account.id}`, data);
                return res.json();
            } else {
                const res = await apiRequest("POST", "/api/accounts", {
                    ...data,
                    // If currency is TRY, force exchangeRate to 1
                    exchangeRate: data.currency === 'TRY' ? "1" : data.exchangeRate,
                });
                return res.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            // If editing, also invalidate specific account query if used
            if (isEdit) {
                queryClient.invalidateQueries({ queryKey: [`/api/accounts/${account.id}`] });
            }
            toast({
                title: isEdit ? "Hesap güncellendi" : "Hesap oluşturuldu",
                description: isEdit ? "Hesap bilgileri güncellendi." : "Yeni hesap başarıyla eklendi.",
            });
            onOpenChange(false);
            if (!isEdit) form.reset();
        },
        onError: (error: Error) => {
            toast({
                title: "Hata",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    useEffect(() => {
        if (open) {
            if (account) {
                form.reset({
                    name: account.name,
                    type: account.type,
                    balance: openingTx ? openingTx.amount : "0", // Use opening balance if available
                    currency: account.currency,
                    color: account.color || "#2ecc71",
                    isActive: account.isActive,
                });
            } else {
                form.reset({
                    name: "",
                    type: "bank",
                    balance: "0",
                    currency: "TRY",
                    color: "#2ecc71",
                    isActive: true,
                    openingDate: new Date(),
                    exchangeRate: "1",
                });
            }
        }
    }, [open, account, form, openingTx]);

    function onSubmit(data: AccountFormData) {
        mutation.mutate(data);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Hesabı Düzenle" : "Yeni Hesap Ekle"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hesap Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Garanti Bankası" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tür</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="bank">Banka</SelectItem>
                                                <SelectItem value="cash">Nakit</SelectItem>
                                                <SelectItem value="investment">Yatırım</SelectItem>
                                                <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                                                <SelectItem value="other">Diğer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Para Birimi</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="TRY">TRY</SelectItem>
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="EUR">EUR</SelectItem>
                                                <SelectItem value="GBP">GBP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Açılış Bakiyesi</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!isEdit && (
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="openingDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Açılış Tarihi</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {form.watch("currency") !== "TRY" && (
                                    <FormField
                                        control={form.control}
                                        name="exchangeRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Döviz Kuru</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        placeholder="1.00"
                                                        {...field}
                                                        value={field.value?.toString() ?? "1"}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Renk Etiketi</FormLabel>
                                    <FormControl>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`w-6 h-6 rounded-full transition-all ${field.value === color
                                                        ? "ring-2 ring-primary ring-offset-2 scale-110"
                                                        : "hover:scale-110 opacity-70 hover:opacity-100"
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => field.onChange(color)}
                                                />
                                            ))}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEdit ? "Güncelle" : "Oluştur"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
