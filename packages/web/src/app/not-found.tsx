import { ErrorDisplay } from "@/components/ErrorDisplay";

export default function NotFound() {
  return (
    <ErrorDisplay
      title="页面未找到"
      message="此路由在仪表盘中不存在。请返回主视图以选择活动的项目或会话。"
      tone="not-found"
      primaryAction={{ label: "返回仪表盘", href: "/" }}
    />
  );
}
