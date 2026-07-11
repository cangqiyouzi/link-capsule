import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "@/providers/auth";

/**
 * 路由守卫：未登录跳转 /login，并记录来源位置以便登录后回跳。
 * 会话加载中显示与主页一致的全息加载样式。
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00f0ff] border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
