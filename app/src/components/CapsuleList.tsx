import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import CapsuleCard from './CapsuleCard';
import type { Capsule } from '@/types';

interface CapsuleListProps {
  capsules: Capsule[];
  onDelete: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  newestId: number | null;
  isDeleting: boolean;
  isPinning: boolean;
  searchable?: boolean;
}

export default function CapsuleList({ capsules, onDelete, onPin, newestId, isDeleting, isPinning, searchable = true }: CapsuleListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let result = capsules;
    if (searchable && query.trim()) {
      const q = query.toLowerCase().trim();
      result = capsules.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.url.toLowerCase().includes(q)
      );
    }
    // searchable=false 时由服务端负责排序，不在此处覆盖
    if (!searchable) return result;
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [capsules, query, searchable]);

  if (capsules.length === 0) {
    return (
      <div className="glass-panel w-full max-w-[640px] rounded-xl px-6 py-12 text-center">
        <div className="mb-4 text-4xl opacity-20">
          <span style={{ fontFamily: "'Space Mono', monospace" }}>{'</>'}</span>
        </div>
        <p
          className="text-sm text-white/30"
          style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
        >
          暂无收藏文章，开始注入你的第一条链接...
        </p>
        <p
          className="mt-2 text-xs text-white/15"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          No capsules found. Inject your first link above.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[640px] space-y-3">
      {/* Header row with search */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs tracking-[0.15em] text-white/40 uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Stored Capsules
          </span>
          <div className="flex items-center gap-2">
            {isDeleting && (
              <div className="h-3 w-3 animate-spin rounded-full border border-[#ff1b8d] border-t-transparent" />
            )}
            {isPinning && (
              <div className="h-3 w-3 animate-spin rounded-full border border-[#ffaa00] border-t-transparent" />
            )}
            <span
              className="text-xs text-white/25"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {filtered.length}/{capsules.length}
            </span>
          </div>
        </div>

        {/* Search input */}
        {searchable && (
        <div className="relative w-full sm:max-w-[280px]">
          <Search
            size={12}
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-white/20"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or URL..."
            aria-label="Search capsules"
            className="w-full bg-transparent py-1.5 pl-5 text-xs text-white placeholder-white/15 outline-none transition-all"
            style={{
              fontFamily: "'Space Mono', monospace",
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottom =
                '1px solid rgba(0, 240, 255, 0.4)';
              e.currentTarget.style.boxShadow =
                '0 2px 10px rgba(0, 240, 255, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottom =
                '1px solid rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-white/20 transition-colors hover:text-[#00f0ff]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              CLEAR
            </button>
          )}
        </div>
        )}
      </div>

      {/* Capsule cards */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-xl px-6 py-8 text-center">
          <p
            className="text-xs text-white/20"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            No capsules match &quot;{query}&quot;
          </p>
        </div>
      ) : (
        filtered.map((capsule) => (
          <CapsuleCard
            key={capsule.id}
            capsule={capsule}
            onDelete={onDelete}
            onPin={onPin}
            isNew={capsule.id === newestId}
          />
        ))
      )}
    </div>
  );
}
