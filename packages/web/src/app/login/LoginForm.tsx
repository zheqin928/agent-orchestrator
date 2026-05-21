"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError("请输入密码");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "登录失败");
        setSubmitting(false);
        return;
      }
      const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-card__brand">Agent Orchestrator</div>
        <h1 className="login-card__title">登录</h1>
        <p className="login-card__subtitle">请输入访问密码</p>
        <label className="login-card__field">
          <span className="login-card__label">密码</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoFocus
            className="login-card__input"
            aria-label="访问密码"
          />
        </label>
        {error ? (
          <p className="login-card__error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="login-card__submit"
        >
          {submitting ? "登录中..." : "登录"}
        </button>
      </form>
    </main>
  );
}
