import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { SocialCapsule } from '@/types';

interface SocialCapsuleCardProps {
  capsule: SocialCapsule;
}

function timeAgo(d: Date): string {
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function SocialCapsuleCard({ capsule }: SocialCapsuleCardProps) {
  return (
    <div className="glitch-card glass-panel group flex items-center gap-4 rounded-lg px-5 py-4 transition-all duration-300 hover:bg-white/5">
      {/* Color indicator */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full shadow-lg"
        style={{
          backgroundColor: capsule.color,
          boxShadow: `0 0 8px ${capsule.color}, 0 0 16px ${capsule.color}40`,
        }}
      />

      {/* Content (clickable link) */}
      <a
        href={capsule.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2">
          <h3
            className="truncate text-sm font-medium text-white md:text-base"
            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            {capsule.title}
          </h3>
        </div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/30 transition-colors group-hover:text-[#00f0ff]" style={{ fontFamily: "'Space Mono', monospace" }}>
          <ExternalLink size={10} />
          <span className="truncate">{capsule.url}</span>
        </div>
        {capsule.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-white/40">{capsule.description}</p>
        )}
      </a>

      {/* Author + time */}
      <div className="hidden shrink-0 items-center gap-2 md:flex">
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
            className="max-w-[100px] truncate text-xs text-white/70"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            {capsule.userName}
          </span>
        </Link>
        <span
          className="text-xs text-white/20"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {timeAgo(capsule.createdAt)}
        </span>
      </div>
    </div>
  );
}
