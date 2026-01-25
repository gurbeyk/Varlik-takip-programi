
import * as React from "react"
import { addDays, format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears } from "date-fns"
import { tr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ReportDatePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

export function ReportDatePicker({ date, setDate }: ReportDatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const presets = [
        {
            label: "Bu Ay",
            getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
        },
        {
            label: "Geçen Ay",
            getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })
        },
        {
            label: "Bu Çeyrek",
            getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) })
        },
        {
            label: "Geçen Çeyrek",
            getValue: () => ({ from: startOfQuarter(subQuarters(new Date(), 1)), to: endOfQuarter(subQuarters(new Date(), 1)) })
        },
        {
            label: "Bu Yıl",
            getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) })
        },
        {
            label: "Geçen Yıl",
            getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) })
        }
    ];

    const handlePresetSelect = (preset: typeof presets[0]) => {
        setDate(preset.getValue());
        // setOpen(false); // Optional: keep open to see selection? User provided screenshot shows it open.
    };

    return (
        <div className={cn("grid gap-2")}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "d MMMM yyyy", { locale: tr })} -{" "}
                                    {format(date.to, "d MMMM yyyy", { locale: tr })}
                                </>
                            ) : (
                                format(date.from, "d MMMM yyyy", { locale: tr })
                            )
                        ) : (
                            <span>Tarih Aralığı Seçin</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                        {/* Calendar Section */}
                        <div className="p-2 border-r">
                            <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-muted/20 rounded-t">
                                <div>
                                    <span className="text-xs text-muted-foreground block mb-1">Başlangıç</span>
                                    <div className="text-sm font-medium">
                                        {date?.from ? format(date.from, "d MMMM yyyy", { locale: tr }) : "-"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block mb-1">Bitiş</span>
                                    <div className="text-sm font-medium">
                                        {date?.to ? format(date.to, "d MMMM yyyy", { locale: tr }) : "-"}
                                    </div>
                                </div>
                            </div>
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                locale={tr}
                            />
                            <div className="p-2 flex justify-end gap-2 border-t mt-2">
                                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Vazgeç</Button>
                                <Button size="sm" onClick={() => setOpen(false)}>Uygula</Button>
                            </div>
                        </div>

                        {/* Presets Sidebar */}
                        <div className="w-[180px] p-2 bg-muted/10 flex flex-col gap-1">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                                Hızlı Seçim
                            </div>
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    className="justify-start font-normal h-8 px-2 text-sm"
                                    onClick={() => handlePresetSelect(preset)}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
