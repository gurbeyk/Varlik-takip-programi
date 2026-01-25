import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { type Category, type InsertCashTransaction } from "@shared/schema";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface BulkCashTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: string;
}

interface ParsedTransaction {
    date: Date | null;
    dateStr: string;
    parentCategory: string;
    categoryName: string;
    description: string;
    amount: number;
    amountStr: string;
    categoryId: string | null;
    type: 'income' | 'expense' | 'transfer';
    status: 'valid' | 'error';
    error?: string;
}

export function BulkCashTransactionDialog({ open, onOpenChange, accountId }: BulkCashTransactionDialogProps) {
    const { toast } = useToast();
    const [inputData, setInputData] = useState("");
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const uploadMutation = useMutation({
        mutationFn: async (transactions: InsertCashTransaction[]) => {
            await apiRequest("POST", "/api/cash-transactions/bulk", transactions);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            queryClient.invalidateQueries({ queryKey: [`/api/accounts/${accountId}`] });
            toast({
                title: "Başarılı",
                description: "İşlemler başarıyla eklendi.",
            });
            handleClose();
        },
        onError: () => {
            toast({
                title: "Hata",
                description: "İşlemler eklenirken bir hata oluştu.",
                variant: "destructive",
            });
        },
    });

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setStep('input');
            setInputData("");
            setParsedData([]);
        }, 300);
    };

    const findCategory = (parentName: string, childName: string) => {
        // Strategy:
        // 1. Find child category first (fuzzy or exact).
        // 2. If parentName provided, verify parent matches.

        // Normalize string for comparison
        const normalize = (s: string) => s.trim().toLowerCase();
        const targetChild = normalize(childName);
        const targetParent = normalize(parentName);

        // Exact match child
        let match = categories.find(c => normalize(c.name) === targetChild);

        // If exact match not found, try finding contains
        if (!match) {
            match = categories.find(c => normalize(c.name).includes(targetChild));
        }

        // Additional check: If parent provided, ensure it matches
        if (match && parentName && match.parentId) {
            const parent = categories.find(p => p.id === match?.parentId);
            if (parent && normalize(parent.name) !== targetParent && !normalize(parent.name).includes(targetParent)) {
                // Parent mismatch warning? Or search again filtered by parent?
                // Let's try searching by parent first
                const parentCat = categories.find(c => normalize(c.name) === targetParent || normalize(c.name).includes(targetParent));
                if (parentCat) {
                    const childInParent = categories.find(c =>
                        c.parentId === parentCat.id &&
                        (normalize(c.name) === targetChild || normalize(c.name).includes(targetChild))
                    );
                    if (childInParent) match = childInParent;
                }
            }
        }

        return match;
    };

    const parseData = () => {
        if (!inputData.trim()) return;

        const rows = inputData.trim().split('\n');
        const parsed: ParsedTransaction[] = [];

        rows.forEach((row, index) => {
            const cols = row.split('\t').map(c => c.trim());
            if (cols.length < 5) return;

            // Format: Date | Parent | Category | Description | Amount
            const [dateRaw, parentName, categoryName, description, amountRaw] = cols;

            // 1. Date Parsing
            let date: Date | null = null;
            try {
                // Try DD.MM.YYYY
                const parts = dateRaw.split('.');
                if (parts.length === 3) {
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                    date = new Date(dateRaw);
                }
                if (isNaN(date.getTime())) date = null;
            } catch (e) { date = null; }

            // 2. Amount Parsing
            let amount = 0;
            try {
                // 1.000,00 -> 1000.00
                const clean = amountRaw.replace(/\./g, "").replace(',', '.');
                amount = parseFloat(clean);
                if (isNaN(amount)) amount = 0;
            } catch (e) { amount = 0; }

            // 3. Category Mapping
            const category = findCategory(parentName, categoryName);

            // 4. Determine Type
            let type: 'income' | 'expense' | 'transfer' = 'expense';
            if (category) {
                type = category.type as any;
            } else {
                // Fallback: If amount is negative? No, usually amount is positive in extract.
                // Maybe check if Parent is "Gelir"?
                if (parentName.toLowerCase().includes('gelir')) type = 'income';
            }

            parsed.push({
                date,
                dateStr: dateRaw,
                parentCategory: parentName,
                categoryName: categoryName,
                description,
                amount,
                amountStr: amountRaw,
                categoryId: category?.id || null,
                type,
                status: (date && amount !== 0 && category) ? 'valid' : 'error',
                error: !date ? 'Geçersiz Tarih' : !category ? 'Kategori Bulunamadı' : undefined
            });
        });

        setParsedData(parsed);
        setStep('preview');
    };

    const handleSubmit = () => {
        const valid = parsedData.filter(p => p.status === 'valid');
        if (valid.length === 0) {
            toast({ title: "Hata", description: "Yüklenecek geçerli işlem bulunamadı.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        const apiPayload: InsertCashTransaction[] = valid.map(p => ({
            accountId,
            categoryId: p.categoryId, // can be null, but we filtered valid ones which have category
            type: p.type,
            amount: p.amount.toString(),
            description: p.description,
            date: p.date as Date,
        }));

        uploadMutation.mutate(apiPayload);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[900px]">
                <DialogHeader>
                    <DialogTitle>Toplu İşlem Ekle</DialogTitle>
                    <DialogDescription>
                        Excel veya tablodan kopyalayıp yapıştırın. <br />
                        Format: <strong>Tarih | Üst Kategori | Kategori | Açıklama | Tutar</strong>
                    </DialogDescription>
                </DialogHeader>

                {step === 'input' ? (
                    <Textarea
                        className="min-h-[300px] font-mono text-xs whitespace-pre"
                        placeholder={`Örnek:
18.01.2024\tKonut\tDoğalgaz\tOcak Faturası\t1500,00
19.01.2024\tGelir\tMaaş\tMaaş Ödemesi\t50000`}
                        value={inputData}
                        onChange={(e) => setInputData(e.target.value)}
                    />
                ) : (
                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30px]"></TableHead>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Kategori (Sistem)</TableHead>
                                    <TableHead>Açıklama</TableHead>
                                    <TableHead>Tutar</TableHead>
                                    <TableHead>Tür</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedData.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            {row.status === 'valid'
                                                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                : <AlertCircle className="w-4 h-4 text-red-500" />
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {row.date ? format(row.date, 'dd.MM.yyyy') : <span className="text-red-500">{row.dateStr}</span>}
                                        </TableCell>
                                        <TableCell>
                                            {row.categoryId ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground">{categories.find(c => c.id === categories.find(x => x.id === row.categoryId)?.parentId)?.name || row.parentCategory}</span>
                                                    <span className="font-medium">{categories.find(c => c.id === row.categoryId)?.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-red-500">{row.parentCategory} &gt; {row.categoryName}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{row.description}</TableCell>
                                        <TableCell>{row.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell>
                                            {row.type === 'income' ? 'Gelir' : 'Gider'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}

                <DialogFooter>
                    {step === 'input' ? (
                        <Button onClick={parseData} disabled={!inputData.trim()}>
                            İncele
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep('input')}>Geri</Button>
                            <Button onClick={handleSubmit} disabled={isProcessing || parsedData.filter(p => p.status === 'valid').length === 0}>
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {parsedData.filter(p => p.status === 'valid').length} İşlemi Kaydet
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
