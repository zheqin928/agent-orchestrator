"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ErrorDisplay";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorDisplay
      title="出错了"
      message="仪表盘遇到了意外错误。请尝试重新加载路由数据，或返回主仪表盘。"
      tone="warning"
      primaryAction={{
        label: "重试",
        onClick: () => {
          reset();
          router.refresh();
        },
      }}
      secondaryAction={{ label: "返回仪表盘", href: "/" }}
      error={error}
      compact
      chrome="card"
    />
  );
}
