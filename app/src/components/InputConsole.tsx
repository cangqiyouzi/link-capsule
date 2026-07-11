import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import TagInput from './TagInput';

interface InputConsoleProps {
  onAdd: (title: string, url: string, tagIds: number[]) => void;
  isSubmitting: boolean;
}

export default function InputConsole({ onAdd, isSubmitting }: InputConsoleProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !url.trim()) return;
      onAdd(title.trim(), url.trim(), tagIds);
    },
    [title, url, tagIds, onAdd]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel w-full max-w-[640px] rounded-xl p-6 md:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]" />
        <span
          className="text-xs tracking-[0.15em] text-white/50 uppercase"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Input Console
        </span>
      </div>

      <div className="space-y-5">
        <div>
          <label
            className="mb-2 block text-xs tracking-wider text-white/40 uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            记忆锚点 / Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入记忆锚点..."
            className="cyber-input w-full pb-3 text-sm text-white placeholder-white/20 md:text-base"
            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          />
        </div>

        <div>
          <label
            className="mb-2 block text-xs tracking-wider text-white/40 uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            链接 / Link
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="cyber-input w-full pb-3 text-sm text-white placeholder-white/20 md:text-base"
            style={{ fontFamily: "'Space Mono', monospace" }}
          />
        </div>

        <div>
          <label
            className="mb-2 block text-xs tracking-wider text-white/40 uppercase"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            标签 / Tags
          </label>
          <TagInput value={tagIds} onChange={setTagIds} />
        </div>

        <button
          type="submit"
          disabled={!title.trim() || !url.trim() || isSubmitting}
          className="neon-btn mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-bold text-black transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            <Plus size={16} strokeWidth={3} />
          )}
          <span>{isSubmitting ? 'INJECTING...' : 'INJECT'}</span>
        </button>
      </div>
    </form>
  );
}
