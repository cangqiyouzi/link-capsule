import { useParams, useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { useSession } from '@/providers/auth';
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

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function UserProfile() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  const { data: profile, isLoading, error } = trpc.user.profile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const followMutation = trpc.user.follow.useMutation({
    onSuccess: () => {
      utils.user.profile.invalidate({ userId });
      toast.success('已关注 / Followed');
    },
    onError: (e) => toast.error('关注失败 / Follow failed', { description: e.message }),
  });

  const unfollowMutation = trpc.user.unfollow.useMutation({
    onSuccess: () => {
      utils.user.profile.invalidate({ userId });
      toast.success('已取关 / Unfollowed');
    },
    onError: (e) => toast.error('取关失败 / Unfollow failed', { description: e.message }),
  });

  const isSelf = session?.user?.id === userId;
  const isLoggedIn = !!session?.user;

  const handleFollowToggle = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (profile?.isFollowing) {
      unfollowMutation.mutate({ userId });
    } else {
      followMutation.mutate({ userId });
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
        <NeuralMatrixGrid />
        <HolographicParticles />
        <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
          <Navbar />
          <div className="glass-panel w-full max-w-[640px] rounded-xl px-6 py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
            <p
              className="text-sm text-white/30"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Loading profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
        <NeuralMatrixGrid />
        <HolographicParticles />
        <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
          <Navbar />
          <div className="glass-panel w-full max-w-[640px] rounded-xl px-6 py-12 text-center">
            <p
              className="text-sm text-white/40"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              用户不存在 / User not found
            </p>
            <Link to="/discover">
              <Button
                variant="outline"
                className="mt-4 border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10"
              >
                返回发现页
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
      <NeuralMatrixGrid />
      <HolographicParticles />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
        <Navbar />

        {/* Profile header */}
        <div className="glass-panel w-full max-w-[768px] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-[#00f0ff]/30">
              {profile.image ? (
                <AvatarImage src={profile.image} alt={profile.name} />
              ) : null}
              <AvatarFallback className="bg-[#00f0ff]/10 text-xl font-bold text-[#00f0ff]">
                {getInitials(profile.name || '?')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1
                className="truncate text-lg font-bold text-white"
                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
              >
                {profile.name}
              </h1>
              <p
                className="mt-0.5 text-xs text-white/40"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Joined {formatDate(profile.createdAt)}
              </p>
            </div>

            {!isSelf && (
              <Button
                onClick={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                variant={profile.isFollowing ? 'outline' : 'default'}
                className={
                  profile.isFollowing
                    ? 'border-white/20 text-white/70 hover:bg-white/10'
                    : 'bg-[#00f0ff] text-[#050505] font-bold hover:bg-[#00f0ff]/80'
                }
              >
                {profile.isFollowing ? '已关注 / Following' : isLoggedIn ? '关注 / Follow' : '登录后关注'}
              </Button>
            )}
          </div>

          <div className="mt-5 flex items-center gap-6">
            <div>
              <div
                className="text-2xl font-bold text-[#00f0ff]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {profile.capsules.length}
              </div>
              <div
                className="text-[10px] tracking-wider text-white/30 uppercase"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Public Capsules
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-bold text-[#ff1b8d]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {profile.followersCount}
              </div>
              <div
                className="text-[10px] tracking-wider text-white/30 uppercase"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Followers
              </div>
            </div>
          </div>
        </div>

        {/* Capsule list */}
        <div className="flex w-full max-w-[768px] flex-col gap-3">
          {profile.capsules.length === 0 ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <p
                className="text-sm text-white/40"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {isSelf ? '你还没有公开胶囊' : 'TA还没有公开胶囊'}
              </p>
            </div>
          ) : (
            profile.capsules.map((c) => <SocialCapsuleCard key={c.id} capsule={c} />)
          )}
        </div>
      </div>
    </div>
  );
}
