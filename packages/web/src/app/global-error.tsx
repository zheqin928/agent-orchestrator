"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ErrorDisplay";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)] antialiased">
        <ErrorDisplay
          title="应用外壳出错"
          message="仪表盘无法在布局层级从此错误中恢复。请先尝试重试，如果仍然失败请重新加载页面。"
          tone="error"
          primaryAction={{ label: "重试", onClick: reset }}
          secondaryAction={{ label: "重新加载页面", onClick: () => window.location.reload() }}
          error={error}
        />
      </body>
    </html>
  );
}
