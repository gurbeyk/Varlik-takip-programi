
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowRight, ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CashTransaction, Account, Category, insertCashTransactionSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export default function CashTransactionsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data: transactions, isLoading: txLoading } = useQuery<CashTransaction[]>({
        queryKey: ["/api/cash-transactions"],
    });

    const { data: accounts } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    const { data: categories } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const form = useForm({
        resolver: zodResolver(insertCashTransactionSchema),
        defaultValues: {
            type: "expense",
            amount: "",
            accountId: "",
            toAccountId: null,
            categoryId: null,
            date: new Date().toISOString().split('T')[0],
            description: "",
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            // Clean up fields based on type
            if (data.type !== 'transfer') {
                data.toAccountId = null;
            }
            if (data.type === 'transfer') {
                data.categoryId = null;
            }

            const res = await fetch("/api/cash-transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "msg");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }); // Update balances
            setIsOpen(false);
            form.reset();
            toast({ title: "Başarılı", description: "İşlem eklendi" });
        },
        onError: (err) => {
            toast({ title: "Hata", description: "İşlem eklenirken hata: " + err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`/api/cash-transactions/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            toast({ title: "Başarılı", description: "İşlem silindi" });
        },
    });

    const onSubmit = (data: any) => {
        data.amount = data.amount.toString();
        // Validate
        if (data.type === 'transfer' && !data.toAccountId) {
            toast({ title: "Hata", description: "Transfer için hedef hesap seçmelisiniz", variant: "destructive" });
            return;
        }
        createMutation.mutate(data);
    };

    const selectedType = form.watch("type");

    if (txLoading) return <div>Yükleniyor...</div>;

    const getCategoryName = (id: string | null) => categories?.find(c => c.id === id)?.name || "-";
    const getAccountName = (id: string | null) => accounts?.find(a => a.id === id)?.name || "-";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Kasa Hareketleri</h2>
                    <p className="text-muted-foreground">
                        Gelir, gider ve transfer işlemlerinizi takip edin.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Yeni İşlem
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Yeni İşlem Ekle</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>İşlem Türü</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Tür seçin" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="expense">Gider (-)</SelectItem>
                                                    <SelectItem value="income">Gelir (+)</SelectItem>
                                                    <SelectItem value="transfer">Transfer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tarih</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
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
                                </div>

                                <FormField
                                    control={form.control}
                                    name="accountId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{selectedType === 'transfer' ? 'Kaynak Hesap' : 'Hesap'}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Hesap seçin" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {accounts?.map(acc => (
                                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {selectedType === 'transfer' && (
                                    <FormField
                                        control={form.control}
                                        name="toAccountId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Hedef Hesap</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Hesap seçin" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {accounts?.filter(a => a.id !== form.getValues('accountId')).map(acc => (
                                                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {selectedType !== 'transfer' && (
                                    <FormField
                                        control={form.control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Kategori</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Kategori seçin" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {categories?.filter(c => c.type === selectedType).map(cat => (
                                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                                                <Textarea placeholder="Opsiyonel..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Son İşlemler</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Tür</TableHead>
                                <TableHead>Açıklama</TableHead>
                                <TableHead>Kategori / Detay</TableHead>
                                <TableHead>Hesap</TableHead>
                                <TableHead className="text-right">Tutar</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions?.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(new Date(tx.date), "d MMM yyyy", { locale: tr })}</TableCell>
                                    <TableCell>
                                        {tx.type === 'income' ?
                                            <span className="flex items-center text-green-600"><ArrowDownLeft className="mr-1 h-4 w-4" /> Gelir</span> :
                                            tx.type === 'expense' ?
                                                <span className="flex items-center text-red-600"><ArrowUpRight className="mr-1 h-4 w-4" /> Gider</span> :
                                                <span className="flex items-center text-blue-600"><ArrowRightLeft className="mr-1 h-4 w-4" /> Transfer</span>
                                        }
                                    </TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell>
                                        {tx.type === 'transfer' ?
                                            <span>{getAccountName(tx.accountId)} <ArrowRight className="inline h-3 w-3" /> {getAccountName(tx.toAccountId)}</span> :
                                            getCategoryName(tx.categoryId)
                                        }
                                    </TableCell>
                                    <TableCell>{getAccountName(tx.accountId)}</TableCell>
                                    <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {Number(tx.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tx.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!transactions || transactions.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Henüz işlem bulunmuyor.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
