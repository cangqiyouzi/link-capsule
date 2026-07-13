import { useState, useEffect } from 'react';
import { useNavigate, Link, NavLink } from 'react-router';
import { toast } from 'sonner';
import { LogOutIcon, UserIcon, Compass, Menu } from 'lucide-react';
import { useSession, signOut } from '@/providers/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

const NAV_TABS = [
  { to: '/', label: '主页', end: true },
  { to: '/discover', label: '发现' },
  { to: '/feed', label: '关注' },
  { to: '/me', label: '我的', end: false },
];

export default function Navbar() {
  const [time, setTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  async function handleLogout() {
    await signOut();
    toast.success('已断开 / Session closed');
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
  }

  const handleProfile = () => {
    setMobileMenuOpen(false);
    navigate('/me');
  };

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-xs transition-colors ${
      isActive
        ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
        : 'text-white/50 hover:bg-white/5 hover:text-white'
    }`;

  const mobileTabClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors ${
      isActive
        ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
        : 'text-white/70 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[30] flex items-center justify-between px-4 py-4 md:px-10">
      <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 md:gap-3">
        <div className="h-3 w-3 rounded-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]" />
        <span
          className="text-sm font-bold tracking-[0.2em] text-white md:text-base"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          LINK CAPSULE
        </span>
        <span className="hidden text-xs text-white/40 sm:inline-block" style={{ fontFamily: "'Space Mono', monospace" }}>
          链接胶囊
        </span>
      </Link>

      {/* 中间导航 Tab（桌面端） */}
      <div className="hidden items-center gap-1 md:flex">
        {NAV_TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={tabClass}>
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div
          className="hidden text-xs tracking-wider text-white/50 md:block md:text-sm"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {time}
        </div>

        {user ? (
          <>
            {/* 桌面端用户下拉 */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition-colors hover:border-[#00f0ff]/40 hover:bg-white/10"
                    aria-label="用户菜单"
                  >
                    <Avatar className="size-7 border border-[#00f0ff]/30">
                      {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                      <AvatarFallback className="bg-[#00f0ff]/10 text-[10px] font-bold text-[#00f0ff]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className="max-w-[120px] truncate text-xs text-white/80"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      {user.name}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="border-white/10 bg-[#0a0a0a]/95 text-white backdrop-blur"
                >
                  <DropdownMenuLabel className="text-white/50">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleProfile} className="cursor-pointer text-[#00f0ff] focus:text-[#00f0ff]">
                    <UserIcon className="size-4" />
                    个人主页 / Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-300 focus:text-red-200"
                  >
                    <LogOutIcon className="size-4" />
                    登出 / Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 移动端汉堡菜单 */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
                  aria-label="打开菜单"
                >
                  <Menu size={18} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
                <SheetHeader className="border-b border-white/10 pb-4">
                  <SheetTitle className="text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
                    LINK CAPSULE
                  </SheetTitle>
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="size-10 border border-[#00f0ff]/30">
                      {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                      <AvatarFallback className="bg-[#00f0ff]/10 text-xs font-bold text-[#00f0ff]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{user.name}</p>
                      <p className="truncate text-xs text-white/50">{user.email}</p>
                    </div>
                  </div>
                </SheetHeader>

                <nav className="mt-4 flex flex-col gap-1">
                  {NAV_TABS.map((t) => (
                    <SheetClose key={t.to} asChild>
                      <NavLink to={t.to} end={t.end} className={mobileTabClass}>
                        {t.label}
                      </NavLink>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-auto border-t border-white/10 pt-4">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <LogOutIcon className="size-4" />
                    登出 / Sign out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          // 未登录时显示登录按钮（公开页如 /discover /shared/:token）
          <div className="flex items-center gap-2">
            <Link
              to="/discover"
              className="rounded-md p-1.5 text-white/50 transition-all hover:bg-white/10 hover:text-[#00f0ff] md:hidden"
              title="发现"
            >
              <Compass size={16} />
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3 py-1 text-xs text-[#00f0ff] transition-all hover:bg-[#00f0ff]/20"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              登录 / Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
