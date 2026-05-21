"use client";

import type { DashboardPR, DashboardSession } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

interface SessionEndedSummaryProps {
  session: DashboardSession;
  headline: string;
  pr: DashboardPR | null;
  dashboardHref: string;
  isRestorable: boolean;
  onRestore: () => void;
}

function formatEndedTime(isoDate: string | null | undefined): string {
  if (!isoDate) return "未知";
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return "未知";
  return formatRelativeTime(timestamp);
}

function getEndedSessionReason(session: DashboardSession): string {
  if (session.lifecycle?.runtime.reasonLabel) {
    return session.lifecycle.runtime.reasonLabel;
  }
  if (session.status === "killed") return "已手动停止";
  if (session.status === "terminated") return "运行时不可用";
  if (session.status === "done" || session.status === "merged") return "工作已完成";
  return "终端已结束";
}

function getEndedSessionSummary(session: DashboardSession, headline: string): string {
  const pinnedSummary = session.metadata["pinnedSummary"];
  if (pinnedSummary) return pinnedSummary;
  if (session.summary && !session.summaryIsFallback) return session.summary;
  if (session.lifecycle?.summary) return session.lifecycle.summary;
  if (session.userPrompt) return session.userPrompt;
  if (session.summary) return session.summary;
  return headline;
}

export function SessionEndedSummary({
  session,
  headline,
  pr,
  dashboardHref,
  isRestorable,
  onRestore,
}: SessionEndedSummaryProps) {
  const reason = getEndedSessionReason(session);
  const summary = getEndedSessionSummary(session, headline);
  const endedAt =
    session.lifecycle?.session.terminatedAt ??
    session.lifecycle?.session.completedAt ??
    session.lifecycle?.session.lastTransitionAt ??
    session.lastActivityAt;
  const runtimeLabel = session.lifecycle?.runtime.label ?? "不可用";
  const prLabel = pr
    ? pr.state === "merged"
      ? "已合并"
      : pr.state === "closed"
        ? "已关闭"
        : pr.mergeability.mergeable
          ? "开放,可合并"
          : "开放"
    : "无 PR";

  return (
    <section className="session-ended-summary" aria-label="会话结束摘要">
      <div className="session-ended-summary__panel">
        <div className="session-ended-summary__eyebrow">终端已结束</div>
        <div className="session-ended-summary__header">
          <div className="session-ended-summary__icon" aria-hidden="true">
            <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M7 10l3 2-3 2" />
              <path d="M13 15h4" />
            </svg>
          </div>
          <div className="session-ended-summary__title-group">
            <h2 className="session-ended-summary__title">{headline}</h2>
            <p className="session-ended-summary__subtitle">
              {reason}。实时终端已结束,但会话上下文仍可用。
            </p>
          </div>
        </div>

        <div className="session-ended-summary__body">
          <div className="session-ended-summary__section">
            <div className="session-ended-summary__label">发生了什么</div>
            <p className="session-ended-summary__copy">{summary}</p>
          </div>

          <div className="session-ended-summary__facts" aria-label="会话信息">
            <div className="session-ended-summary__fact">
              <span>会话</span>
              <strong>{session.id}</strong>
            </div>
            <div className="session-ended-summary__fact">
              <span>结束时间</span>
              <strong>{formatEndedTime(endedAt)}</strong>
            </div>
            <div className="session-ended-summary__fact">
              <span>运行时</span>
              <strong>{runtimeLabel}</strong>
            </div>
            <div className="session-ended-summary__fact">
              <span>PR</span>
              <strong>{prLabel}</strong>
            </div>
          </div>

          <div className="session-ended-summary__links">
            {isRestorable ? (
              <button
                type="button"
                onClick={onRestore}
                className="session-ended-summary__primary"
              >
                恢复会话
              </button>
            ) : null}
            {pr ? (
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isRestorable
                    ? "session-ended-summary__secondary"
                    : "session-ended-summary__primary"
                }
              >
                打开 PR #{pr.number}
              </a>
            ) : null}
            <a href={dashboardHref} className="session-ended-summary__secondary">
              返回仪表板
            </a>
          </div>

          {session.lifecycle?.evidence ? (
            <div className="session-ended-summary__evidence">
              <span>证据</span>
              <code>{session.lifecycle.evidence}</code>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
