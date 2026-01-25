import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface BreakDownItem {
    amount: number;
    percentage: number;
}

interface MonthlyChangeBreakdownProps {
    data?: Record<string, BreakDownItem>;
    isLoading?: boolean;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatPercent(value: number): string {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
}

export function MonthlyChangeBreakdown({ data, isLoading }: MonthlyChangeBreakdownProps) {
    if (isLoading || !data) {
        return null; // Or skeleton
    }

    // Calculate total from data to show on right
    const sortedKeys = Object.keys(data).sort();

    let totalAmount = 0;
    Object.values(data).forEach(item => totalAmount += item.amount);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Aylık Değişim Detayı</CardTitle>
                <div className={`text-sm font-bold ${totalAmount >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    Toplam: {formatCurrency(totalAmount)}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Varlık Tipi</TableHead>
                            <TableHead className="text-right">Değişim (TL)</TableHead>
                            <TableHead className="text-right">Değişim (%)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedKeys.map((key) => {
                            const item = data[key];
                            const isPositive = item.amount >= 0;
                            return (
                                <TableRow key={key}>
                                    <TableCell className="font-medium">{key}</TableCell>
                                    <TableCell className={`text-right ${isPositive ? 'text-emerald-600' : 'text-orange-600'}`}>
                                        {formatCurrency(item.amount)}
                                    </TableCell>
                                    <TableCell className={`text-right ${isPositive ? 'text-emerald-600' : 'text-orange-600'}`}>
                                        {formatPercent(item.percentage)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
