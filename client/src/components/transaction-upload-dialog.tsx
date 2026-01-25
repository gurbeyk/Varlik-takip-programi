import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type InsertCashTransaction, type Account } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileUp, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface TransactionUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Map common Turkish banking headers
const HEADER_MAPPING = {
    date: ['Tarih', 'İşlem Tarihi', 'Date'],
    description: ['Açıklama', 'İşlem Açıklaması', 'Description', 'Hareket Tipi'],
    amount: ['Tutar', 'İşlem Tutarı', 'Amount', 'Bakiye'],
};

export function TransactionUploadDialog({ open, onOpenChange }: TransactionUploadDialogProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<"upload" | "preview">("upload");
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [previewTransactions, setPreviewTransactions] = useState<InsertCashTransaction[]>([]);

    const { data: accounts = [] } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    const uploadMutation = useMutation({
        mutationFn: async (transactions: InsertCashTransaction[]) => {
            await apiRequest("POST", "/api/cash-transactions/bulk", transactions);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            toast({
                title: "Başarılı",
                description: `${previewTransactions.length} işlem başarıyla yüklendi.`,
            });
            handleClose();
        },
        onError: () => {
            toast({
                title: "Hata",
                description: "İşlemler yüklenirken bir hata oluştu.",
                variant: "destructive",
            });
        },
    });

    const handleClose = () => {
        onOpenChange(false);
        setStep("upload");
        setParsedData([]);
        setPreviewTransactions([]);
        setSelectedAccountId("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Array of arrays
                setParsedData(data);
                processParsedData(data);
            } catch (error) {
                console.error("Excel parse error:", error);
                toast({
                    title: "Hata",
                    description: "Dosya okunamadı. Lütfen geçerli bir Excel dosyası yükleyin.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    const processParsedData = (data: any[]) => {
        if (data.length < 2) return;

        const headers = (data[0] as any[]).map(h => String(h).trim().toLowerCase());

        // Auto-detect columns
        let dateIdx = -1;
        let descIdx = -1;
        let amountIdx = -1;

        headers.forEach((h, i) => {
            if (HEADER_MAPPING.date.some(m => h.includes(m.toLowerCase()))) dateIdx = i;
            // Description maps to multiple potential headers
            else if (HEADER_MAPPING.description.some(m => h.includes(m.toLowerCase()))) descIdx = i;
            else if (HEADER_MAPPING.amount.some(m => h.includes(m.toLowerCase()))) amountIdx = i;
        });

        if (dateIdx === -1 || amountIdx === -1) {
            toast({
                title: "Uyarı",
                description: "Tarih veya Tutar sütunları otomatik algılanamadı. Lütfen dosya formatını kontrol edin.",
                variant: "destructive"
            });
            // Still proceed, allow logic might be improved or user failed
            return;
        }

        const transactions: InsertCashTransaction[] = [];

        // Start from row 1 (skip header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i] as any[];
            if (!row || row.length === 0) continue;

            const dateRaw = row[dateIdx];
            let description = descIdx !== -1 ? row[descIdx] : "Excel Yüklemesi";
            let amountRaw = row[amountIdx];

            if (!dateRaw || amountRaw === undefined) continue;

            // Parse Date (Excel serial date or string)
            let date: Date;
            if (typeof dateRaw === 'number') {
                date = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
            } else {
                // Try parsing string "DD.MM.YYYY" or ISO
                const parts = String(dateRaw).split('.');
                if (parts.length === 3) {
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                    date = new Date(dateRaw);
                }
            }

            if (isNaN(date.getTime())) continue;

            // Parse Amount (handle 1.000,00 format or standard number)
            let amount = 0;
            if (typeof amountRaw === 'number') {
                amount = amountRaw;
            } else {
                // Replace dots (thousand sep) with empty, comma with dot
                const cleanStr = String(amountRaw).replace(/\./g, "").replace(',', '.');
                amount = parseFloat(cleanStr);
            }

            if (isNaN(amount)) continue;

            // Determine type (Income/Expense)
            const type = amount >= 0 ? "income" : "expense";
            const absAmount = Math.abs(amount);

            transactions.push({
                accountId: selectedAccountId, // Placeholder, will set when saving
                date: date,
                amount: absAmount.toString(),
                type: type,
                description: description,
            });
        }

        setPreviewTransactions(transactions);
        setStep("preview");
    };

    const handleSave = () => {
        if (!selectedAccountId) {
            toast({
                title: "Hata",
                description: "Lütfen işlemlerin ekleneceği hesabı seçin.",
                variant: "destructive",
            });
            return;
        }

        const finalTransactions = previewTransactions.map(t => ({
            ...t,
            accountId: selectedAccountId
        }));

        uploadMutation.mutate(finalTransactions);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Excel ile İşlem Yükle</DialogTitle>
                    <DialogDescription>
                        Banka hesap dökümünüzü (.xlsx, .csv) yükleyerek toplu işlem girişi yapabilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                {step === "upload" ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg space-y-4">
                        <FileUp className="w-12 h-12 text-muted-foreground" />
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                                Dosyanızı sürükleyin veya seçin
                            </p>
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                                Dosya Seç
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-4 text-center">
                            Desteklenen formatlar: Tarih, Açıklama, Tutar sütunlarını içeren Excel dosyaları.
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                        <div className="grid gap-2">
                            <Label>Hedef Hesap</Label>
                            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Hesap seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded">
                            <CheckCircle2 className="w-4 h-4" />
                            {previewTransactions.length} işlem bulundu.
                        </div>

                        <div className="border rounded-md flex-1 overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead>Tutar</TableHead>
                                        <TableHead>Tür</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewTransactions.map((tx, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{format(new Date(tx.date || new Date()), 'dd.MM.yyyy')}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                                            <TableCell>{tx.amount}</TableCell>
                                            <TableCell>
                                                <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>
                                                    {tx.type === 'income' ? 'Gelir' : 'Gider'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === "preview" && (
                        <Button variant="outline" onClick={() => { setStep("upload"); setPreviewTransactions([]); }}>
                            Geri
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleClose}>İptal</Button>
                    {step === "preview" && (
                        <Button onClick={handleSave} disabled={uploadMutation.isPending}>
                            {uploadMutation.isPending ? "Kaydediliyor..." : "İşlemleri Kaydet"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
