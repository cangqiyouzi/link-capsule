import { useState, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { XCircle } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import NeuralMatrixGrid from '@/components/NeuralMatrixGrid';
import HolographicParticles from '@/components/HolographicParticles';
import PsychedelicHelix from '@/components/PsychedelicHelix';
import Navbar from '@/components/Navbar';
import InputConsole from '@/components/InputConsole';
import CapsuleList from '@/components/CapsuleList';
import DataControls from '@/components/DataControls';
import BatchHealthCheck from '@/components/BatchHealthCheck';
import HealthFilter, { type HealthFilterValue } from '@/components/HealthFilter';
import GlyphStream from '@/components/GlyphStream';
import Sidebar from '@/components/Sidebar';

const GeodesicSphere = lazy(() => import('@/components/GeodesicSphere'));

const HOLO_COLORS = [
  '#00f0ff',
  '#5200ff',
  '#ff1b8d',
  '#00ff88',
  '#ffaa00',
  '#cc00ff',
];

export default function Home() {
  const utils = trpc.useUtils();
  const [newestId, setNewestId] = useState<number | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthFilterValue>('all');

  // Query capsules from database
  const { data: capsules, isLoading, error } = trpc.capsule.list.useQuery({
    tagId: selectedTagId ?? undefined,
    collectionId: selectedCollectionId ?? undefined,
    pinnedOnly: pinnedOnly || undefined,
    healthStatus: healthStatus === 'all' ? undefined : healthStatus,
  });

  const deadCount = capsules?.filter((c) => c.health?.status === 'dead').length ?? 0;

  // Create mutation
  const createMutation = trpc.capsule.create.useMutation({
    onSuccess: () => {
      utils.capsule.list.invalidate();
      utils.capsule.export.invalidate();
      utils.tag.list.invalidate();
      utils.collection.list.invalidate();
      setInputKey((k) => k + 1);
    },
    onError: (error) => {
      toast.error('注入失败 / Injection failed', { description: error.message });
    },
  });

  // Delete mutation
  const deleteMutation = trpc.capsule.delete.useMutation({
    onSuccess: () => {
      utils.capsule.list.invalidate();
      utils.capsule.export.invalidate();
      utils.tag.list.invalidate();
      utils.collection.list.invalidate();
    },
    onError: (error) => {
      toast.error('删除失败 / Delete failed', { description: error.message });
    },
  });

  // Pin mutation
  const pinMutation = trpc.capsule.pin.useMutation({
    onSuccess: () => {
      utils.capsule.list.invalidate();
      utils.capsule.export.invalidate();
    },
    onError: (error) => {
      toast.error('置顶失败 / Pin failed', { description: error.message });
    },
  });

  const handleAdd = (title: string, url: string, tagIds: number[]) => {
    const color = HOLO_COLORS[Math.floor(Math.random() * HOLO_COLORS.length)];
    createMutation.mutate(
      { title, url, color, tagIds: tagIds.length > 0 ? tagIds : undefined },
      {
        onSuccess: (data) => {
          setNewestId(data.id);
          setTimeout(() => setNewestId(null), 1000);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handlePin = (id: number, pinned: boolean) => {
    pinMutation.mutate({ id, pinned });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
      {/* Layer 0: Background effects */}
      <NeuralMatrixGrid />
      <HolographicParticles />
      <PsychedelicHelix />

      {/* Layer 1: Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
        <Navbar />

        {/* Sphere */}
        <div className="mb-4 w-full max-w-[400px]">
          <Suspense
            fallback={
              <div className="flex h-[220px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
              </div>
            }
          >
            <GeodesicSphere />
          </Suspense>
        </div>

        {/* Terminal Status Bar */}
        <div className="mb-8 text-center">
          <p
            className="text-xs tracking-[0.1em] text-[#00f0ff]/60"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <GlyphStream originalText="[SYSTEM] Neural Link Active | Nodes: " />
            <span
              className="text-[#00f0ff]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {capsules?.length ?? 0}
            </span>
            <GlyphStream originalText=" | Awaiting Input..." />
          </p>
        </div>

        {/* Input Console */}
        <div className="mb-4 flex w-full justify-center px-4">
          <div className="w-full max-w-[640px]">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sidebar
                  selectedTagId={selectedTagId}
                  selectedCollectionId={selectedCollectionId}
                  pinnedOnly={pinnedOnly}
                  onTagSelect={setSelectedTagId}
                  onCollectionSelect={setSelectedCollectionId}
                  onPinnedToggle={setPinnedOnly}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setHealthStatus((prev) => (prev === 'dead' ? 'all' : 'dead'))}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                    healthStatus === 'dead'
                      ? 'border-red-500/40 bg-red-500/15 text-red-400'
                      : 'border-red-500/20 bg-red-500/5 text-red-400/70 hover:border-red-500/40 hover:bg-red-500/10'
                  }`}
                  style={{ fontFamily: "'Space Mono', monospace" }}
                  title="快速筛选失效链接"
                >
                  <XCircle size={14} />
                  <span>失效 {deadCount}</span>
                </button>
                <div className="flex-1 sm:flex-initial">
                  <HealthFilter value={healthStatus} onChange={setHealthStatus} />
                </div>
              </div>
            </div>
            <InputConsole key={inputKey} onAdd={handleAdd} isSubmitting={createMutation.isPending} />
          </div>
        </div>

        {/* Data Controls (Export / Import) */}
        <div className="mb-4 flex w-full justify-center px-4">
          <DataControls capsuleCount={capsules?.length ?? 0} />
        </div>

        {/* Health Check (Batch + Force) */}
        <div className="mb-8 flex w-full justify-center px-4">
          <BatchHealthCheck capsules={capsules ?? []} />
        </div>

        {/* Capsule List */}
        <div className="flex w-full justify-center px-4">
          {isLoading ? (
            <div className="glass-panel w-full max-w-[640px] rounded-xl px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
              <p
                className="text-sm text-white/30"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Syncing with database...
              </p>
            </div>
          ) : error ? (
            <div className="glass-panel w-full max-w-[640px] rounded-xl px-6 py-12 text-center">
              <XCircle className="mx-auto mb-4 size-8 text-red-400/60" />
              <p
                className="text-sm text-red-400/70"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                加载失败 / Failed to load
              </p>
              <p className="mt-1 text-xs text-white/30">{error.message}</p>
            </div>
          ) : (
            <CapsuleList
              capsules={capsules ?? []}
              onDelete={handleDelete}
              onPin={handlePin}
              newestId={newestId}
              isDeleting={deleteMutation.isPending}
              isPinning={pinMutation.isPending}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p
            className="text-xs text-white/15"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            LINK CAPSULE v2.0 &copy; {new Date().getFullYear()}
          </p>
          <p
            className="mt-1 text-[10px] text-white/10"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            Powered by tRPC + Drizzle ORM + MySQL
          </p>
        </footer>
      </div>
    </div>
  );
}
