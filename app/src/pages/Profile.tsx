import { useState, useDeferredValue } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Search, XCircle } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useSession, signOut } from '@/providers/auth';
import NeuralMatrixGrid from '@/components/NeuralMatrixGrid';
import HolographicParticles from '@/components/HolographicParticles';
import Navbar from '@/components/Navbar';
import CapsuleList from '@/components/CapsuleList';
import Sidebar from '@/components/Sidebar';
import BatchHealthCheck from '@/components/BatchHealthCheck';
import HealthFilter, { type HealthFilterValue } from '@/components/HealthFilter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

type SortKey = 'newest' | 'oldest' | 'title';

export default function Profile() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: session } = useSession();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthFilterValue>('all');
  const deferredSearch = useDeferredValue(search);

  const { data: capsules, isLoading, error } = trpc.capsule.list.useQuery({
    search: deferredSearch.trim() || undefined,
    sort,
    pinnedOnly: pinnedOnly || undefined,
    tagId: selectedTagId ?? undefined,
    collectionId: selectedCollectionId ?? undefined,
    healthStatus: healthStatus === 'all' ? undefined : healthStatus,
  });

  const deadCount = capsules?.filter((c) => c.health?.status === 'dead').length ?? 0;

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

  const pinMutation = trpc.capsule.pin.useMutation({
    onSuccess: () => {
      utils.capsule.list.invalidate();
      utils.capsule.export.invalidate();
    },
    onError: (error) => {
      toast.error('置顶失败 / Pin failed', { description: error.message });
    },
  });

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const handleDelete = (id: number) => deleteMutation.mutate({ id });
  const handlePin = (id: number, pinned: boolean) =>
    pinMutation.mutate({ id, pinned });

  const handleLogout = async () => {
    await signOut();
    toast.success('已断开 / Session closed');
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
      <NeuralMatrixGrid />
      <HolographicParticles />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
        <Navbar />

        {/* Profile header */}
        <div className="glass-panel w-full max-w-[640px] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-[#00f0ff]/30">
              {user?.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-[#00f0ff]/10 text-xl font-bold text-[#00f0ff]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1
                className="truncate text-lg font-bold text-white"
                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
              >
                {user?.name ?? '...'}
              </h1>
              <p
                className="truncate text-xs text-white/40"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              SIGN OUT
            </button>
          </div>

          <div className="mt-5 flex items-center gap-6">
            <div>
              <div
                className="text-2xl font-bold text-[#00f0ff]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {capsules?.length ?? 0}
              </div>
              <div
                className="text-[10px] tracking-wider text-white/30 uppercase"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Capsules
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-bold text-[#ffaa00]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {capsules?.filter((c) => c.pinned).length ?? 0}
              </div>
              <div
                className="text-[10px] tracking-wider text-white/30 uppercase"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Pinned
              </div>
            </div>
          </div>
        </div>

        {/* Search + Sort + Filter controls */}
        <div className="mb-4 flex w-full max-w-[640px] flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题 / URL / 描述..."
              aria-label="Search capsules"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-[#00f0ff]/40"
              style={{ fontFamily: "'Space Mono', monospace" }}
            />
          </div>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-white/70 sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0a0a0a]/95 text-white">
              <SelectItem value="newest">最新</SelectItem>
              <SelectItem value="oldest">最早</SelectItem>
              <SelectItem value="title">标题</SelectItem>
            </SelectContent>
          </Select>

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

          <HealthFilter value={healthStatus} onChange={setHealthStatus} />

          <Sidebar
            selectedTagId={selectedTagId}
            selectedCollectionId={selectedCollectionId}
            pinnedOnly={pinnedOnly}
            onTagSelect={setSelectedTagId}
            onCollectionSelect={setSelectedCollectionId}
            onPinnedToggle={setPinnedOnly}
          />
        </div>

        {/* Batch Health Check */}
        <div className="mb-4 flex w-full justify-center px-4">
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
                Loading capsules...
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
              newestId={null}
              isDeleting={deleteMutation.isPending}
              isPinning={pinMutation.isPending}
              searchable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
