import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { assetTypeLabels, assetTypes, type Asset } from "@shared/schema";
import { Loader2, CheckCircle, AlertCircle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface BulkAssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assets: Asset[];
}

interface ParsedRow {
    purchaseDate: string | null;
    type: string;
    typeLabel: string;
    symbol: string;
    name: string;
    transactionType: 'buy' | 'sell';
    quantity: number;
    price: number;
    currency: string;
    platform?: string;
    status: 'pending' | 'verified' | 'success' | 'error';
    error?: string;
    originalRowArg?: string;
}

export function BulkAssetDialog({ open, onOpenChange, assets }: BulkAssetDialogProps) {
    const { toast } = useToast();
    const [inputData, setInputData] = useState("");
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [hasErrors, setHasErrors] = useState(false);

    const parseData = () => {
        if (!inputData.trim()) return;

        const rows = inputData.trim().split('\n');
        const parsed: ParsedRow[] = [];

        // Reverse map for labels to keys
        const labelToKey: Record<string, string> = {};
        Object.entries(assetTypeLabels).forEach(([key, label]) => {
            labelToKey[label.toLowerCase()] = key;
            labelToKey[key.toLowerCase()] = key;
        });

        rows.forEach((row, index) => {
            if (!row.trim()) return;

            const cols = row.split('\t').map(c => c.trim());

            // Expected: Tarih | Varlik Tipi | Sembol | Varlik Adi | ISLEM | Miktar | Fiyat
            if (cols.length < 6) {
                console.warn(`Row ${index} skipped, not enough columns:`, cols);
                return;
            }

            // 1. Date
            let date = null;
            try {
                let dateStr = cols[0]?.trim();
                // Handle "6.02.2025 00:00:00" -> split by space to get just date part if needed, or parse fully.
                // We prefer YYYY-MM-DD for consistency.
                if (dateStr) {
                    // Normalize separators
                    dateStr = dateStr.replace(/\//g, '.').split(' ')[0]; // Take only the date part "6.02.2025"

                    const parts = dateStr.split('.');
                    if (parts.length === 3) {
                        // day.month.year
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        date = `${year}-${month}-${day}`;
                    } else {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                            date = d.toISOString().split('T')[0];
                        }
                    }
                }
            } catch (e) { console.error(e); }

            // 2. Type
            const typeRaw = cols[1];
            let type = 'hisse';
            if (typeRaw) {
                const normalized = typeRaw.toLowerCase();
                if (labelToKey[normalized]) {
                    type = labelToKey[normalized];
                } else {
                    if (normalized.includes('hisse')) type = 'hisse';
                    else if (normalized.includes('abd')) type = 'abd-hisse';
                    else if (normalized.includes('etf')) type = 'etf';
                    else if (normalized.includes('kripto')) type = 'kripto';
                    else if (normalized.includes('fon')) type = 'fon';
                    else if (normalized.includes('emeklilik') || normalized.includes('befas')) type = 'befas';
                    else if (normalized.includes('gayrimenkul')) type = 'gayrimenkul';
                }
            }

            // 3. Symbol & 4. Name
            const symbol = cols[2];
            const name = cols[3];

            // 5. Transaction Type (Islem)
            const transRaw = cols[4]?.toLowerCase() || 'alis';
            const transactionType = (transRaw.includes('sat') || transRaw.includes('sell')) ? 'sell' : 'buy';

            // 6. Quantity
            const quantityStr = cols[5]?.replace(/\./g, '').replace(',', '.') || "0";
            const quantity = parseFloat(quantityStr) || 0;

            // 7. Price
            let price = 0;
            if (cols[6]) {
                const priceStr = cols[6].replace(/\./g, '').replace(',', '.');
                price = parseFloat(priceStr) || 0;
            }

            // 8. Platform
            const platform = cols[7]?.trim();

            parsed.push({
                purchaseDate: date,
                type,
                typeLabel: assetTypeLabels[type as keyof typeof assetTypeLabels] || type,
                symbol,
                name,
                transactionType,
                quantity,
                price,
                currency: (type === 'hisse' || type === 'fon' || type === 'befas' || type === 'gayrimenkul') ? 'TRY' : 'USD',
                platform,
                status: 'pending',
            });
        });

        setParsedData(parsed);
        setIsVerified(false);
        setHasErrors(false);
        setStep('preview');
    };

    const verifyData = async () => {
        setIsProcessing(true);
        const newParsedData = [...parsedData];
        let errorCount = 0;

        // Local simulation state
        // Deep copy assets to simulate changes
        let workingAssets = JSON.parse(JSON.stringify(assets)) as Asset[];

        // Process sequentially (Simulation)
        for (let i = 0; i < newParsedData.length; i++) {
            const row = newParsedData[i];
            // Reset status
            row.error = undefined;
            row.status = 'pending'; // temporary

            try {
                if (row.transactionType === 'buy') {
                    // Simulate Buy: Consolidate assets with Weighted Average
                    // 1. Identify existing assets
                    const existingAssets = workingAssets.filter(a =>
                        (a.symbol?.toLowerCase() === row.symbol.toLowerCase()) &&
                        (a.type === row.type) &&
                        (a.platform === row.platform || (!a.platform && !row.platform))
                    );

                    // 2. Calculate existing totals
                    let oldTotalQty = 0;
                    let oldTotalCost = 0;
                    existingAssets.forEach(a => {
                        oldTotalQty += Number(a.quantity);
                        oldTotalCost += Number(a.quantity) * Number(a.purchasePrice);
                    });

                    // 3. Add new purchase
                    const buyQty = row.quantity;
                    const buyPrice = row.price;
                    const buyCost = buyQty * buyPrice;

                    const newTotalQty = oldTotalQty + buyQty;
                    const newTotalCost = oldTotalCost + buyCost;
                    const newAvgPrice = newTotalQty > 0 ? newTotalCost / newTotalQty : 0;

                    // 4. Create Merged Mock Asset
                    const mockAsset: Asset = {
                        id: 'mock-id-' + i, // Temporary ID
                        userId: 'current-user',
                        name: row.name,
                        type: row.type,
                        symbol: row.symbol,
                        quantity: newTotalQty.toString(),
                        purchasePrice: newAvgPrice.toString(),
                        currentPrice: row.price.toString(), // Assume current price updates to latest buy price
                        currency: row.currency,
                        platform: row.platform || null,
                        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
                        notes: "Toplu ekleme (Alış - Simülasyon)",
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    // 5. Update workingAssets: Remove old fragments, add new merged one
                    workingAssets = workingAssets.filter(a =>
                        !((a.symbol?.toLowerCase() === row.symbol.toLowerCase()) &&
                            (a.type === row.type) &&
                            (a.platform === row.platform || (!a.platform && !row.platform)))
                    );
                    workingAssets.push(mockAsset);

                    row.status = 'verified';
                } else {
                    // Simulate Sell (FIFO)
                    const candidates = workingAssets.filter(a =>
                        (a.symbol?.toLowerCase() === row.symbol.toLowerCase()) &&
                        (a.type === row.type) &&
                        (a.platform === row.platform || (!a.platform && !row.platform))
                    );

                    candidates.sort((a, b) => {
                        const dateA = new Date(a.purchaseDate || 0).getTime();
                        const dateB = new Date(b.purchaseDate || 0).getTime();
                        return dateA - dateB;
                    });

                    let quantityToSell = row.quantity;
                    const totalOwned = candidates.reduce((sum, a) => sum + Number(a.quantity), 0);

                    if (totalOwned < quantityToSell) {
                        // Tolerance for floating point
                        if (Math.abs(totalOwned - quantityToSell) > 0.000001) {
                            throw new Error(`Yetersiz bakiye. Mevcut: ${totalOwned}, İstenen: ${quantityToSell}`);
                        }
                    }

                    // Simulate FIFO deduction
                    for (const asset of candidates) {
                        if (quantityToSell <= 0) break;
                        const available = Number(asset.quantity);
                        if (available <= 0) continue;

                        const sellAmount = Math.min(available, quantityToSell);
                        asset.quantity = (available - sellAmount).toString(); // Update ref
                        quantityToSell -= sellAmount;
                    }

                    row.status = 'verified';
                }
            } catch (e: any) {
                console.error(`Row ${i} verification failed`, e);
                row.status = 'error';
                row.error = e.message || "Doğrulama hatası";
                errorCount++;
            }
        }

        setParsedData(newParsedData);
        setIsVerified(true);
        setHasErrors(errorCount > 0);
        setIsProcessing(false);

        if (errorCount > 0) {
            toast({
                title: "Sorunlar Var",
                description: `${errorCount} satırda hata tespit edildi. Lütfen düzeltip tekrar deneyin.`,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Doğrulama Başarılı",
                description: "Tüm işlemler sorunsuz görünüyor. Uygulayabilirsiniz.",
            });
        }
    };

    const createMutation = useMutation({
        mutationFn: async (row: ParsedRow) => {
            const payload = {
                name: row.name,
                type: row.type,
                symbol: row.symbol,
                quantity: row.quantity.toString(),
                purchasePrice: row.price.toString(),
                currentPrice: row.price.toString(),
                currency: row.currency,
                platform: row.platform,
                purchaseDate: row.purchaseDate ? new Date(row.purchaseDate).toISOString() : null,
                notes: "Toplu ekleme (Alış)",
            };
            return await apiRequest("POST", "/api/assets", payload);
        },
    });

    const sellMutation = useMutation({
        mutationFn: async ({ id, sellPrice, sellQuantity, sellDate }: { id: string, sellPrice: number, sellQuantity: number, sellDate?: string }) => {
            return await apiRequest("POST", `/api/assets/${id}/sell`, {
                sellPrice,
                sellQuantity,
                sellDate
            });
        }
    });

    const handleImport = async () => {
        setIsProcessing(true);
        let successCount = 0;

        // Process sequentially
        const newParsedData = [...parsedData];

        // We need to fetch fresh assets if we are doing many operations that might affect each other (unlikely in bulk but possible)
        // For now we rely on the prop `assets` but realize it might get stale if we buy then sell same symbol in one batch.
        // To be safe, we perform operations and if successful we assume logic holds.

        // IMPORTANT: For Sell logic (FIFO), we need to track local state of assets because prop won't update mid-loop.
        // So we clone the assets to a local working set.
        let workingAssets = JSON.parse(JSON.stringify(assets)) as Asset[];

        for (let i = 0; i < newParsedData.length; i++) {
            const row = newParsedData[i];

            // Skip already processed rows to avoid duplicates
            if (row.status === 'success') continue;

            try {
                if (row.transactionType === 'buy') {
                    const res = await createMutation.mutateAsync(row);
                    const newAsset = await res.json();

                    // CRITICAL FIX: The backend merges assets of the same type/symbol into one.
                    // So we must remove any existing "fragmented" assets from our local state
                    // because they no longer exist in the backend (deleted).
                    // If we don't, subsequent SELLS in this loop will try to use old IDs and fail with 404.
                    workingAssets = workingAssets.filter(a =>
                        !((a.symbol?.toLowerCase() === row.symbol.toLowerCase()) &&
                            (a.type === row.type) &&
                            (a.platform === row.platform || (!a.platform && !row.platform)))
                    );

                    workingAssets.push(newAsset);

                    newParsedData[i].status = 'success';
                    successCount++;
                } else {
                    // SELL LOGIC (FIFO)
                    // Filter eligible assets
                    // Match Symbol AND Type AND Platform (case insensitive)
                    let candidates = workingAssets.filter(a =>
                        (a.symbol?.toLowerCase() === row.symbol.toLowerCase()) &&
                        (a.type === row.type) &&
                        (a.platform === row.platform || (!a.platform && !row.platform))
                    );

                    // Sort by purchase date (oldest first)
                    candidates.sort((a, b) => {
                        const dateA = new Date(a.purchaseDate || 0).getTime();
                        const dateB = new Date(b.purchaseDate || 0).getTime();
                        return dateA - dateB;
                    });

                    let quantityToSell = row.quantity;
                    const totalOwned = candidates.reduce((sum, a) => sum + Number(a.quantity), 0);

                    if (totalOwned < quantityToSell) {
                        throw new Error(`Yetersiz bakiye. Mevcut: ${totalOwned}, İstenen: ${quantityToSell}`);
                    }

                    // Fifo Loop
                    for (const asset of candidates) {
                        if (quantityToSell <= 0) break;

                        const available = Number(asset.quantity);
                        if (available <= 0) continue;

                        const sellAmount = Math.min(available, quantityToSell);

                        // Perform sell API call
                        await sellMutation.mutateAsync({
                            id: asset.id,
                            sellPrice: row.price,
                            sellQuantity: sellAmount,
                            sellDate: row.purchaseDate ? new Date(row.purchaseDate).toISOString() : undefined
                        });

                        // Update local workingAssets state
                        // If fully sold, remove or zero out
                        // If partially sold, reduce quantity
                        asset.quantity = (available - sellAmount).toString(); // Update ref in workingAssets
                        quantityToSell -= sellAmount;
                    }

                    newParsedData[i].status = 'success';
                    successCount++;
                }
            } catch (e: any) {
                console.error(`Row ${i} failed`, e);
                newParsedData[i].status = 'error';
                // Try to extract readable error from API response
                const errorMsg = e.message || "Kayıt başarısız";
                newParsedData[i].error = errorMsg.includes("unexpected") ? "Beklenmeyen hata" : errorMsg;
            }
            setParsedData([...newParsedData]);
        }

        setIsProcessing(false);

        // Refresh global queries
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

        if (successCount === newParsedData.length) {
            toast({
                title: "Başarılı",
                description: `${successCount} işlem başarıyla uygulandı.`,
            });
            setTimeout(() => {
                onOpenChange(false);
                setStep('input');
                setInputData("");
                setParsedData([]);
                setIsVerified(false);
                setHasErrors(false);
            }, 1000);
        } else {
            toast({
                title: "Tamamlandı",
                description: `${successCount} başarılı, ${newParsedData.length - successCount} başarısız.`,
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px]">
                <DialogHeader>
                    <DialogTitle>Toplu İşlem (Alış/Satış)</DialogTitle>
                    <DialogDescription>
                        Excel veya Google Sheets'ten verilerinizi kopyalayıp buraya yapıştırın.
                        <br />
                        Format: <strong>Tarih | Varlık Tipi | Sembol | Varlık Adı | İşlem | Miktar | Fiyat | Platform</strong>
                    </DialogDescription>
                </DialogHeader>

                {step === 'input' ? (
                    <div className="space-y-4">
                        <Textarea
                            placeholder={`Örnek:
6.02.2025\tBIST Hisse Senedi\tGARAN\tTurkiye Garanti Bankasi\tAlis\t10\t125\tMidas
13.12.2025 14:30\tBIST Hisse Senedi\tGARAN\tTurkiye Garanti Bankasi\tSatis\t5\t130\tMidas`}
                            className="min-h-[300px] font-mono text-sm"
                            value={inputData}
                            onChange={(e) => setInputData(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            * Satış işlemlerinde <strong>FIFO</strong> (First In First Out) yöntemi kullanılır. En eski tarihli varlık öncelikli satılır.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ScrollArea className="h-[400px] border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>D.</TableHead>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Tip</TableHead>
                                        <TableHead>Sembol</TableHead>
                                        <TableHead>İşlem</TableHead>
                                        <TableHead className="text-right">Miktar</TableHead>
                                        <TableHead className="text-right">Fiyat</TableHead>
                                        <TableHead>Platform</TableHead>
                                        <TableHead>Mesaj</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                {row.status === 'pending' && <span className="text-muted-foreground">-</span>}
                                                {row.status === 'verified' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                                {row.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                {row.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap">{row.purchaseDate}</TableCell>
                                            <TableCell className="text-xs">{row.typeLabel}</TableCell>
                                            <TableCell className="font-bold">{row.symbol}</TableCell>
                                            <TableCell>
                                                <div className={`flex items-center gap-1 text-xs font-bold ${row.transactionType === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {row.transactionType === 'buy' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                                                    {row.transactionType === 'buy' ? 'ALIŞ' : 'SATIŞ'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{row.quantity}</TableCell>
                                            <TableCell className="text-right">{row.price}</TableCell>
                                            <TableCell className="text-xs">{row.platform || '-'}</TableCell>
                                            <TableCell className="text-xs text-red-500">{row.error}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    {step === 'input' ? (
                        <Button onClick={parseData} disabled={!inputData.trim()}>
                            İncele ve Onayla
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => {
                                // Filter out successful rows when going back
                                const remainingRows = parsedData.filter(r => r.status !== 'success');
                                const text = remainingRows.map(r => {
                                    // Reconstruct tab-separated line
                                    const dateStr = r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString('tr-TR') : '';
                                    return `${dateStr}\t${r.typeLabel}\t${r.symbol}\t${r.name}\t${r.transactionType === 'buy' ? 'Alis' : 'Satis'}\t${r.quantity}\t${r.price}\t${r.platform || ''}`;
                                }).join('\n');

                                setInputData(text);
                                setStep('input');
                                setIsVerified(false);
                                setHasErrors(false);
                            }} disabled={isProcessing}>
                                Geri Düzenle
                            </Button>

                            {!isVerified || hasErrors ? (
                                <Button onClick={verifyData} disabled={isProcessing}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isProcessing ? 'Kontrol Ediliyor...' : 'Kontrol Et'}
                                </Button>
                            ) : (
                                <Button onClick={handleImport} disabled={isProcessing || hasErrors}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isProcessing ? 'İşleniyor...' : 'Verileri Uygula'}
                                </Button>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
