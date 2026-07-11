import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, signIn, useSession } from "@/providers/auth";
import NeuralMatrixGrid from "@/components/NeuralMatrixGrid";
import HolographicParticles from "@/components/HolographicParticles";

export default function Register() {
  const navigate = useNavigate();
  const { refetch } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("密码至少 8 位 / Password too short");
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await signUp.email({ name, email, password });
    if (signUpError) {
      setSubmitting(false);
      toast.error("注册失败 / Register failed", { description: signUpError.message });
      return;
    }

    // better-auth 注册后不会自动登录（autoSignIn: false），需要手动登录并刷新 session
    const { error: signInError } = await signIn.email({ email, password });
    if (signInError) {
      setSubmitting(false);
      toast.success("账号已创建 / Account created");
      navigate("/login", { replace: true });
      return;
    }

    await refetch();
    setSubmitting(false);
    toast.success("已连接 / Session active");
    navigate("/", { replace: true });
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
              // NEW NODE REGISTRATION
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/70">名称 / Name</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的昵称"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#00f0ff] text-[#050505] font-bold tracking-wider hover:bg-[#00f0ff]/80"
            >
              {submitting ? "CREATING…" : "REGISTER"}
            </Button>
          </form>

          <p
            className="mt-6 text-center text-xs text-white/40"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            已有账号？{" "}
            <Link to="/login" className="text-[#00f0ff] hover:underline">
              直接登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
