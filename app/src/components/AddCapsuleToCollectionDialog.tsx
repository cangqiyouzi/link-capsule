import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  collectionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIds: number[];
}

export default function AddCapsuleToCollectionDialog({
  collectionId,
  open,
  onOpenChange,
  existingIds,
}: Props) {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const { data: capsules = [] } = trpc.capsule.list.useQuery(undefined, {
    enabled: open,
  });

  const addItemMutation = trpc.collection.addItem.useMutation({
    onSuccess: () => {
      utils.collection.items.invalidate({ id: collectionId });
      utils.collection.list.invalidate();
      toast.success("已添加 / Added");
    },
    onError: (error) =>
      toast.error("添加失败 / Add failed", { description: error.message }),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return capsules;
    const q = search.toLowerCase();
    return capsules.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.url.toLowerCase().includes(q)
    );
  }, [capsules, search]);

  const handleAdd = (capsuleId: number) => {
    addItemMutation.mutate({ collectionId, capsuleId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle
            className="text-white"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            添加胶囊 / Add Capsule
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索胶囊..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-[#00f0ff]/40"
            style={{ fontFamily: "'Space Mono', monospace" }}
          />
        </div>

        <div className="h-[55vh] overflow-hidden">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-1">
              {filtered.map((c) => {
                const inCollection = existingIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => !inCollection && handleAdd(c.id)}
                    disabled={inCollection}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      inCollection
                        ? "cursor-not-allowed bg-white/5 opacity-40"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: c.color,
                        boxShadow: `0 0 6px ${c.color}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{c.title}</div>
                      <div
                        className="truncate text-xs text-white/30"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {c.url}
                      </div>
                    </div>
                    {inCollection && (
                      <Check size={14} className="shrink-0 text-[#00ff88]" />
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-white/30">
                  {search ? "没有匹配的胶囊" : "还没有胶囊"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
