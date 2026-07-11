import { useState, useRef, useEffect, useId } from "react";
import { X, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  value: number[];
  onChange: (ids: number[]) => void;
  className?: string;
}

export default function TagInput({ value, onChange, className }: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: tags = [] } = trpc.tag.list.useQuery();

  // 用 ref 保存最新 value，避免 onSuccess 闭包捕获过期的 value 快照
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const createMutation = trpc.tag.create.useMutation({
    onSuccess: (data) => {
      utils.tag.list.invalidate();
      onChange([...valueRef.current, data.id]);
    },
    onError: (error) => {
      toast.error("创建标签失败 / Tag creation failed", {
        description: error.message,
      });
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedTags = tags.filter((t) => value.includes(t.id));
  const suggestions = tags
    .filter(
      (t) =>
        !value.includes(t.id) &&
        t.name.toLowerCase().includes(input.toLowerCase().trim())
    )
    .slice(0, 6);

  const addTag = (tagId: number) => {
    if (!value.includes(tagId)) {
      onChange([...value, tagId]);
    }
    setInput("");
  };

  const removeTag = (tagId: number) => {
    onChange(value.filter((id) => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      const exactMatch = tags.find(
        (t) => t.name.toLowerCase() === input.toLowerCase().trim()
      );
      if (exactMatch) {
        addTag(exactMatch.id);
      } else if (!createMutation.isPending) {
        createMutation.mutate({ name: input.trim() });
        setInput("");
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const inputId = useId();

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div
        onClick={() => {
          const el = document.getElementById(inputId);
          el?.focus();
        }}
        className="flex min-h-[42px] cursor-text flex-wrap gap-1.5 rounded-lg border border-white/15 bg-white/5 p-2"
      >
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="cursor-pointer gap-1 bg-white/10 text-white/80 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag.id);
            }}
          >
            {tag.name}
            <X size={12} />
          </Badge>
        ))}
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "添加标签 / Add tag..." : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>

      {showSuggestions && (suggestions.length > 0 || input.trim()) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/15 bg-[#0a0a0a]/95 shadow-xl backdrop-blur">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                addTag(tag.id);
                setShowSuggestions(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Tag size={12} className="text-white/40" />
                {tag.name}
              </span>
              <span className="text-xs text-white/30">{tag.count}</span>
            </button>
          ))}
          {input.trim() &&
            !tags.some(
              (t) => t.name.toLowerCase() === input.toLowerCase().trim()
            ) && (
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => {
                  createMutation.mutate({ name: input.trim() });
                  setInput("");
                  setShowSuggestions(false);
                }}
                className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-sm text-[#00f0ff] transition-colors hover:bg-white/10"
              >
                <Plus size={14} />
                <span>创建 "{input.trim()}"</span>
              </button>
            )}
        </div>
      )}
    </div>
  );
}
