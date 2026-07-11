import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Rss, XCircle } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import NeuralMatrixGrid from '@/components/NeuralMatrixGrid';
import HolographicParticles from '@/components/HolographicParticles';
import Navbar from '@/components/Navbar';
import SocialCapsuleCard from '@/components/SocialCapsuleCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Feed() {
  const utils = trpc.useUtils();

  const { data: following, error: followingError } = trpc.user.following.useQuery();

  const {
    data,
    isLoading,
    error: feedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.user.feed.useInfiniteQuery(
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

  // 暴露 invalidate 给全局，便于关注/取关后刷新（在 UserProfile 页操作后回到此页会重新拉取）
  void utils;

  const capsules = data?.pages.flatMap((p) => p.items) ?? [];
  const followingList = following ?? [];
  const hasNoFollowing = !followingError && followingList.length === 0;

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
            <Rss className="size-7 text-[#ff1b8d]" />
            FEED
          </h1>
          <p
            className="mt-2 text-xs tracking-wider text-white/40"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            关注的人的最新胶囊 / Latest from who you follow
          </p>
        </div>

        {/* Following avatars strip */}
        {!hasNoFollowing && (
          <div className="mb-6 w-full max-w-[768px]">
            <div className="glass-panel flex gap-3 overflow-x-auto rounded-xl p-4">
              {followingList.map((u) => (
                <Link
                  key={u.id}
                  to={`/u/${u.id}`}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                  title={u.name}
                >
                  <Avatar className="size-12 border border-[#00f0ff]/30">
                    {u.image ? (
                      <AvatarImage src={u.image} alt={u.name} />
                    ) : null}
                    <AvatarFallback className="bg-[#00f0ff]/10 text-xs font-bold text-[#00f0ff]">
                      {getInitials(u.name || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="max-w-[60px] truncate text-[10px] text-white/60"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {u.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Capsule list */}
        <div className="flex w-full max-w-[768px] flex-col gap-3">
          {isLoading ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
              <p
                className="text-sm text-white/30"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Loading feed...
              </p>
            </div>
          ) : feedError ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <XCircle className="mx-auto mb-4 size-8 text-red-400/60" />
              <p
                className="text-sm text-red-400/70"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                加载失败 / Failed to load
              </p>
              <p className="mt-1 text-xs text-white/30">{feedError.message}</p>
            </div>
          ) : hasNoFollowing ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <p
                className="text-sm text-white/40"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                你还没有关注任何人
              </p>
              <p className="mt-1 text-xs text-white/30">
                去发现页找找感兴趣的内容吧
              </p>
              <Link to="/discover">
                <Button
                  variant="outline"
                  className="mt-4 border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10"
                >
                  前往发现页
                </Button>
              </Link>
            </div>
          ) : capsules.length === 0 ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <p
                className="text-sm text-white/40"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                你关注的人还没有公开胶囊
              </p>
            </div>
          ) : (
            capsules.map((c) => <SocialCapsuleCard key={c.id} capsule={c} />)
          )}

          {/* Infinite scroll sentinel */}
          {hasNextPage && capsules.length > 0 && (
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
