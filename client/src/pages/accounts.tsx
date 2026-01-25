
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wallet, CreditCard, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Account, insertAccountSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

export default function AccountsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [, setLocation] = useLocation();

    const { data: accounts, isLoading } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    const form = useForm({
        resolver: zodResolver(insertAccountSchema),
        defaultValues: {
            name: "",
            type: "bank",
            balance: "0",
            currency: "TRY",
            isIncluded: true,
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create account");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            setIsOpen(false);
            form.reset();
            toast({ title: "Başarılı", description: "Hesap oluşturuldu" });
        },
        onError: () => {
            toast({ title: "Hata", description: "Hesap oluşturulurken bir hata oluştu", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`/api/accounts/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            toast({ title: "Başarılı", description: "Hesap silindi" });
        },
    });

    const onSubmit = (data: any) => {
        // Treat balance as string
        data.balance = data.balance.toString();
        createMutation.mutate(data);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "bank": return <Landmark className="h-5 w-5" />;
            case "credit_card": return <CreditCard className="h-5 w-5" />;
            default: return <Wallet className="h-5 w-5" />;
        }
    };

    if (isLoading) return <div>Yükleniyor...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hesaplar</h2>
                    <p className="text-muted-foreground">
                        Banka, kredi kartı ve nakit hesaplarınızı yönetin.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Yeni Hesap
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Yeni Hesap Ekle</DialogTitle>
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
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tür</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Tür seçin" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="bank">Banka Hesabı</SelectItem>
                                                    <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                                                    <SelectItem value="cash">Nakit / Kasa</SelectItem>
                                                    <SelectItem value="investment">Yatırım Hesabı</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="balance"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Başlangıç Bakiyesi</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
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
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Para birimi seçin" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="TRY">TRY</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="isIncluded"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Net Varlığa Dahil Et</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-8">
                {/* Cash Accounts */}
                {accounts?.filter(a => a.type === 'cash').length ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Wallet className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">Nakit Varlıklar</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {accounts.filter(a => a.type === 'cash').map((account) => (
                                <Card
                                    key={account.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setLocation(`/hesaplar/${account.id}`)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {account.name}
                                        </CardTitle>
                                        {getIcon(account.type)}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {Number(account.balance).toLocaleString("tr-TR", { style: "currency", currency: account.currency || "TRY" })}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMutation.mutate(account.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Bank Accounts */}
                {accounts?.filter(a => a.type === 'bank').length ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Landmark className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">Banka Hesapları</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {accounts.filter(a => a.type === 'bank').map((account) => (
                                <Card
                                    key={account.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setLocation(`/hesaplar/${account.id}`)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {account.name}
                                        </CardTitle>
                                        {getIcon(account.type)}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {Number(account.balance).toLocaleString("tr-TR", { style: "currency", currency: account.currency || "TRY" })}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMutation.mutate(account.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Credit Cards */}
                {accounts?.filter(a => a.type === 'credit_card').length ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">Kredi Kartları</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {accounts.filter(a => a.type === 'credit_card').map((account) => (
                                <Card
                                    key={account.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setLocation(`/hesaplar/${account.id}`)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {account.name}
                                        </CardTitle>
                                        {getIcon(account.type)}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {Number(account.balance).toLocaleString("tr-TR", { style: "currency", currency: account.currency || "TRY" })}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMutation.mutate(account.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Investment Accounts */}
                {accounts?.filter(a => a.type === 'investment').length ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Landmark className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">Yatırım Hesapları</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {accounts.filter(a => a.type === 'investment').map((account) => (
                                <Card
                                    key={account.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setLocation(`/hesaplar/${account.id}`)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {account.name}
                                        </CardTitle>
                                        {getIcon(account.type)}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {Number(account.balance).toLocaleString("tr-TR", { style: "currency", currency: account.currency || "TRY" })}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMutation.mutate(account.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Other/Unclassified */}
                {accounts?.filter(a => !['cash', 'bank', 'credit_card', 'investment'].includes(a.type)).length ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Wallet className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">Diğer Hesaplar</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {accounts.filter(a => !['cash', 'bank', 'credit_card', 'investment'].includes(a.type)).map((account) => (
                                <Card
                                    key={account.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setLocation(`/hesaplar/${account.id}`)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {account.name}
                                        </CardTitle>
                                        {getIcon(account.type)}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {Number(account.balance).toLocaleString("tr-TR", { style: "currency", currency: account.currency || "TRY" })}
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMutation.mutate(account.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
