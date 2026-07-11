import { useParams, Link, useNavigate } from 'react-router';
import { ExternalLink, Link2Off } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useSession } from '@/providers/auth';
import NeuralMatrixGrid from '@/components/NeuralMatrixGrid';
import HolographicParticles from '@/components/HolographicParticles';
import Navbar from '@/components/Navbar';
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

export default function SharedCapsule() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();

  const { data: capsule, isLoading, error } = trpc.capsule.getSharedByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const isLoggedIn = !!session?.user;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
      <NeuralMatrixGrid />
      <HolographicParticles />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-12 pt-20">
        <Navbar />

        <div className="flex w-full max-w-[640px] flex-col gap-4">
          {isLoading ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
              <p
                className="text-sm text-white/30"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Loading shared capsule...
              </p>
            </div>
          ) : error || !capsule ? (
            <div className="glass-panel rounded-xl px-6 py-12 text-center">
              <Link2Off className="mx-auto mb-4 size-10 text-red-400/60" />
              <p
                className="text-sm text-white/60"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                分享链接已失效 / Share link invalid or expired
              </p>
              <p className="mt-1 text-xs text-white/30">
                胶囊可能已被改为私有或删除
              </p>
              <Link to="/discover">
                <Button
                  variant="outline"
                  className="mt-4 border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10"
                >
                  去发现页
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Tag bar */}
              <div className="flex items-center justify-between">
                <span
                  className="rounded border border-[#00ff88]/30 bg-[#00ff88]/10 px-2 py-0.5 text-[10px] tracking-wider text-[#00ff88]"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  SHARED CAPSULE
                </span>
                <Link
                  to={`/u/${capsule.userId}`}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-0.5 pl-0.5 pr-3 transition-colors hover:border-[#00f0ff]/40 hover:bg-white/10"
                >
                  <Avatar className="size-6 border border-[#00f0ff]/30">
                    {capsule.userImage ? (
                      <AvatarImage src={capsule.userImage} alt={capsule.userName} />
                    ) : null}
                    <AvatarFallback className="bg-[#00f0ff]/10 text-[9px] font-bold text-[#00f0ff]">
                      {getInitials(capsule.userName || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="max-w-[140px] truncate text-xs text-white/80"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {capsule.userName}
                  </span>
                </Link>
              </div>

              {/* Big capsule card */}
              <div className="glass-panel rounded-xl p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: capsule.color,
                      boxShadow: `0 0 10px ${capsule.color}, 0 0 20px ${capsule.color}60`,
                    }}
                  />
                  <h1
                    className="flex-1 text-xl font-bold text-white md:text-2xl"
                    style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                  >
                    {capsule.title}
                  </h1>
                </div>

                <a
                  href={capsule.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#00f0ff] transition-colors hover:bg-white/10"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  <ExternalLink size={14} className="shrink-0" />
                  <span className="break-all">{capsule.url}</span>
                </a>

                {capsule.description && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                    {capsule.description}
                  </p>
                )}
              </div>

              {/* Bottom CTA */}
              <div className="flex justify-center pt-2">
                {isLoggedIn ? (
                  <Link to="/">
                    <Button
                      variant="outline"
                      className="border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10"
                    >
                      在我的胶囊中打开
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => navigate('/login')}
                    className="bg-[#00f0ff] text-[#050505] font-bold hover:bg-[#00f0ff]/80"
                  >
                    登录后收藏类似胶囊
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
