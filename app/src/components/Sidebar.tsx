import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Tags,
  Trash2,
  Pin,
  LayoutGrid,
  Filter,
  Plus,
  Pencil,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import CollectionDialog from "./CollectionDialog";
import type { Collection } from "@/types";

interface SidebarProps {
  selectedTagId: number | null;
  selectedCollectionId: number | null;
  pinnedOnly: boolean;
  onTagSelect: (id: number | null) => void;
  onCollectionSelect: (id: number | null) => void;
  onPinnedToggle: (pinned: boolean) => void;
}

export default function Sidebar({
  selectedTagId,
  selectedCollectionId,
  pinnedOnly,
  onTagSelect,
  onCollectionSelect,
  onPinnedToggle,
}: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  );
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: tags = [], error: tagsError } = trpc.tag.list.useQuery();
  const { data: collections = [], error: collectionsError } = trpc.collection.list.useQuery();

  const deleteTagMutation = trpc.tag.delete.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.capsule.list.invalidate();
      toast.success("标签已删除 / Tag deleted");
    },
    onError: (error) =>
      toast.error("删除失败 / Delete failed", { description: error.message }),
  });

  const deleteCollectionMutation = trpc.collection.delete.useMutation({
    onSuccess: () => {
      utils.collection.list.invalidate();
      utils.capsule.list.invalidate();
      toast.success("胶囊集已删除 / Collection deleted");
    },
    onError: (error) =>
      toast.error("删除失败 / Delete failed", { description: error.message }),
  });

  const hasFilter =
    selectedTagId !== null || selectedCollectionId !== null || pinnedOnly;
  const isAllActive = !hasFilter;

  const handleAll = () => {
    onTagSelect(null);
    onCollectionSelect(null);
    onPinnedToggle(false);
    setOpen(false);
  };

  const handlePinned = () => {
    onTagSelect(null);
    onCollectionSelect(null);
    onPinnedToggle(!pinnedOnly);
    setOpen(false);
  };

  const handleTagClick = (id: number) => {
    onTagSelect(id);
    onCollectionSelect(null);
    onPinnedToggle(false);
    setOpen(false);
  };

  const handleCollectionClick = (id: number) => {
    onCollectionSelect(id);
    onTagSelect(null);
    onPinnedToggle(false);
    setOpen(false);
  };

  const handleManageCollection = (id: number) => {
    setOpen(false);
    navigate(`/collections/${id}`);
  };

  const handleEditCollection = (c: Collection) => {
    setEditingCollection(c);
    setDialogOpen(true);
  };

  const handleNewCollection = () => {
    setEditingCollection(null);
    setDialogOpen(true);
  };

  const handleDeleteCollection = (c: Collection) => {
    if (confirm(`删除胶囊集 "${c.name}"？其中的胶囊不会被删除。`)) {
      deleteCollectionMutation.mutate({ id: c.id });
      if (selectedCollectionId === c.id) {
        onCollectionSelect(null);
      }
    }
  };

  const handleDeleteTag = (id: number, name: string) => {
    if (confirm(`删除标签 "${name}"？关联将自动清除。`)) {
      deleteTagMutation.mutate({ id });
      if (selectedTagId === id) {
        onTagSelect(null);
      }
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className={`glass-panel flex items-center gap-2 rounded-lg px-3 py-2 text-xs tracking-wider uppercase transition-all ${
              hasFilter
                ? "text-[#00f0ff] border-[#00f0ff]/30"
                : "text-white/60 hover:text-white"
            }`}
            style={{ fontFamily: "'Space Mono', monospace" }}
            aria-label="筛选 / Filter"
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="border-white/10 bg-[#0a0a0a]/95 backdrop-blur w-72"
        >
          <SheetHeader>
            <SheetTitle
              className="text-white"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              筛选 / Filter
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="tags" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="mx-4 grid grid-cols-2 bg-white/5">
              <TabsTrigger
                value="tags"
                className="text-white/60 data-[state=active]:text-[#00f0ff] data-[state=active]:bg-white/5"
              >
                <Tags size={14} className="mr-1.5" />
                标签
              </TabsTrigger>
              <TabsTrigger
                value="collections"
                className="text-white/60 data-[state=active]:text-[#00f0ff] data-[state=active]:bg-white/5"
              >
                <Folder size={14} className="mr-1.5" />
                胶囊集
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tags" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4">
                <div className="space-y-1 pb-6">
                  <button
                    onClick={handleAll}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isAllActive
                        ? "bg-[#00f0ff]/15 text-[#00f0ff]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <LayoutGrid size={16} />
                    <span>全部 / All</span>
                  </button>

                  <button
                    onClick={handlePinned}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      pinnedOnly
                        ? "bg-[#00f0ff]/15 text-[#00f0ff]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Pin size={16} />
                    <span>置顶 / Pinned</span>
                  </button>

                  {tags.length > 0 && (
                    <div className="mt-4 mb-2 px-3 text-xs tracking-wider text-white/30 uppercase">
                      标签列表
                    </div>
                  )}

                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        selectedTagId === tag.id
                          ? "bg-[#00f0ff]/15 text-[#00f0ff]"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <button
                        onClick={() => handleTagClick(tag.id)}
                        className="flex flex-1 items-center gap-3"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: tag.color ?? "#00f0ff",
                            boxShadow: `0 0 6px ${tag.color ?? "#00f0ff"}`,
                          }}
                        />
                        <span>{tag.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/30">{tag.count}</span>
                        <button
                          onClick={() => handleDeleteTag(tag.id, tag.name)}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`删除标签 ${tag.name}`}
                        >
                          <Trash2
                            size={14}
                            className="text-white/40 hover:text-red-400"
                          />
                        </button>
                      </div>
                    </div>
                  ))}

                  {tagsError ? (
                    <div className="px-3 py-8 text-center text-sm text-red-400/60">
                      加载失败 / Failed to load
                    </div>
                  ) : tags.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-white/30">
                      还没有标签
                      <br />
                      在创建或编辑胶囊时添加
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="collections"
              className="mt-0 flex-1 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-3">
                <Button
                  onClick={handleNewCollection}
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Plus size={14} className="mr-1.5" />
                  新建胶囊集
                </Button>
              </div>
              <ScrollArea className="h-full px-4">
                <div className="space-y-1 pb-6">
                  {collections.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        selectedCollectionId === c.id
                          ? "bg-[#00f0ff]/15 text-[#00f0ff]"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <button
                        onClick={() => handleCollectionClick(c.id)}
                        className="flex flex-1 items-center gap-3"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: c.coverColor ?? "#00f0ff",
                            boxShadow: `0 0 6px ${c.coverColor ?? "#00f0ff"}`,
                          }}
                        />
                        <span className="truncate">{c.name}</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/30">{c.count}</span>
                        <button
                          onClick={() => handleManageCollection(c.id)}
                          className="rounded p-1 transition-colors hover:bg-[#00f0ff]/10"
                          aria-label={`管理胶囊集 ${c.name}`}
                          title="管理 / Manage"
                        >
                          <LayoutGrid
                            size={14}
                            className="text-white/40 hover:text-[#00f0ff]"
                          />
                        </button>
                        <button
                          onClick={() => handleEditCollection(c)}
                          className="rounded p-1 transition-colors hover:bg-white/5"
                          aria-label={`编辑胶囊集 ${c.name}`}
                          title="编辑 / Edit"
                        >
                          <Pencil
                            size={13}
                            className="text-white/40 hover:text-[#00f0ff]"
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteCollection(c)}
                          className="rounded p-1 transition-colors hover:bg-red-500/10"
                          aria-label={`删除胶囊集 ${c.name}`}
                          title="删除 / Delete"
                        >
                          <Trash2
                            size={14}
                            className="text-white/40 hover:text-red-400"
                          />
                        </button>
                      </div>
                    </div>
                  ))}

                  {collectionsError ? (
                    <div className="px-3 py-8 text-center text-sm text-red-400/60">
                      加载失败 / Failed to load
                    </div>
                  ) : collections.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-white/30">
                      还没有胶囊集
                      <br />
                      点击上方新建
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <CollectionDialog
        key={editingCollection?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        collection={editingCollection}
      />
    </>
  );
}
