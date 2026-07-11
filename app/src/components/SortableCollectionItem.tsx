import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CollectionItem } from "@/types";

interface Props {
  capsule: CollectionItem;
  onRemove: (capsuleId: number) => void;
}

export default function SortableCollectionItem({
  capsule,
  onRemove,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: capsule.capsuleId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glitch-card glass-panel group flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
        isDragging
          ? "border-[#00f0ff]/40 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
          : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-white/30 transition-colors hover:text-[#00f0ff] active:cursor-grabbing"
        aria-label="拖拽排序"
      >
        <GripVertical size={16} />
      </button>

      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          backgroundColor: capsule.color,
          boxShadow: `0 0 8px ${capsule.color}, 0 0 16px ${capsule.color}40`,
        }}
      />

      <div className="min-w-0 flex-1">
        <h3
          className="truncate text-sm font-medium text-white"
          style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
        >
          {capsule.title}
        </h3>
        <a
          href={capsule.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/30 transition-colors hover:text-[#00f0ff]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <ExternalLink size={10} />
          <span className="truncate">{capsule.url}</span>
        </a>
        {capsule.tags && capsule.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {capsule.tags.map((t) => (
              <Badge
                key={t.id}
                variant="secondary"
                className="bg-white/5 px-1.5 py-0 text-[10px] font-normal text-white/40"
              >
                {t.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(capsule.capsuleId)}
        className="shrink-0 rounded-md p-1.5 text-white/20 transition-all hover:bg-red-500/20 hover:text-red-400"
        title="从胶囊集移除"
      >
        <X size={14} />
      </button>
    </div>
  );
}
