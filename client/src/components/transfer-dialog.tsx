import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertCashTransactionSchema, type InsertCashTransaction, type Account } from "@shared/schema";
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

interface TransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultSourceId?: string;
}

// Custom schema for transfer to enforce source and destination
const transferSchema = insertCashTransactionSchema.extend({
    toAccountId: z.string().min(1, "Hedef hesap seçilmelidir"),
});

export function TransferDialog({ open, onOpenChange, defaultSourceId }: TransferDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch accounts to populate select options
    const { data: accounts } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    const form = useForm<InsertCashTransaction>({
        resolver: zodResolver(transferSchema),
        defaultValues: {
            type: "transfer",
            amount: "0",
            description: "",
            date: new Date(),
            categoryId: undefined, // Transfers generally don't have categories in this simple view, or system defaults
            accountId: defaultSourceId || "",
            exchangeRate: "1",
        },
    });

    const transferMutation = useMutation({
        mutationFn: async (data: InsertCashTransaction) => {
            const res = await apiRequest("POST", "/api/cash-transactions", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
            toast({
                title: "Transfer Başarılı",
                description: "Bakiye transferi tamamlandı.",
            });
            onOpenChange(false);
            form.reset();
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
            form.reset({
                type: "transfer",
                date: new Date(),
                amount: "0",
                description: "Virman",
                accountId: defaultSourceId || "",
                exchangeRate: "1",
            });
        }
    }, [open, form, defaultSourceId]);

    function onSubmit(data: InsertCashTransaction) {
        if (data.accountId === data.toAccountId) {
            toast({
                title: "Hata",
                description: "Kaynak ve hedef hesap aynı olamaz.",
                variant: "destructive",
            });
            return;
        }

        // Normalize inputs: replace comma with dot
        // Transfer Amount Rule: 
        // User inputs positive value (Quantity). 
        // We must convert to Negative for Source Account (Outflow).
        let normalizedAmount = Math.abs(parseFloat(data.amount.toString().replace(',', '.')));
        normalizedAmount = -normalizedAmount;

        const normalizedData = {
            ...data,
            amount: normalizedAmount.toString(),
            exchangeRate: data.exchangeRate ? data.exchangeRate.toString().replace(',', '.') : "1",
        };

        transferMutation.mutate(normalizedData);
    }

    const accountOptions = accounts || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Transfer Yap (Virman)</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="accountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kaynak Hesap</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accountOptions.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name} ({acc.currency})
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
                                name="toAccountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hedef Hesap</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accountOptions.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name} ({acc.currency})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tutar</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Açıklama</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Transfer açıklaması..." {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tarih</FormLabel>
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

                        <DialogFooter>
                            <Button type="submit" disabled={transferMutation.isPending}>
                                {transferMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Transferi Tamamla
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
