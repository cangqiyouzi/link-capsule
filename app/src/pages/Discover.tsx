import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Compass, XCircle } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import NeuralMatrixGrid from '@/components/NeuralMatrixGrid';
import HolographicParticles from '@/components/HolographicParticles';
import Navbar from '@/components/Navbar';
import SocialCapsuleCard from '@/components/SocialCapsuleCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Discover() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.capsule.discover.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const capsules = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
      <NeuralMatrixGrid />
      <HolographicParticles />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
        <Navbar />

        {/* Header */}
        <div className="mb-6 w-full max-w-[768px] text-center">
          <h1
            className="flex items-center justify-center gap-3 text-2xl font-bold text-white md:text-3xl"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <Compass className="size-7 text-[#00f0ff]" />
            DISCOVER
          </h1>
          <p
            className="mt-2 text-xs tracking-wider text-white/40"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            发现社区公开胶囊 / Explore public capsules
          </p>
        </div>

        {/* Tabs (本期仅「最新」，热门预留) */}
        <div className="mb-6 w-full max-w-[768px]">
          <Tabs defaultValue="newest">
            <TabsList className="border border-white/10 bg-white/5">
              <TabsTrigger
                value="newest"
                className="data-[state=active]:bg-[#00f0ff]/10 data-[state=active]:text-[#00f0ff]"
              >
                最新 / Latest
              </TabsTrigger>
              <TabsTrigger
                value="hot"
                disabled
                className="text-white/20"
                title="敬请期待"
              >
                热门 / Hot (敬请期待)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Capsule list */}
        <div className="flex w-full max-w-[768px] flex-col gap-3">
          {isLoading ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
              <p
                className="text-sm text-white/30"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Loading...
              </p>
            </div>
          ) : error ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <XCircle className="mx-auto mb-4 size-8 text-red-400/60" />
              <p
                className="text-sm text-red-400/70"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                加载失败 / Failed to load
              </p>
              <p className="mt-1 text-xs text-white/30">{error.message}</p>
            </div>
          ) : capsules.length === 0 ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <p
                className="text-sm text-white/40"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                还没有公开胶囊
              </p>
              <p className="mt-1 text-xs text-white/30">
                去分享你的第一个吧 → 编辑胶囊 → 公开
              </p>
              <Link to="/">
                <Button
                  variant="outline"
                  className="mt-4 border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10"
                >
                  返回主页
                </Button>
              </Link>
            </div>
          ) : (
            capsules.map((c) => <SocialCapsuleCard key={c.id} capsule={c} />)
          )}

          {/* Infinite scroll sentinel */}
          {hasNextPage && (
            <div ref={sentinelRef} className="py-6 text-center">
              {isFetchingNextPage ? (
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
              ) : (
                <p
                  className="text-xs text-white/30"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  滚动加载更多 / Scroll for more
                </p>
              )}
            </div>
          )}

          {!hasNextPage && capsules.length > 0 && (
            <p
              className="py-6 text-center text-xs text-white/20"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              已到底部 / No more capsules
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
