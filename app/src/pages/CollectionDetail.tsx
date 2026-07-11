import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import NeuralMatrixGrid from "@/components/NeuralMatrixGrid";
import HolographicParticles from "@/components/HolographicParticles";
import Navbar from "@/components/Navbar";
import SortableCollectionItem from "@/components/SortableCollectionItem";
import AddCapsuleToCollectionDialog from "@/components/AddCapsuleToCollectionDialog";
import CollectionDialog from "@/components/CollectionDialog";
import { Button } from "@/components/ui/button";
import type { CollectionItem } from "@/types";

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const collectionId = Number(id);
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: collection, isLoading: collectionLoading } =
    trpc.collection.get.useQuery(
      { id: collectionId },
      { enabled: !Number.isNaN(collectionId) }
    );

  const { data: items = [], isLoading: itemsLoading } =
    trpc.collection.items.useQuery(
      { id: collectionId },
      { enabled: !Number.isNaN(collectionId) }
    );

  const [localItems, setLocalItems] = useState<CollectionItem[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderMutation = trpc.collection.reorder.useMutation({
    onError: (error) => {
      toast.error("排序失败 / Reorder failed", { description: error.message });
      utils.collection.items.invalidate({ id: collectionId });
    },
  });

  const removeItemMutation = trpc.collection.removeItem.useMutation({
    onSuccess: () => {
      utils.collection.items.invalidate({ id: collectionId });
      utils.collection.list.invalidate();
      toast.success("已移除 / Removed");
    },
    onError: (error) =>
      toast.error("移除失败 / Remove failed", { description: error.message }),
  });

  const deleteCollectionMutation = trpc.collection.delete.useMutation({
    onSuccess: () => {
      utils.collection.list.invalidate();
      utils.capsule.list.invalidate();
      toast.success("胶囊集已删除 / Collection deleted");
      navigate(-1);
    },
    onError: (error) =>
      toast.error("删除失败 / Delete failed", { description: error.message }),
  });

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localItems.findIndex((i) => i.capsuleId === active.id);
    const newIndex = localItems.findIndex((i) => i.capsuleId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(newItems);

    reorderMutation.mutate({
      collectionId,
      items: newItems.map((it, idx) => ({
        capsuleId: it.capsuleId,
        sortOrder: idx,
      })),
    });
  };

  const handleRemove = (capsuleId: number) => {
    removeItemMutation.mutate({ collectionId, capsuleId });
  };

  const handleDeleteCollection = () => {
    if (
      collection &&
      confirm(`删除胶囊集 "${collection.name}"？其中的胶囊不会被删除。`)
    ) {
      deleteCollectionMutation.mutate({ id: collectionId });
    }
  };

  const bgAndNav = (
    <>
      <NeuralMatrixGrid />
      <HolographicParticles />
    </>
  );

  if (Number.isNaN(collectionId)) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
        {bgAndNav}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pt-20">
          <Navbar />
          <p
            className="text-sm text-white/30"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            无效的胶囊集 ID
          </p>
        </div>
      </div>
    );
  }

  if (collectionLoading || itemsLoading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
        {bgAndNav}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pt-20">
          <Navbar />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
        {bgAndNav}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pt-20">
          <Navbar />
          <p
            className="mb-4 text-sm text-white/30"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            胶囊集不存在或无权访问
          </p>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-white/10 bg-white/5 text-white/70 hover:text-white"
          >
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
      {bgAndNav}

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
        <Navbar />

        {/* Header */}
        <div className="glass-panel w-full max-w-[640px] rounded-xl p-6 mb-6">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-md p-1.5 text-white/40 transition-all hover:bg-white/5 hover:text-white"
              aria-label="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <span
              className="text-xs tracking-wider text-white/40 uppercase"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Collection
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: collection.coverColor ?? "#00f0ff",
                boxShadow: `0 0 10px ${collection.coverColor ?? "#00f0ff"}`,
              }}
            />
            <div className="min-w-0 flex-1">
              <h1
                className="truncate text-lg font-bold text-white"
                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
              >
                {collection.name}
              </h1>
              {collection.description && (
                <p
                  className="mt-1 text-sm text-white/50"
                  style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                >
                  {collection.description}
                </p>
              )}
              <p
                className="mt-2 text-xs text-white/30"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {localItems.length} capsules
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setEditDialogOpen(true)}
                className="rounded-md p-2 text-white/40 transition-all hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]"
                title="编辑胶囊集"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDeleteCollection}
                className="rounded-md p-2 text-white/40 transition-all hover:bg-red-500/20 hover:text-red-400"
                title="删除胶囊集"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Add capsule button */}
        <div className="mb-4 flex w-full max-w-[640px] justify-end">
          <Button
            onClick={() => setAddDialogOpen(true)}
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Plus size={14} className="mr-1.5" />
            添加胶囊
          </Button>
        </div>

        {/* Sortable capsule list */}
        <div className="w-full max-w-[640px]">
          {localItems.length === 0 ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <p
                className="text-sm text-white/30"
                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
              >
                还没有胶囊，点击上方「添加胶囊」
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={localItems.map((i) => i.capsuleId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {localItems.map((item) => (
                    <SortableCollectionItem
                      key={item.capsuleId}
                      capsule={item}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <AddCapsuleToCollectionDialog
        collectionId={collectionId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        existingIds={localItems.map((i) => i.capsuleId)}
      />

      <CollectionDialog
        key={collection?.id ?? "new"}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        collection={collection}
      />
    </div>
  );
}
