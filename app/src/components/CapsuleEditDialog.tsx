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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import TagInput from "./TagInput";
import type { Capsule } from "@/types";

const HOLO_COLORS = [
  "#00f0ff",
  "#5200ff",
  "#ff1b8d",
  "#00ff88",
  "#ffaa00",
  "#cc00ff",
];

interface CapsuleEditDialogProps {
  capsule: Capsule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CapsuleEditDialog({
  capsule,
  open,
  onOpenChange,
}: CapsuleEditDialogProps) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(capsule.title);
  const [url, setUrl] = useState(capsule.url);
  const [description, setDescription] = useState(capsule.description ?? "");
  const [color, setColor] = useState(capsule.color);
  const [visibility, setVisibility] = useState<Capsule["visibility"]>(capsule.visibility);
  const [tagIds, setTagIds] = useState<number[]>(capsule.tags?.map((t) => t.id) ?? []);

  const updateMutation = trpc.capsule.update.useMutation({
    onSuccess: () => {
      utils.capsule.list.invalidate();
      utils.capsule.export.invalidate();
      utils.tag.list.invalidate();
      onOpenChange(false);
      toast.success("已更新 / Capsule updated");
    },
    onError: (error) => {
      toast.error("更新失败 / Update failed", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: capsule.id,
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || null,
      color,
      visibility,
      tagIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle
            className="text-white"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            编辑胶囊 / Edit Capsule
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">标题 / Title</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/15 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">链接 / URL</Label>
            <Input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-white/5 border-white/15 text-white"
              style={{ fontFamily: "'Space Mono', monospace" }}
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
            <Label className="text-white/70">颜色 / Color</Label>
            <div className="flex gap-2">
              {HOLO_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]"
                      : "opacity-50 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">可见性 / Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as Capsule["visibility"])}
            >
              <SelectTrigger className="bg-white/5 border-white/15 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#0a0a0a]/95 text-white">
                <SelectItem value="private">私有 - 仅自己可见</SelectItem>
                <SelectItem value="unlisted">隐藏 - 仅链接可见</SelectItem>
                <SelectItem value="public">公开 - 进入发现页</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">标签 / Tags</Label>
            <TagInput value={tagIds} onChange={setTagIds} />
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
              disabled={updateMutation.isPending}
              className="bg-[#00f0ff] text-[#050505] font-bold hover:bg-[#00f0ff]/80"
            >
              {updateMutation.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
