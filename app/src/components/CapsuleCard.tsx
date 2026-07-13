import { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ExternalLink,
  Trash2,
  Pin,
  PinOff,
  Pencil,
  Lock,
  Link2,
  Globe,
  Copy,
  ChevronDown,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import gsap from 'gsap';
import { trpc } from '@/providers/trpc';
import type { Capsule, HealthStatus } from '@/types';
import CapsuleEditDialog from './CapsuleEditDialog';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface CapsuleCardProps {
  capsule: Capsule;
  onDelete: (id: number) => void;
  onPin: (id: number, pinned: boolean) => void;
  isNew?: boolean;
}

const VISIBILITY_ICON = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
} as const;

const VISIBILITY_COLOR = {
  private: 'text-white/30',
  unlisted: 'text-[#00ff88]',
  public: 'text-[#00f0ff]',
} as const;

const VISIBILITY_LABEL = {
  private: '私有',
  unlisted: '隐藏',
  public: '公开',
} as const;

const HEALTH_BADGE: Record<
  HealthStatus,
  { icon: typeof CheckCircle2; color: string; label: string } | null
> = {
  ok: { icon: CheckCircle2, color: 'text-[#00ff88]', label: '健康' },
  dead: { icon: XCircle, color: 'text-red-400', label: '失效' },
  redirect: { icon: ArrowLeftRight, color: 'text-[#ffaa00]', label: '重定向' },
  slow: { icon: Clock, color: 'text-yellow-400', label: '响应慢' },
  rate_limited: { icon: ShieldAlert, color: 'text-orange-400', label: '被限流' },
  unknown: null,
};

export default function CapsuleCard({ capsule, onDelete, onPin, isNew }: CapsuleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const utils = trpc.useUtils();

  const setVisibilityMutation = trpc.capsule.setVisibility.useMutation({
    onSuccess: (data) => {
      utils.capsule.list.invalidate();
      if (data.visibility === 'unlisted' && data.shareToken) {
        const shareUrl = `${window.location.origin}/shared/${data.shareToken}`;
        toast.success('已生成分享链接 / Share link generated', {
          description: '点击复制按钮可复制链接',
          action: {
            label: '复制链接',
            onClick: () => {
              navigator.clipboard.writeText(shareUrl).then(() => {
                toast.success('已复制到剪贴板 / Copied');
              });
            },
          },
        });
      } else {
        toast.success(`已切换为${VISIBILITY_LABEL[data.visibility]} / Visibility updated`);
      }
    },
    onError: (error) => {
      toast.error('切换失败 / Update failed', { description: error.message });
    },
  });

  const [checking, setChecking] = useState(false);

  const checkHealthMutation = trpc.capsule.checkHealth.useMutation({
    onSuccess: (data) => {
      setChecking(false);
      utils.capsule.list.invalidate();
      if (data.status === 'dead') {
        toast.error('链接已失效 / Link dead', {
          description: data.lastError ?? `HTTP ${data.httpCode ?? '?'}`,
        });
      } else if (data.status === 'ok') {
        toast.success('链接健康 / Link OK');
      }
    },
    onError: (error) => {
      setChecking(false);
      toast.error('检测失败 / Check failed', { description: error.message });
    },
  });

  const handleCheckHealth = () => {
    if (checking) return;
    setChecking(true);
    checkHealthMutation.mutate({ id: capsule.id, force: true });
  };

  useEffect(() => {
    if (isNew && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [isNew]);

  const formatTime = (d: Date) => {
    const date = new Date(d);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleVisibilityChange = (v: Capsule['visibility']) => {
    if (v === capsule.visibility) return;
    setVisibilityMutation.mutate({ id: capsule.id, visibility: v });
  };

  const handleCopyShareLink = () => {
    if (!capsule.shareToken) return;
    const shareUrl = `${window.location.origin}/shared/${capsule.shareToken}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => toast.success('已复制到剪贴板 / Copied'))
      .catch(() => toast.error('复制失败 / Copy failed'));
  };

  const VisibilityIcon = VISIBILITY_ICON[capsule.visibility];

  const actionButtons = (
    <>
      {/* 可见性切换菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`shrink-0 rounded-md p-1.5 transition-all hover:bg-white/10 ${VISIBILITY_COLOR[capsule.visibility]}`}
            title="切换可见性"
            disabled={setVisibilityMutation.isPending}
          >
            <ChevronDown size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-white/10 bg-[#0a0a0a]/95 text-white backdrop-blur"
        >
          <DropdownMenuItem
            onClick={() => handleVisibilityChange('private')}
            className={`cursor-pointer ${capsule.visibility === 'private' ? 'text-[#00f0ff] focus:text-[#00f0ff]' : ''}`}
          >
            <Lock className="size-4" />
            私有 / Private
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleVisibilityChange('unlisted')}
            className={`cursor-pointer ${capsule.visibility === 'unlisted' ? 'text-[#00f0ff] focus:text-[#00f0ff]' : ''}`}
          >
            <Link2 className="size-4" />
            隐藏 / Unlisted
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleVisibilityChange('public')}
            className={`cursor-pointer ${capsule.visibility === 'public' ? 'text-[#00f0ff] focus:text-[#00f0ff]' : ''}`}
          >
            <Globe className="size-4" />
            公开 / Public
          </DropdownMenuItem>
          {capsule.visibility === 'unlisted' && capsule.shareToken && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleCopyShareLink} className="cursor-pointer text-[#00ff88] focus:text-[#00ff88]">
                <Copy className="size-4" />
                复制分享链接
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Pin button */}
      <button
        onClick={() => onPin(capsule.id, !capsule.pinned)}
        className={`shrink-0 rounded-md p-1.5 transition-all ${
          capsule.pinned
            ? 'text-[#ffaa00] hover:bg-[#ffaa00]/20'
            : 'text-white/20 hover:bg-[#ffaa00]/10 hover:text-[#ffaa00]'
        }`}
        title={capsule.pinned ? '取消置顶' : '置顶'}
      >
        {capsule.pinned ? <Pin size={14} /> : <PinOff size={14} />}
      </button>

      {/* Edit button */}
      <button
        onClick={() => setEditOpen(true)}
        className="shrink-0 rounded-md p-1.5 text-white/20 transition-all hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]"
        title="编辑"
      >
        <Pencil size={14} />
      </button>

      {/* Health check button */}
      <button
        onClick={handleCheckHealth}
        disabled={checking}
        className={`shrink-0 rounded-md p-1.5 transition-all ${
          checking
            ? 'text-[#00f0ff]'
            : 'text-white/20 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]'
        }`}
        title={checking ? '检测中…' : '检测链接有效性'}
      >
        {checking ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
      </button>

      {/* Delete button */}
      <button
        onClick={() => onDelete(capsule.id)}
        className="shrink-0 rounded-md p-1.5 text-white/20 transition-all hover:bg-red-500/20 hover:text-red-400"
        title="删除"
      >
        <Trash2 size={14} />
      </button>
    </>
  );

  return (
    <div
      ref={cardRef}
      className={`glitch-card glass-panel group relative flex flex-col gap-3 rounded-lg px-4 py-4 transition-all duration-300 hover:bg-white/5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 ${
        capsule.pinned
          ? 'border-[#ffaa00]/30 shadow-[0_0_15px_rgba(255,170,0,0.08)]'
          : ''
      } ${capsule.health?.status === 'dead' ? 'opacity-50' : ''}`}
    >
      {/* Main row: indicator + content + desktop actions */}
      <div className="flex items-center gap-3 sm:min-w-0 sm:flex-1 sm:gap-4">
        {/* Color indicator */}
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full shadow-lg"
          style={{
            backgroundColor: capsule.color,
            boxShadow: `0 0 8px ${capsule.color}, 0 0 16px ${capsule.color}40`,
          }}
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={`truncate text-sm font-medium text-white sm:text-base ${
                capsule.health?.status === 'dead' ? 'line-through' : ''
              }`}
              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
            >
              {capsule.title}
            </h3>
            {capsule.pinned && (
              <span
                className="shrink-0 rounded border border-[#ffaa00]/30 bg-[#ffaa00]/10 px-1.5 py-0.5 text-[9px] tracking-wider text-[#ffaa00]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                PINNED
              </span>
            )}
            {/* 可见性图标 badge */}
            <span
              className={`shrink-0 ${VISIBILITY_COLOR[capsule.visibility]}`}
              title={`可见性: ${VISIBILITY_LABEL[capsule.visibility]}`}
            >
              <VisibilityIcon size={12} />
            </span>
            {/* 链接健康 badge */}
            {checking ? (
              <span className="shrink-0 text-[#00f0ff]" title="检测中…">
                <Loader2 size={12} className="animate-spin" />
              </span>
            ) : capsule.health && HEALTH_BADGE[capsule.health.status] ? (
              (() => {
                const badge = HEALTH_BADGE[capsule.health.status]!;
                const Icon = badge.icon;
                const titleParts = [badge.label];
                if (capsule.health.httpCode) titleParts.push(`HTTP ${capsule.health.httpCode}`);
                if (capsule.health.lastCheckedAt) titleParts.push(formatTime(capsule.health.lastCheckedAt));
                if (capsule.health.lastError) titleParts.push(capsule.health.lastError);
                return (
                  <span className={`shrink-0 ${badge.color}`} title={titleParts.join(' · ')}>
                    <Icon size={12} />
                  </span>
                );
              })()
            ) : null}
          </div>
          <a
            href={capsule.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/30 transition-colors hover:text-[#00f0ff]"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <ExternalLink size={10} />
            <span className="truncate">{capsule.url}</span>
          </a>
          {capsule.tags && capsule.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {capsule.tags.map((t) => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className="bg-white/5 px-1.5 py-0 text-[10px] font-normal text-white/40"
                >
                  {t.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp - desktop only */}
        <span
          className="hidden shrink-0 text-xs text-white/20 md:block md:text-sm"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {formatTime(capsule.createdAt)}
        </span>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1 sm:flex">
          {actionButtons}
        </div>
      </div>

      {/* Mobile actions */}
      <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2 sm:hidden">
        {actionButtons}
      </div>

      <CapsuleEditDialog key={capsule.id} capsule={capsule} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
