
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import { ReportDatePicker } from "@/components/reports/report-date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CashTransaction, Category } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Types ---
type CategoryNode = {
    id: string;
    name: string;
    amount: number;
    color: string;
    children: CategoryNode[];
};

// --- Helper Components ---

function MetricCard({ title, amount, colorClass }: { title: string, amount: number, colorClass?: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", colorClass)}>
                    {formatCurrency(amount)}
                </div>
            </CardContent>
        </Card>
    );
}

function CategoryRow({ node, level = 0, onSelect }: { node: CategoryNode, level?: number, onSelect: (id: string, name: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children.length > 0;

    return (
        <>
            <div
                className={cn(
                    "flex items-center justify-between py-2 border-b hover:bg-muted/50 transition-colors cursor-pointer", // Added cursor-pointer
                    level > 0 && "bg-muted/10",
                    // Highlight logic could be added here if needed
                )}
                style={{ paddingLeft: `${level * 24 + 12}px` }}
                onClick={() => onSelect(node.id, node.name)} // Trigger selection
            >
                <div className="flex items-center gap-2">
                    {hasChildren ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent selection when just expanding
                                setExpanded(!expanded);
                            }}
                        >
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <div className="w-6" />
                    )}

                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: node.color || "#94a3b8" }}
                    />
                    <span className="font-medium text-sm">{node.name}</span>
                </div>
                <div className="text-sm font-semibold pr-4">
                    {formatCurrency(node.amount)}
                </div>
            </div>

            {expanded && node.children.map(child => (
                <CategoryRow key={child.id} node={child} level={level + 1} onSelect={onSelect} />
            ))}
        </>
    );
}

// --- Main Page ---

export default function IncomeExpenseReport() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    // State for selected category transaction view
    const [selectedCategory, setSelectedCategory] = useState<{ id: string, name: string } | null>(null);

    // Fetch Data
    const { data: transactions, isLoading: txLoading } = useQuery<CashTransaction[]>({
        queryKey: ["/api/cash-transactions"],
    });

    const { data: categories, isLoading: catLoading } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const isLoading = txLoading || catLoading;

    // --- Processing ---
    const reportData = useMemo(() => {
        if (!transactions || !categories || !dateRange?.from || !dateRange?.to) {
            return { income: 0, expense: 0, net: 0, incomeTree: [], expenseTree: [] };
        }

        // 1. Filter Transactions by Date
        const filteredTxs = transactions.filter(tx => {
            if (!tx.date) return false;
            const d = new Date(tx.date);
            return isWithinInterval(d, { start: dateRange.from!, end: dateRange.to! });
        });

        let totalIncome = 0;
        let totalExpense = 0;

        // Map: CategoryID -> Amount
        const categoryAmounts = new Map<string, number>();

        filteredTxs.forEach(tx => {
            const amt = Number(tx.amount);
            // Sign logic: Income (+), Expense (-)
            // We sum up everything raw first to handle refunds correctly.

            if (tx.type === 'income') {
                totalIncome += amt;
            } else if (tx.type === 'expense') {
                // If it's a refund (+), it reduces the total expense.
                // If it's pure expense (-), it adds to total expense (magnitude).
                // Total Expense should be positive value representing outflow.
                // So we subtract the signed amount. 
                // Ex: -100 expense -> totalExpense -= -100 (+100).
                // Ex: +20 refund -> totalExpense -= 20 (-20).
                totalExpense -= amt;
            }

            if (tx.categoryId) {
                // Determine bucket: Income or Expense
                if (tx.type === 'income' || tx.type === 'expense') {
                    const current = categoryAmounts.get(tx.categoryId) || 0;
                    // Store signed sum. 
                    // Ex: Expense Category. -100 (Expense) + 20 (Refund) = -80.
                    categoryAmounts.set(tx.categoryId, current + amt);
                }
            }
        });

        // Build Trees
        const buildTree = (type: 'income' | 'expense'): CategoryNode[] => {
            const typeCategories = categories.filter(c => c.type === type);
            const roots = typeCategories.filter(c => !c.parentId);

            // Recursive builder
            const mapNode = (cat: Category): CategoryNode => {
                const directAmount = categoryAmounts.get(cat.id) || 0;

                // Find children
                const childrenCats = typeCategories.filter(c => c.parentId === cat.id);
                const childrenNodes = childrenCats.map(mapNode);

                // Sum children
                const childrenSum = childrenNodes.reduce((sum, child) => sum + child.amount, 0); // Sum of ABSOLUTE display amounts? NO.
                // We need to sum the signed amounts to be correct recursively.
                // But the `amount` field in CategoryNode is expected to be Positive for display/chart.

                // Correct Approach:
                // 1. We need an internal Recursive function that returns Signed Sum.
                // 2. Then we map that to the Display Node.

                // For now, let's just cheat:
                // If it's Expense Tree, we expect Negative Sums.
                // If it's Income Tree, we expect Positive Sums.

                // But wait, childrenNodes already returned "Display Amount" (Positive).
                // This breaks the recursion if we mixed signs.

                // Let's refactor: We need to pull from categoryAmounts (Signed) directly for children too.
                return {
                    id: cat.id,
                    name: cat.name,
                    amount: 0, // Placeholder, see logic below
                    color: cat.color || "#94a3b8",
                    children: []
                };
            };

            // Better Logic:
            const getSignedSum = (catId: string): number => {
                let sum = categoryAmounts.get(catId) || 0;
                const children = typeCategories.filter(c => c.parentId === catId);
                children.forEach(child => {
                    sum += getSignedSum(child.id);
                });
                return sum;
            };

            const buildNode = (cat: Category): CategoryNode => {
                const signedSum = getSignedSum(cat.id);
                // Convert to display amount based on Type
                const displayAmount = type === 'expense' ? -signedSum : signedSum;

                const children = typeCategories.filter(c => c.parentId === cat.id);
                const childrenNodes = children.map(buildNode).filter(n => n.amount > 0.01);

                return {
                    id: cat.id,
                    name: cat.name,
                    amount: displayAmount, // Use the calculated sum
                    color: cat.color || "#94a3b8",
                    children: childrenNodes.sort((a, b) => b.amount - a.amount)
                };
            };

            const nodes = roots.map(buildNode);
            // Show only if "Effective" amount is > 0
            return nodes.filter(n => n.amount > 0.01).sort((a, b) => b.amount - a.amount);
        };

        return {
            income: totalIncome,
            expense: totalExpense,
            net: totalIncome - totalExpense,
            incomeTree: buildTree('income'),
            expenseTree: buildTree('expense')
        };
    }, [transactions, categories, dateRange]);

    // --- Helper: Get Transactions for Selected Category (Recursive) ---
    const selectedTransactions = useMemo(() => {
        if (!selectedCategory || !transactions || !categories) return [];

        const getDescendantIds = (parentId: string): string[] => {
            const children = categories.filter(c => c.parentId === parentId);
            const childIds = children.map(c => c.id);
            const descendants = children.flatMap(c => getDescendantIds(c.id));
            return [parentId, ...childIds, ...descendants];
        };

        const targetIds = new Set(getDescendantIds(selectedCategory.id));

        return transactions
            .filter(tx =>
                tx.categoryId &&
                targetIds.has(tx.categoryId) &&
                (!dateRange?.from || new Date(tx.date) >= dateRange.from) &&
                (!dateRange?.to || new Date(tx.date) <= dateRange.to)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedCategory, transactions, categories, dateRange]);

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8" /></div>;

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]; // Default chart colors if category color missing

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gelir ve Gider Raporu</h1>
                    <p className="text-muted-foreground text-sm">Belirli tarih aralığındaki finansal durumunuz</p>
                </div>
                <ReportDatePicker date={dateRange} setDate={setDateRange} />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    title="Toplam Gelir"
                    amount={reportData.income}
                    colorClass="text-emerald-500"
                />
                <MetricCard
                    title="Toplam Gider"
                    amount={reportData.expense}
                    colorClass="text-red-500"
                />
                <MetricCard
                    title="Net Durum"
                    amount={reportData.net}
                    colorClass={reportData.net >= 0 ? "text-emerald-600" : "text-red-600"}
                />
            </div>

            {/* Content Split: Income vs Expense */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Income Section */}
                <Card className="border-t-4 border-t-emerald-500">
                    <CardHeader>
                        <CardTitle className="flex justify-between">
                            <span>Gelirler</span>
                            <span className="text-emerald-500">{formatCurrency(reportData.income)}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Chart */}
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={reportData.incomeTree}
                                        dataKey="amount"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                    >
                                        {reportData.incomeTree.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: number) => formatCurrency(val)}
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* List */}
                        <div className="border rounded-md divide-y">
                            {reportData.incomeTree.map(node => (
                                <CategoryRow key={node.id} node={node} onSelect={(id, name) => setSelectedCategory({ id, name })} />
                            ))}
                            {reportData.incomeTree.length === 0 && (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Bu aralıkta gelir kaydı bulunamadı.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Expense Section */}
                <Card className="border-t-4 border-t-red-500">
                    <CardHeader>
                        <CardTitle className="flex justify-between">
                            <span>Giderler</span>
                            <span className="text-red-500">{formatCurrency(reportData.expense)}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Chart */}
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={reportData.expenseTree}
                                        dataKey="amount"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                    >
                                        {reportData.expenseTree.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: number) => formatCurrency(val)}
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* List */}
                        <div className="border rounded-md divide-y">
                            {reportData.expenseTree.map(node => (
                                <CategoryRow key={node.id} node={node} onSelect={(id, name) => setSelectedCategory({ id, name })} />
                            ))}
                            {reportData.expenseTree.length === 0 && (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Bu aralıkta gider kaydı bulunamadı.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Selected Category Transactions Table */}
            {selectedCategory && (
                <Card className="animate-in slide-in-from-bottom duration-500">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>{selectedCategory.name} - İşlem Detayları</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                {selectedTransactions.length} işlem
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedTransactions.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedTransactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-medium">
                                                {format(new Date(tx.date), "d MMMM yyyy", { locale: tr })}
                                            </TableCell>
                                            <TableCell>{tx.description || "-"}</TableCell>
                                            <TableCell className={cn(
                                                "text-right font-medium",
                                                Number(tx.amount) >= 0 ? "text-emerald-600" : "text-destructive"
                                            )}>
                                                {formatCurrency(Number(tx.amount))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                bu kategori için seçili tarih aralığında işlem bulunamadı.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
