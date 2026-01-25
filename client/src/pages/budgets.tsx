import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, PieChart, AlertCircle } from "lucide-react";
import { BudgetDialog } from "@/components/budget-dialog";
import { type BudgetTarget, type Category, type CashTransaction } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export default function Budgets() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<BudgetTarget | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const { toast } = useToast();

    const { data: budgets = [], isLoading: budgetsLoading } = useQuery<BudgetTarget[]>({
        queryKey: ["/api/budgets"],
    });

    const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const { data: transactions = [], isLoading: transactionsLoading } = useQuery<CashTransaction[]>({
        queryKey: ["/api/cash-transactions"],
    });

    const isLoading = budgetsLoading || categoriesLoading || transactionsLoading;

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/budgets/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
            toast({
                title: "Başarılı",
                description: "Bütçe hedefi silindi.",
            });
            setDeleteId(null);
        },
        onError: () => {
            toast({
                title: "Hata",
                description: "Silinirken hata oluştu.",
                variant: "destructive",
            });
            setDeleteId(null);
        },
    });

    const handleEdit = (budget: BudgetTarget) => {
        setEditingBudget(budget);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingBudget(null);
        setIsDialogOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId);
        }
    };

    // Analysis Logic
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    // Filter transactions for current month
    const currentMonthTransactions = transactions.filter(t =>
        t.type === 'expense' &&
        t.date &&
        (new Date(t.date).toISOString().slice(0, 7) === currentMonthStr)
    );

    // Map spending by Category ID
    const spendingByCategory: Record<string, number> = {};
    let totalSpent = 0;

    currentMonthTransactions.forEach(t => {
        if (t.categoryId) {
            spendingByCategory[t.categoryId] = (spendingByCategory[t.categoryId] || 0) + Number(t.amount);
        }
        totalSpent += Number(t.amount);
    });

    // Calculate totals for Budgets
    let totalBudgetAmount = 0;
    const budgetAnalysis = budgets.map(budget => {
        const spent = spendingByCategory[budget.categoryId] || 0;
        const amount = Number(budget.amount);
        const category = categories.find(c => c.id === budget.categoryId);
        const percent = Math.min((spent / amount) * 100, 100);
        const isOverBudget = spent > amount;

        totalBudgetAmount += amount;

        return {
            ...budget,
            categoryName: category?.name || 'Bilinmeyen',
            categoryColor: category?.color || '#cbd5e1',
            spent,
            percent,
            isOverBudget
        };
    });

    const totalBudgetPercent = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Bütçe Yönetimi</h1>
                    <p className="text-muted-foreground">Aylık harcama hedefleri ve takibi</p>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                        Bütçe Yönetimi
                    </h1>
                    <p className="text-muted-foreground">
                        {format(new Date(), 'MMMM yyyy')} Dönemi Harcama Hedefleri
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Hedef Belirle
                </Button>
            </div>

            {/* Overview Card */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex justify-between">
                            <span>Genel Durum</span>
                            <span className="text-muted-foreground font-normal text-sm">
                                Toplam Bütçe: {formatCurrency(totalBudgetAmount)}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Toplam Harcanan: {formatCurrency(totalSpent)}</span>
                                <span className={totalSpent > totalBudgetAmount ? "text-red-500 font-bold" : ""}>
                                    %{totalBudgetPercent.toFixed(0)}
                                </span>
                            </div>
                            <Progress
                                value={totalBudgetPercent}
                                className={`h-4 ${totalSpent > totalBudgetAmount ? "[&>div]:bg-red-500" : ""}`}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Budget Items */}
            {budgetAnalysis.length === 0 ? (
                <Alert>
                    <PieChart className="h-4 w-4" />
                    <AlertTitle>Henüz bütçe hedefi yok</AlertTitle>
                    <AlertDescription>
                        Harcamalarınızı kontrol altına almak için kategorilere bütçe hedefi ekleyebilirsiniz.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {budgetAnalysis.map((item) => (
                        <Card key={item.id} className={item.isOverBudget ? "border-red-200 dark:border-red-900/50" : ""}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.categoryColor }} />
                                        <CardTitle className="text-base">{item.categoryName}</CardTitle>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(item)}>
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(item.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {formatCurrency(item.spent)} / {formatCurrency(Number(item.amount))}
                                        </span>
                                        <span className={item.isOverBudget ? "text-red-600 font-bold" : "text-muted-foreground"}>
                                            %{item.percent.toFixed(0)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={item.percent}
                                        className={`h-2 ${item.isOverBudget ? "[&>div]:bg-red-500" : item.percent > 80 ? "[&>div]:bg-orange-500" : "[&>div]:bg-emerald-500"}`}
                                    />
                                    {item.isOverBudget && (
                                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Bütçe aşıldı!
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <BudgetDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                budget={editingBudget}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bütçe hedefini silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem sadece bütçe hedefini siler, kategoriye ait harcamalarınız silinmez.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
