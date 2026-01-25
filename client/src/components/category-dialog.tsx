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
import { insertCategorySchema, type Category, type InsertCategory } from "@shared/schema";
import { useEffect } from "react";

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category | null;
}

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

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
    const { toast } = useToast();
    const isEditing = !!category;

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const form = useForm<InsertCategory>({
        resolver: zodResolver(insertCategorySchema),
        defaultValues: {
            name: "",
            type: "expense",
            color: "#64748b",
            icon: "circle",
            parentId: undefined,
        },
    });

    // Reset form when dialog opens or category changes
    useEffect(() => {
        if (category) {
            form.reset({
                name: category.name,
                type: category.type as "income" | "expense",
                color: category.color || "#64748b",
                icon: category.icon || "circle",
                parentId: category.parentId || undefined,
            });
        } else {
            form.reset({
                name: "",
                type: "expense",
                color: "#64748b",
                icon: "circle",
                parentId: undefined,
            });
        }
    }, [category, form, open]);

    const mutation = useMutation({
        mutationFn: async (values: InsertCategory) => {
            // Ensure parentId is null if "root" (undefined/empty string) is selected
            const payload = {
                ...values,
                parentId: values.parentId || null
            };

            if (isEditing && category) {
                await apiRequest("PATCH", `/api/categories/${category.id}`, payload);
            } else {
                await apiRequest("POST", "/api/categories", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            toast({
                title: "Başarılı",
                description: `Kategori ${isEditing ? "güncellendi" : "oluşturuldu"}.`,
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

    const onSubmit = (values: InsertCategory) => {
        mutation.mutate(values);
    };

    const currentType = form.watch("type");

    // Filter potential parents:
    // 1. Must be same type (income/expense)
    // 2. Must not be the category itself (if editing)
    // 3. Prevent 3-level depth? (Optional, but UI might get messy. Let's keep it simple for now and allow deep nesting)
    const potentialParents = categories.filter(c =>
        c.type === currentType &&
        c.id !== category?.id && // Don't allow self-parenting
        c.parentId !== category?.id && // Don't allow circular dependency
        !c.parentId // Only allow root categories (depth 0) to be parents
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Kategoriyi Düzenle" : "Yeni Kategori Ekle"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategori Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Market, Kira, Maaş..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tür</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            // Reset parent if type changes, as parent must be same type
                                            form.setValue("parentId", undefined);
                                        }}
                                        defaultValue={field.value}
                                        // Disable type change if editing (simplifies parent/child logic)
                                        disabled={isEditing && !!category?.parentId} // If it's a child, don't change type easily
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Tür seçin" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="expense">Gider</SelectItem>
                                            <SelectItem value="income">Gelir</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Üst Kategori (Opsiyonel)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || "root"}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Kategori Seçin (Varsayılan: Ana Kategori)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="root">Ana Kategori (Üst Kategori Yok)</SelectItem>
                                            {potentialParents.map((cat) => (
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
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Renk</FormLabel>
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
