import Link from "next/link";
import { projectDashboardPath } from "@/lib/routes";
import { RepairDegradedProjectButton } from "./RepairDegradedProjectButton";

interface DegradedProjectStateProps {
  projectId: string;
  resolveError: string;
  projectPath: string;
  heading?: string;
}

export function DegradedProjectState({
  projectId,
  resolveError,
  projectPath,
  heading = "此项目的配置加载失败",
}: DegradedProjectStateProps) {
  const matchedConfigPath = resolveError.match(/Local config at (.+?) (?:still uses|failed validation|must parse to an object|:)/)?.[1];
  const yamlPath = matchedConfigPath ?? `${projectPath}/agent-orchestrator.yaml or .yml`;
  const canAutoRepair = resolveError.includes("wrapped projects: format");

  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)] px-6 py-10 text-[var(--color-text-primary)]">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="mt-1 rounded-full bg-[var(--color-tint-yellow)] p-2 text-[var(--color-status-attention)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 8v4m0 4h.01" />
              <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              异常项目
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{heading}</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              项目 <span className="font-medium text-[var(--color-text-primary)]">{projectId}</span> 无法被解析为
              有效的运行时配置。
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
            解析错误
          </p>
          <p className="mt-2 text-sm text-[var(--color-status-error)]">{resolveError}</p>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
            本地配置路径
          </p>
          <p className="mt-2 break-all font-[var(--font-mono)] text-sm text-[var(--color-text-primary)]">
            {yamlPath}
          </p>
        </div>

        {canAutoRepair ? <RepairDegradedProjectButton projectId={projectId} /> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={projectDashboardPath(projectId)}
            className="rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated-hover)]"
          >
            返回项目
          </Link>
          <Link
            href={projectDashboardPath(projectId)}
            className="rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated-hover)]"
          >
            打开仪表盘视图
          </Link>
        </div>
      </div>
    </div>
  );
}
