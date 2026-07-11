import { useRef, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import type { Capsule } from '@/types';
import { HealthCheckContext } from '@/providers/health-check-context';

const CONCURRENCY = 6;
const CACHE_MS = 60 * 60 * 1000;

function isCached(c: Capsule): boolean {
  if (!c.health?.lastCheckedAt) return false;
  const ts = new Date(c.health.lastCheckedAt).getTime();
  return Date.now() - ts < CACHE_MS;
}

export function HealthCheckProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const trpcClient = utils.client;

  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [deadCount, setDeadCount] = useState(0);
  const [force, setForce] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const startBatch = useCallback(
    async (capsules: Capsule[]) => {
      if (runningRef.current) {
        toast.info('已有批量检测正在进行 / Batch already running');
        return;
      }

      const toCheck = force ? capsules : capsules.filter((c) => !isCached(c));
      if (toCheck.length === 0) {
        toast.info('全部胶囊在 1 小时内已检测过 / All cached', {
          description: '勾选"强制重检"可重新检测',
        });
        return;
      }

      runningRef.current = true;
      setRunning(true);
      setCompleted(0);
      setTotal(toCheck.length);
      setDeadCount(0);
      const controller = new AbortController();
      abortRef.current = controller;

      let idx = 0;
      let dead = 0;
      let done = 0;
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, toCheck.length) },
        async () => {
          while (idx < toCheck.length) {
            if (controller.signal.aborted) return;
            const i = idx++;
            const capsule = toCheck[i];
            try {
              const result = await trpcClient.capsule.checkHealth.mutate({
                id: capsule.id,
                force,
              });
              if (result.status === 'dead') dead++;
            } catch (err) {
              console.error('check failed for capsule', capsule.id, err);
            }
            done++;
            setCompleted(done);
            setDeadCount(dead);
          }
        }
      );

      await Promise.all(workers);
      const aborted = controller.signal.aborted;
      abortRef.current = null;
      runningRef.current = false;
      setRunning(false);
      utils.capsule.list.invalidate();

      if (aborted) {
        toast.info(`已中断 / Aborted · 检测 ${done}/${toCheck.length} · 失效 ${dead}`);
      } else {
        toast.success('批量检测完成 / Batch complete', {
          description: `共 ${toCheck.length} 条 · 失效 ${dead} 条`,
        });
      }
    },
    [force, trpcClient, utils.capsule.list]
  );

  const value = useMemo(
    () => ({
      running,
      completed,
      total,
      deadCount,
      force,
      setForce,
      startBatch,
      abort,
    }),
    [running, completed, total, deadCount, force, startBatch, abort]
  );

  return (
    <HealthCheckContext.Provider value={value}>
      {children}
    </HealthCheckContext.Provider>
  );
}
