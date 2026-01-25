
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertCashTransactionSchema, type InsertCashTransaction, type CashTransaction, type Category, type Account } from "@shared/schema";
import { format } from "date-fns";

interface CashTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction?: CashTransaction | null; // If provided, edit mode
    defaultAccountId?: string;
}

export function CashTransactionDialog({ open, onOpenChange, transaction, defaultAccountId }: CashTransactionDialogProps) {
    const { toast } = useToast();
    const isEditing = !!transaction;

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const { data: accounts = [] } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    const form = useForm<InsertCashTransaction>({
        resolver: zodResolver(insertCashTransactionSchema),
        defaultValues: {
            accountId: defaultAccountId || "",
            type: "expense",
            amount: "0",
            description: "",
            date: new Date(),
            categoryId: undefined,
            toAccountId: undefined,
        },
    });

    // Watch type to conditionally show fields
    const type = form.watch("type");

    useEffect(() => {
        if (transaction) {
            form.reset({
                accountId: transaction.accountId,
                type: transaction.type as "income" | "expense" | "transfer",
                amount: transaction.amount.toString(),
                description: transaction.description || "",
                date: transaction.date ? new Date(transaction.date) : new Date(),
                categoryId: transaction.categoryId || undefined,
                toAccountId: transaction.toAccountId || undefined,
            });
        } else {
            form.reset({
                accountId: defaultAccountId || "",
                type: "expense",
                amount: "",
                description: "",
                date: new Date(),
                categoryId: undefined,
                toAccountId: undefined,
            });
        }
    }, [transaction, open, defaultAccountId, form]);

    const mutation = useMutation({
        mutationFn: async (values: InsertCashTransaction) => {
            // Ensure numeric fields are strings for decimal, but safe
            const payload = {
                ...values,
                amount: values.amount.toString(),
                // Transform empty strings to null for optional fields if needed, but schema handles it?
                // zod schema might expect string for IDs.
                categoryId: values.categoryId === "null" || !values.categoryId ? null : values.categoryId,
                toAccountId: values.toAccountId === "null" || !values.toAccountId ? null : values.toAccountId
            };

            if (isEditing && transaction) {
                await apiRequest("PATCH", `/api/cash-transactions/${transaction.id}`, payload);
            } else {
                await apiRequest("POST", "/api/cash-transactions", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            if (defaultAccountId) queryClient.invalidateQueries({ queryKey: [`/api/accounts/${defaultAccountId}`] });

            toast({
                title: "Başarılı",
                description: `İşlem ${isEditing ? "güncellendi" : "oluşturuldu"}.`,
            });
            onOpenChange(false);
            form.reset();
        },
        onError: () => {
            toast({
                title: "Hata",
                description: "İşlem sırasında bir hata oluştu.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: InsertCashTransaction) => {
        // Auto-detect type based on amount sign, unless it's explicitly transfer
        // Note: values.amount is string here.
        const amt = parseFloat(values.amount.toString());

        let finalType = values.type;
        let finalAmount = values.amount.toString();

        if (values.type !== 'transfer') {
            finalType = amt >= 0 ? 'income' : 'expense';
        } else {
            // Transfer Rule: Amount entered is usually positive (Quantity), 
            // but effectively it is OUTFLOW from source.
            // So we must ensure it is Negative.
            if (amt > 0) {
                finalAmount = (-amt).toString();
            }
        }

        mutation.mutate({ ...values, type: finalType, amount: finalAmount });
    };

    // Show all categories since type is auto-deduced
    const filteredCategories = categories;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "İşlemi Düzenle" : "Yeni İşlem"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tarih</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Input
                                                type="checkbox"
                                                checked={field.value === 'transfer'}
                                                onChange={(e) => {
                                                    field.onChange(e.target.checked ? 'transfer' : 'expense');
                                                    // Default back to expense/income based on amount later, or just expense/income placeholder
                                                    // Actually we can just toggle 'transfer' vs 'standard' mode.
                                                    // But form expects strict enum.
                                                }}
                                                className="h-4 w-4"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Bu bir transfer işlemi mi?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tutar</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {type === 'transfer' ? (
                            <FormField
                                control={form.control}
                                name="toAccountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hedef Hesap</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Hesap Seçin" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accounts.filter(a => a.id !== form.getValues('accountId')).map((acc) => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kategori</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Kategori Seçin" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {/* Group by parent? For simplicity flat list first, or simple hierarchy */}
                                                {filteredCategories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Açıklama</FormLabel>
                                    <FormControl>
                                        <Input placeholder="İşlem açıklaması..." {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                İptal
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Kaydediliyor..." : isEditing ? "Güncelle" : "Oluştur"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
