import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Collection } from "@/types";

const HOLO_COLORS = [
  "#00f0ff",
  "#5200ff",
  "#ff1b8d",
  "#00ff88",
  "#ffaa00",
  "#cc00ff",
];

interface CollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection | null;
}

export default function CollectionDialog({
  open,
  onOpenChange,
  collection,
}: CollectionDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = !!collection;
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [coverColor, setCoverColor] = useState<string | null>(collection?.coverColor ?? null);

  const createMutation = trpc.collection.create.useMutation({
    onSuccess: () => {
      utils.collection.list.invalidate();
      onOpenChange(false);
      toast.success("胶囊集已创建 / Collection created");
    },
    onError: (error) =>
      toast.error("创建失败 / Create failed", { description: error.message }),
  });

  const updateMutation = trpc.collection.update.useMutation({
    onSuccess: (_, variables) => {
      utils.collection.list.invalidate();
      utils.collection.get.invalidate({ id: variables.id });
      onOpenChange(false);
      toast.success("已更新 / Collection updated");
    },
    onError: (error) =>
      toast.error("更新失败 / Update failed", { description: error.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isEdit && collection) {
      updateMutation.mutate({
        id: collection.id,
        name: name.trim(),
        description: description.trim() || null,
        coverColor,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        coverColor: coverColor ?? undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle
            className="text-white"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {isEdit
              ? "编辑胶囊集 / Edit Collection"
              : "新建胶囊集 / New Collection"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">名称 / Name</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/15 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">描述 / Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选描述..."
              rows={3}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">封面色 / Cover Color</Label>
            <div className="flex gap-2">
              {HOLO_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverColor(c)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    coverColor === c
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]"
                      : "opacity-50 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/50 hover:text-white"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#00f0ff] text-[#050505] font-bold hover:bg-[#00f0ff]/80"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "保存中…"
                : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
