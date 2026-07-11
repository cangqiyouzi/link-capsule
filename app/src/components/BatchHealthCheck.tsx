import { Activity, Loader2, Ban } from 'lucide-react';
import { useHealthCheck } from '@/hooks/use-health-check';
import type { Capsule } from '@/types';

interface BatchHealthCheckProps {
  capsules: Capsule[];
}

const CACHE_MS = 60 * 60 * 1000;

function isCached(c: Capsule): boolean {
  if (!c.health?.lastCheckedAt) return false;
  const ts = new Date(c.health.lastCheckedAt).getTime();
  return Date.now() - ts < CACHE_MS;
}

export default function BatchHealthCheck({ capsules }: BatchHealthCheckProps) {
  const { running, completed, total, deadCount, force, setForce, startBatch, abort } =
    useHealthCheck();

  const cachedCount = capsules.filter(isCached).length;
  const toCheckCount = force ? capsules.length : capsules.length - cachedCount;

  const handleStart = () => startBatch(capsules);

  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="glass-panel w-full max-w-[640px] rounded-xl p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" />
        <span
          className="text-xs tracking-[0.15em] text-white/50 uppercase"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Link Health Check
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={handleStart}
          disabled={running || capsules.length === 0}
          className="group relative flex items-center justify-center gap-2 rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/5 px-4 py-3 text-sm text-[#00ff88] transition-all hover:border-[#00ff88]/40 hover:bg-[#00ff88]/10 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {running ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Activity size={14} className="transition-transform group-hover:scale-110" />
          )}
          <span>{running ? '检测中… CHECKING' : '批量检测 BATCH CHECK'}</span>
        </button>

        <label
          className={`flex items-center gap-1.5 text-xs text-white/40 ${
            running ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            disabled={running}
            className="accent-[#00f0ff]"
          />
          <span>强制重检（忽略 1h 缓存）</span>
        </label>
      </div>

      {/* Progress */}
      {running && (
        <div className="mt-4">
          <div
            className="mb-2 flex items-center justify-between text-xs"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <span className="text-[#00f0ff]">
              已检测 {completed}/{total}
            </span>
            <span className="text-red-400">失效 {deadCount}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#00f0ff] to-[#00ff88] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={abort}
            className="mt-3 flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/10"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <Ban size={12} />
            <span>中断 ABORT</span>
          </button>
        </div>
      )}

      {/* Hint */}
      <p
        className="mt-3 text-xs leading-relaxed text-white/35"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        共 {capsules.length} 条胶囊 · 1h 缓存内 {cachedCount} 条 · 本次将检测 {toCheckCount} 条 · 并发 {6}
      </p>
    </div>
  );
}
