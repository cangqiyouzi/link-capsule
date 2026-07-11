import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, useSession } from "@/providers/auth";
import NeuralMatrixGrid from "@/components/NeuralMatrixGrid";
import HolographicParticles from "@/components/HolographicParticles";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refetch } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      setSubmitting(false);
      toast.error("登录失败 / Login failed", { description: error.message });
      return;
    }
    // signIn.email 只写 cookie，不更新 session atom；必须显式 refetch 后再导航，
    // 否则 RequireAuth 会读到旧的 null+isPending:false 被踢回 /login
    await refetch();
    setSubmitting(false);
    toast.success("已连接 / Session active");
    navigate(from, { replace: true });
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505]">
      <NeuralMatrixGrid />
      <HolographicParticles />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="glass-panel w-full max-w-[420px] rounded-2xl px-8 py-10">
          <div className="mb-8 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]" />
              <span
                className="text-sm font-bold tracking-[0.25em] text-white"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                LINK CAPSULE
              </span>
            </div>
            <p
              className="text-xs tracking-wider text-[#00f0ff]/60"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              // NEURAL LINK AUTHENTICATION
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/70">邮箱 / Email</Label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">密码 / Password</Label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#00f0ff] text-[#050505] font-bold tracking-wider hover:bg-[#00f0ff]/80"
            >
              {submitting ? "LINKING…" : "CONNECT"}
            </Button>
          </form>

          <p
            className="mt-6 text-center text-xs text-white/40"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            尚未接入？{" "}
            <Link to="/register" className="text-[#00f0ff] hover:underline">
              注册新账号
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
