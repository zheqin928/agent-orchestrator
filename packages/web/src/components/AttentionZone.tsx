"use client";

import { memo, useEffect, useState } from "react";
import { type DashboardSession, type AttentionLevel, isPRMergeReady } from "@/lib/types";
import { SessionCard } from "./SessionCard";
import { getSessionTitle } from "@/lib/format";
import { projectSessionPath } from "@/lib/routes";

interface AttentionZoneProps {
  level: AttentionLevel;
  sessions: DashboardSession[];
  onSend?: (sessionId: string, message: string) => Promise<void> | void;
  onKill?: (sessionId: string) => void;
  onMerge?: (prNumber: number) => void;
  onRestore?: (sessionId: string) => void;
  onReview?: (sessionId: string) => Promise<void> | void;
  /** Accordion mode: whether this section is collapsed (mobile only) */
  collapsed?: boolean;
  /** Accordion mode: called when the header is tapped to toggle */
  onToggle?: (level: AttentionLevel) => void;
  /** Dense mobile rows rendered instead of full cards */
  compactMobile?: boolean;
  /** Open the lightweight mobile preview sheet */
  onPreview?: (session: DashboardSession) => void;
  /** Reset internal "show all" state when this value changes */
  resetKey?: string | number | null;
}

const zoneConfig: Record<
  AttentionLevel,
  {
    label: string;
    emptyMessage: string;
  }
> = {
  merge: {
    label: "就绪",
    emptyMessage: "暂无可合并的项目。",
  },
  action: {
    label: "待操作",
    emptyMessage: "没有智能体需要您的输入。",
  },
  respond: {
    label: "待回复",
    emptyMessage: "没有智能体需要您的输入。",
  },
  review: {
    label: "待审阅",
    emptyMessage: "没有代码等待审阅。",
  },
  pending: {
    label: "等待中",
    emptyMessage: "没有阻塞项。",
  },
  working: {
    label: "进行中",
    emptyMessage: "没有正在运行的智能体。",
  },
  done: {
    label: "已完成",
    emptyMessage: "暂无已完成的会话。",
  },
};

/**
 * Kanban column — always renders (even when empty) to preserve
 * the board shape. Cards scroll independently within each column.
 *
 * When `collapsed` and `onToggle` are provided the component renders
 * in accordion mode (mobile): a 44 px tappable header only, with the
 * card list hidden. Empty sections in accordion mode omit the dashed
 * placeholder entirely — just the single-line header is shown.
 */
function AttentionZoneView({
  level,
  sessions,
  onSend,
  onKill,
  onMerge,
  onRestore,
  onReview,
  collapsed,
  onToggle,
  compactMobile,
  onPreview,
  resetKey,
}: AttentionZoneProps) {
  const config = zoneConfig[level];
  const isAccordion = onToggle !== undefined;
  const [showAll, setShowAll] = useState(false);
  const visibleSessions =
    isAccordion && compactMobile && !showAll ? sessions.slice(0, 5) : sessions;
  const hiddenCount = sessions.length - visibleSessions.length;

  useEffect(() => {
    if (collapsed) {
      setShowAll(false);
    }
  }, [collapsed]);

  useEffect(() => {
    setShowAll(false);
  }, [resetKey]);

  if (isAccordion) {
    return (
      <div
        className={`accordion-section${collapsed ? " accordion-section--collapsed" : " accordion-section--expanded"}`}
        data-level={level}
      >
        <button
          type="button"
          className="accordion-header"
          onClick={() => onToggle(level)}
          aria-expanded={!collapsed}
          aria-controls={`accordion-body-${level}`}
        >
          <span className="accordion-header__dot" data-level={level} />
          <span className="accordion-header__label">{config.label}</span>
          <span className="accordion-header__count">{sessions.length}</span>
          <span className="accordion-header__chevron" aria-hidden="true">
            ▶
          </span>
        </button>

        <div id={`accordion-body-${level}`} className="accordion-body">
          {sessions.length > 0 ? (
            <div className={compactMobile ? "mobile-session-list" : "flex flex-col gap-2 p-3"}>
              {visibleSessions.map((session) =>
                compactMobile ? (
                  <MobileSessionRow
                    key={session.id}
                    session={session}
                    level={level}
                    onPreview={onPreview}
                  />
                ) : (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onSend={onSend}
                    onKill={onKill}
                    onMerge={onMerge}
                    onRestore={onRestore}
                    onReview={onReview}
                  />
                ),
              )}
              {compactMobile && hiddenCount > 0 ? (
                <button
                  type="button"
                  className="mobile-session-list__view-all"
                  onClick={() => setShowAll(true)}
                >
                  查看全部 {sessions.length}
                </button>
              ) : null}
            </div>
          ) : compactMobile ? (
            <div className="mobile-session-list">
              <div className="mobile-session-list__empty">{config.emptyMessage}</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-column" data-level={level}>
      <div className="kanban-column__header">
        <div className="kanban-column__title-row">
          <div className="kanban-column__dot" data-level={level} />
          <span className="kanban-column__title">{config.label}</span>
          <span className="kanban-column__count">{sessions.length}</span>
        </div>
      </div>

      <div className="kanban-column-body">
        {sessions.length > 0 ? (
          <div className="kanban-column__stack">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onSend={onSend}
                onKill={onKill}
                onMerge={onMerge}
                onRestore={onRestore}
                onReview={onReview}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function areAttentionZonePropsEqual(prev: AttentionZoneProps, next: AttentionZoneProps): boolean {
  return (
    prev.level === next.level &&
    prev.collapsed === next.collapsed &&
    prev.onToggle === next.onToggle &&
    prev.onSend === next.onSend &&
    prev.onKill === next.onKill &&
    prev.onMerge === next.onMerge &&
    prev.onRestore === next.onRestore &&
    prev.onReview === next.onReview &&
    prev.compactMobile === next.compactMobile &&
    prev.onPreview === next.onPreview &&
    prev.resetKey === next.resetKey &&
    prev.sessions.length === next.sessions.length &&
    prev.sessions.every((session, index) => session === next.sessions[index])
  );
}

export const AttentionZone = memo(AttentionZoneView, areAttentionZonePropsEqual);

function MobileSessionRow({
  session,
  level,
  onPreview,
}: {
  session: DashboardSession;
  level: AttentionLevel;
  onPreview?: (session: DashboardSession) => void;
}) {
  const meta = [
    session.branch,
    session.pr ? `PR #${session.pr.number}` : null,
    session.issueLabel,
  ].filter(Boolean);

  return (
    <div className="mobile-session-row">
      <button
        type="button"
        className="mobile-session-row__preview"
        onClick={() => onPreview?.(session)}
        aria-label={`打开 ${getSessionTitle(session)}`}
      >
        <div className="mobile-session-row__line">
          <span className="mobile-session-row__dot" data-level={level} aria-hidden="true" />
          <span className="mobile-session-row__title">{getSessionTitle(session)}</span>
        </div>
        <div className="mobile-session-row__meta">
          {meta.length > 0 ? meta.join(" · ") : "无分支或 PR 元数据"}
        </div>
      </button>
      <div className="mobile-session-row__side">
        <SessionStateChip session={session} level={level} />
        <a
          href={projectSessionPath(session.projectId, session.id)}
          className="mobile-session-row__open"
          aria-label={`前往 ${getSessionTitle(session)}`}
        >
          <svg
            className="mobile-session-row__open-icon"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
            <path d="m8 10 2 2-2 2M12 14h4" />
          </svg>
        </a>
      </div>
    </div>
  );
}

/**
 * Pure label picker for the mobile action chip.
 *
 * Exported for unit tests. Returns the most specific human-readable reason
 * to intervene on a session that has collapsed into the simple-mode `action`
 * bucket. Precedence mirrors `getDetailedAttentionLevel` in `lib/types.ts`:
 * respond-class signals (status errored/needs_input/stuck, then activity
 * waiting_input/exited/blocked) outrank review-class signals (ci_failed /
 * changes_requested / PR conflicts). Otherwise a crashed agent whose PR
 * also has `changes_requested` would be mislabeled "changes" and hide the
 * crash, steering the operator toward PR review instead of restart.
 */
export function getActionChipLabel(session: DashboardSession): string {
  // Respond-class: status (authoritative, can't be masked by stale activity)
  if (session.status === "needs_input") return "需要输入";
  if (session.status === "stuck") return "卡住";
  if (session.status === "errored") return "出错";
  // Respond-class: activity — check before review-class status so a crashed
  // agent with a non-terminal status (e.g. changes_requested) still reads
  // as "crashed" and not "changes".
  if (session.activity === "waiting_input") return "等待中";
  if (session.activity === "exited") return "已崩溃";
  if (session.activity === "blocked") return "阻塞";
  // Review-class: status
  if (session.status === "ci_failed") return "CI 失败";
  if (session.status === "changes_requested") return "需修改";
  // Review-class: PR signals
  if (session.pr?.ciStatus === "failing") return "CI 失败";
  if (session.pr?.reviewDecision === "changes_requested") return "需修改";
  if (session.pr && !session.pr.mergeability.noConflicts) return "冲突";
  return "待操作";
}

function SessionStateChip({
  session,
  level,
}: {
  session: DashboardSession;
  level: AttentionLevel;
}) {
  let label = zoneConfig[level].label.toLowerCase();

  if (level === "merge" && session.pr && isPRMergeReady(session.pr)) {
    label = "就绪";
  } else if (level === "action") {
    label = getActionChipLabel(session);
  } else if (level === "respond") {
    label = session.activity === "waiting_input" ? "等待中" : "需要输入";
  } else if (level === "review") {
    label = session.pr?.reviewDecision === "changes_requested" ? "需修改" : "审阅";
  } else if (level === "pending") {
    label = session.pr?.unresolvedThreads ? "讨论" : "等待中";
  } else if (level === "working") {
    label = session.activity === "idle" ? "空闲" : "活跃";
  }

  return <span className="mobile-session-row__chip">{label}</span>;
}
