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
import { insertBudgetSchema, type BudgetTarget, type InsertBudget, type Category } from "@shared/schema";
import { useEffect } from "react";

interface BudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    budget?: BudgetTarget | null; // If editing existing
}

export function BudgetDialog({ open, onOpenChange, budget }: BudgetDialogProps) {
    const { toast } = useToast();
    const isEditing = !!budget;

    // Fetch categories to select
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const expenseCategories = categories.filter(c => c.type === 'expense');

    const form = useForm<InsertBudget>({
        resolver: zodResolver(insertBudgetSchema),
        defaultValues: {
            categoryId: "",
            amount: "",
            period: "monthly",
            month: new Date().toISOString().slice(0, 7), // YYYY-MM
        },
    });

    useEffect(() => {
        if (budget) {
            form.reset({
                categoryId: budget.categoryId,
                amount: budget.amount,
                period: budget.period || "monthly",
                month: budget.month || new Date().toISOString().slice(0, 7),
            });
        } else {
            form.reset({
                categoryId: "",
                amount: "",
                period: "monthly",
                month: new Date().toISOString().slice(0, 7),
            });
        }
    }, [budget, form, open]);

    const mutation = useMutation({
        mutationFn: async (values: InsertBudget) => {
            // Check if updating or creating
            if (isEditing && budget) {
                await apiRequest("PATCH", `/api/budgets/${budget.id}`, values);
            } else {
                await apiRequest("POST", "/api/budgets", values);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
            toast({
                title: "Başarılı",
                description: `Bütçe hedefi ${isEditing ? "güncellendi" : "oluşturuldu"}.`,
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

    const onSubmit = (values: InsertBudget) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Bütçe Hedefini Düzenle" : "Yeni Bütçe Hedefi Belirle"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategori</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Kategori seçin" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {expenseCategories.map((cat) => (
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

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hedef Tutar (Aylık)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="Örn: 5000" {...field} />
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
                                {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
