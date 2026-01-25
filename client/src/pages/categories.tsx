import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Tag, GripVertical } from "lucide-react";
import { CategoryDialog } from "@/components/category-dialog";
import { type Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// --- Draggable Child Category Item ---
interface ChildCategoryItemProps {
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
}

function ChildCategoryItem({ category, onEdit, onDelete }: ChildCategoryItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id, data: { category } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-40 p-2 mb-1 border border-dashed rounded bg-accent/20 h-9"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center justify-between p-2 mb-1 border rounded-md bg-card hover:border-primary/50 transition-colors h-9"
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab touch-none p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                >
                    <GripVertical className="w-3 h-3" />
                </button>

                <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm shrink-0"
                    style={{ backgroundColor: category.color || '#64748b' }}
                >
                    {category.icon === 'circle' || !category.icon ? category.name.charAt(0).toUpperCase() : <Tag className="w-3 h-3" />}
                </div>

                <span className="text-xs font-normal truncate">{category.name}</span>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={() => onEdit(category)}
                >
                    <Pencil className="w-3 h-3" />
                </Button>
                {!category.isSystem && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(category.id)}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    );
}

// --- Parent Category Card (Droppable) ---
interface ParentCategoryCardProps {
    parent: Category;
    childrenCats: Category[];
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
}

function ParentCategoryCard({ parent, childrenCats, onEdit, onDelete }: ParentCategoryCardProps) {
    const { setNodeRef, isOver } = useSortable({
        id: parent.id,
        data: { category: parent, type: 'parent' },
        disabled: true // Parent card itself isn't draggable in this version, only acts as drop container
    });

    return (
        <Card ref={setNodeRef} className={cn("flex flex-col h-full", isOver && "ring-2 ring-primary/50 bg-accent/5")}>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shadow-sm shrink-0"
                        style={{ backgroundColor: parent.color || '#64748b' }}
                    >
                        {parent.icon === 'circle' || !parent.icon ? parent.name.charAt(0).toUpperCase() : <Tag className="w-4 h-4" />}
                    </div>
                    <CardTitle className="text-sm font-semibold truncate">{parent.name}</CardTitle>
                    {parent.isSystem && <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">Sistem</Badge>}
                </div>
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => onEdit(parent)}
                    >
                        <Pencil className="w-3 h-3" />
                    </Button>
                    {!parent.isSystem && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(parent.id)}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-2 pt-0 flex-1 min-h-[50px]">
                <div className="mt-2 space-y-1">
                    <SortableContext items={childrenCats.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {childrenCats.map(child => (
                            <ChildCategoryItem
                                key={child.id}
                                category={child}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </SortableContext>
                    {childrenCats.length === 0 && (
                        <div className="text-[10px] text-muted-foreground text-center py-4 border-2 border-dashed rounded-md opacity-50">
                            Alt kategori yok
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// --- Main Page ---

export default function Categories() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const { data: categories = [], isLoading } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
            await apiRequest("PATCH", `/api/categories/${id}`, { parentId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        },
        onError: () => {
            toast({ title: "Hata", description: "Taşıma başarısız.", variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            toast({ title: "Kategori silindi", description: "Kategori başarıyla silindi." });
            setDeleteId(null);
        },
        onError: () => {
            toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" });
            setDeleteId(null);
        },
    });

    // Derived State
    const incomeCats = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);
    const expenseCats = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);

    // Grouping helper
    const groupCategories = (list: Category[]) => {
        const roots = list.filter(c => !c.parentId);
        // Map parentId -> Children
        const childrenMap = new Map<string, Category[]>();
        list.filter(c => c.parentId).forEach(child => {
            if (!child.parentId) return;
            const current = childrenMap.get(child.parentId) || [];
            current.push(child);
            childrenMap.set(child.parentId, current);
        });

        // Also catch orphans? (Children whose parents don't exist/filtered) 
        // For now assume valid parents.

        return { roots, childrenMap };
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // We could use this for optimistic UI updates (moving items visually between lists)
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeItemId = active.id as string;
        const overId = over.id as string;

        // Find the item being dragged
        const activeItem = categories.find(c => c.id === activeItemId);

        if (!activeItem) return;

        // SCENARIO 1: Dropped onto a Parent Card directly
        const targetParent = categories.find(c => c.id === overId && !c.parentId); // Is it a root category?

        if (targetParent) {
            if (activeItem.parentId !== targetParent.id) {
                updateMutation.mutate({ id: activeItemId, parentId: targetParent.id });
            }
            return;
        }

        // SCENARIO 2: Dropped onto another Child Item
        const targetChild = categories.find(c => c.id === overId && c.parentId);
        if (targetChild) {
            // Assume user wants to put it in the same group as this child
            if (activeItem.parentId !== targetChild.parentId) {
                updateMutation.mutate({ id: activeItemId, parentId: targetChild.parentId });
            }
            return;
        }

        // SCENARIO 3: Dropped elsewhere (e.g. empty space in board) -> Maybe make it root? 
        // Not implemented for safety.
    };

    const GridBoard = ({ list }: { list: Category[] }) => {
        const { roots, childrenMap } = groupCategories(list);

        // Sort roots alphabetically
        roots.sort((a, b) => a.name.localeCompare(b.name));

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    {roots.map(parent => {
                        const children = childrenMap.get(parent.id) || [];
                        children.sort((a, b) => a.name.localeCompare(b.name)); // Sort children

                        return (
                            <ParentCategoryCard
                                key={parent.id}
                                parent={parent}
                                childrenCats={children}
                                onEdit={(c) => { setEditingCategory(c); setIsDialogOpen(true); }}
                                onDelete={(id) => setDeleteId(id)}
                            />
                        );
                    })}

                    <DragOverlay>
                        {activeId ? (
                            <div className="p-2 border rounded-md bg-card shadow-xl opacity-90 h-9 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-primary/20" />
                                <span className="text-xs font-normal">
                                    {categories.find(c => c.id === activeId)?.name}
                                </span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Kategoriler</h1>
                    <p className="text-muted-foreground">
                        Alt kategorileri (küçük kutular) üst kategorilerin (büyük kartlar) içine sürükleyerek gruplandırabilirsiniz.
                    </p>
                </div>
                <Button onClick={() => { setEditingCategory(null); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Kategori
                </Button>
            </div>

            <Tabs defaultValue="expense" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="expense">Giderler</TabsTrigger>
                    <TabsTrigger value="income">Gelirler</TabsTrigger>
                </TabsList>

                <TabsContent value="expense">
                    {isLoading ? <Skeleton className="h-64 w-full" /> : <GridBoard list={expenseCats} />}
                </TabsContent>

                <TabsContent value="income">
                    {isLoading ? <Skeleton className="h-64 w-full" /> : <GridBoard list={incomeCats} />}
                </TabsContent>
            </Tabs>

            <CategoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                category={editingCategory}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kategoriyi silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. Alt kategoriler de silinebilir veya bağları kopabilir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
