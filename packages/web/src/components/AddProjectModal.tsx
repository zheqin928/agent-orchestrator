"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  deriveProjectIdFromPath,
  deriveProjectNameFromPath,
  getParentBrowsePath,
  joinBrowsePath,
  RefreshIcon,
  saveRecentPath,
} from "@/components/AddProjectModal.parts";

interface BrowseEntry {
  name: string;
  isDirectory: boolean;
  isGitRepo: boolean;
  hasLocalConfig: boolean;
  modifiedAt?: number;
}

interface CollisionState {
  error: string;
  existingProjectId: string;
  suggestedProjectId: string;
  suggestion: "choose-project-id";
}

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddProjectModal({ open, onClose }: AddProjectModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [collision, setCollision] = useState<CollisionState | null>(null);
  const [browsePath, setBrowsePath] = useState("~");
  const [selectedBrowsePath, setSelectedBrowsePath] = useState("~");
  const [browseHistory, setBrowseHistory] = useState<string[]>(["~"]);
  const [browseHistoryIndex, setBrowseHistoryIndex] = useState(0);
  const [browseEntries, setBrowseEntries] = useState<BrowseEntry[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [projectIdInput, setProjectIdInput] = useState("");
  const [projectNameInput, setProjectNameInput] = useState("");

  const browse = async (
    path: string,
    options?: { mode?: "push" | "replace"; selectedPath?: string; historyIndex?: number },
  ) => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const response = await fetch(`/api/filesystem/browse?path=${encodeURIComponent(path)}`).catch(
        () => null,
      );
      if (!response) {
        setBrowseEntries([]);
        setSelectedBrowsePath(options?.selectedPath ?? path);
        setBrowseError("浏览目录失败。");
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; entries?: BrowseEntry[] }
          | null;
        setBrowseEntries([]);
        setSelectedBrowsePath(options?.selectedPath ?? path);
        setBrowseError(body?.error ?? "浏览目录失败。");
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { error?: string; entries?: BrowseEntry[] }
        | null;
      const mode = options?.mode ?? "push";
      const targetHistoryIndex = options?.historyIndex ?? browseHistoryIndex;
      setBrowsePath(path);
      setSelectedBrowsePath(options?.selectedPath ?? path);
      setBrowseEntries(body?.entries ?? []);
      if (mode === "push") {
        setBrowseHistory((current) => {
          const next = current.slice(0, targetHistoryIndex + 1);
          if (next[next.length - 1] !== path) next.push(path);
          setBrowseHistoryIndex(next.length - 1);
          return next;
        });
      } else {
        setBrowseHistory((current) => {
          const next = [...current];
          next[targetHistoryIndex] = path;
          return next;
        });
      }
    } catch {
      setBrowseError("浏览目录失败。");
    } finally {
      setBrowseLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const initialPath = "~";
    setInlineError(null);
    setNetworkError(null);
    setCollision(null);
    setBrowseError(null);
    setBrowseHistory([initialPath]);
    setBrowseHistoryIndex(0);
    setBrowsePath(initialPath);
    setSelectedBrowsePath(initialPath);
    setProjectIdInput("");
    setProjectNameInput("");
    modalRef.current?.focus();
    void browse(initialPath, { mode: "replace", selectedPath: initialPath });
  }, [open]);

  const directoryEntries = useMemo(() => browseEntries.filter((entry) => entry.isDirectory), [browseEntries]);
  const selectedEntry = useMemo(
    () => directoryEntries.find((entry) => joinBrowsePath(browsePath, entry.name) === selectedBrowsePath) ?? null,
    [browsePath, directoryEntries, selectedBrowsePath],
  );
  const parentPath = getParentBrowsePath(browsePath);
  const canGoBack = browseHistoryIndex > 0;
  const canGoForward = browseHistoryIndex < browseHistory.length - 1;
  const projectIdValue =
    projectIdInput.trim() ||
    (selectedBrowsePath.trim() && selectedBrowsePath !== "~" ? deriveProjectIdFromPath(selectedBrowsePath) : "");
  const projectNameValue =
    projectNameInput.trim() ||
    (selectedBrowsePath.trim() && selectedBrowsePath !== "~" ? deriveProjectNameFromPath(selectedBrowsePath) : "");
  const canSubmit =
    selectedBrowsePath.trim() !== "" &&
    selectedBrowsePath !== "~" &&
    !browseError &&
    Boolean(selectedEntry?.isGitRepo) &&
    projectIdValue.length > 0 &&
    projectNameValue.length > 0;
  const selectedIndex = directoryEntries.findIndex(
    (entry) => joinBrowsePath(browsePath, entry.name) === selectedBrowsePath,
  );

  useEffect(() => {
    if (!selectedBrowsePath || selectedBrowsePath === "~") {
      setProjectIdInput("");
      setProjectNameInput("");
      return;
    }

    setProjectIdInput(deriveProjectIdFromPath(selectedBrowsePath));
    setProjectNameInput(deriveProjectNameFromPath(selectedBrowsePath));
  }, [selectedBrowsePath]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!modalRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSubmit) {
        event.preventDefault();
        void submit();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (directoryEntries.length === 0) return;
        event.preventDefault();
        const offset = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = selectedIndex === -1 ? (offset > 0 ? 0 : directoryEntries.length - 1) : Math.min(Math.max(selectedIndex + offset, 0), directoryEntries.length - 1);
        const nextEntry = directoryEntries[nextIndex];
        if (nextEntry) setSelectedBrowsePath(joinBrowsePath(browsePath, nextEntry.name));
        return;
      }
      if (event.key === "Enter") {
        if (selectedIndex >= 0) {
          event.preventDefault();
          void browse(selectedBrowsePath);
          return;
        }
        if (canSubmit) {
          event.preventDefault();
          void submit();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [browsePath, canSubmit, directoryEntries, onClose, open, selectedBrowsePath, selectedIndex]);

  const submit = async (useDefaultProjectId = false) => {
    setInlineError(null);
    setNetworkError(null);
    setCollision(null);
    setSubmitting(true);
    const resolvedPath = selectedBrowsePath.trim();
    const projectId = projectIdValue;
    const name = projectNameValue;
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name, path: resolvedPath, useDefaultProjectId }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            projectId?: string;
            existingProjectId?: string;
            suggestedProjectId?: string;
            suggestion?: "choose-project-id";
          }
        | null;
      if (response.status === 409 && body?.existingProjectId && body?.suggestedProjectId && body?.suggestion) {
        setCollision({
          error: body.error ?? "已存在使用该 ID 的项目。",
          existingProjectId: body.existingProjectId,
          suggestedProjectId: body.suggestedProjectId,
          suggestion: body.suggestion,
        });
        setProjectIdInput(body.suggestedProjectId);
        return;
      }
      if (!response.ok) {
        const message = body?.error ?? "添加项目失败。";
        if (response.status < 500) setInlineError(message);
        else setNetworkError(message);
        return;
      }
      saveRecentPath(resolvedPath);
      const nextProjectId = body?.projectId ?? projectId.trim();
      onClose();
      router.push(`/projects/${encodeURIComponent(nextProjectId)}`);
      router.refresh();
    } catch {
      setNetworkError("添加项目时发生网络错误。");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const navigateHistory = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= browseHistory.length) return;
    setBrowseHistoryIndex(nextIndex);
    void browse(browseHistory[nextIndex] ?? "~", { mode: "replace", historyIndex: nextIndex });
  };

  const selectedNotice = collision ? (
    <div className="add-project-modal__notice add-project-modal__notice--warning">
      <p className="add-project-modal__notice-title">{collision.error}</p>
      <p className="add-project-modal__notice-copy">现有项目: <code>{collision.existingProjectId}</code></p>
      <p className="add-project-modal__notice-copy">建议的项目 ID: <code>{collision.suggestedProjectId}</code></p>
      <div className="add-project-modal__notice-actions">
        <button type="button" onClick={() => { onClose(); router.push(`/projects/${encodeURIComponent(collision.existingProjectId)}`); }} className="add-project-modal__ghostbtn">打开现有项目</button>
        <button type="button" onClick={() => void submit(true)} className="add-project-modal__ghostbtn">使用建议的 ID</button>
        <span className="add-project-modal__notice-hint">编辑项目 ID 字段或接受建议的后缀。</span>
      </div>
    </div>
  ) : inlineError ? (
    <div role="alert" className="add-project-modal__notice add-project-modal__notice--error">{inlineError}</div>
  ) : selectedEntry && !selectedEntry.isGitRepo ? (
    <div role="alert" className="add-project-modal__notice add-project-modal__notice--error">
      所选文件夹不是 git 仓库。
    </div>
  ) : networkError ? (
    <div className="add-project-modal__notice add-project-modal__notice--error">{networkError}</div>
  ) : null;

  return (
    <div className="add-project-modal-backdrop">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="添加项目" className="add-project-modal" tabIndex={-1}>
        <div className="add-project-modal__titlebar">
          <h2 className="add-project-modal__windowtitle">添加项目</h2>
          <button type="button" aria-label="关闭" onClick={onClose} className="add-project-modal__iconbtn">×</button>
        </div>
        <div className="add-project-modal__toolbar">
          <div className="add-project-modal__toolbarcluster">
            <button type="button" onClick={() => navigateHistory(browseHistoryIndex - 1)} disabled={!canGoBack} className="add-project-modal__toolbtn" aria-label="后退"><ChevronLeftIcon /></button>
            <button type="button" onClick={() => navigateHistory(browseHistoryIndex + 1)} disabled={!canGoForward} className="add-project-modal__toolbtn" aria-label="前进"><ChevronRightIcon /></button>
            <button type="button" onClick={() => parentPath && void browse(parentPath)} disabled={!parentPath} className="add-project-modal__toolbtn" aria-label="上一级"><ArrowUpIcon /></button>
            <button type="button" onClick={() => void browse(browsePath, { mode: "replace", selectedPath: selectedBrowsePath })} className="add-project-modal__toolbtn" aria-label="刷新"><RefreshIcon /></button>
          </div>
          <div className="add-project-modal__location">{browsePath}</div>
        </div>

        <div className="add-project-modal__content">
          <div className="add-project-browser">
            <div className="add-project-browser__current">
              <div className="add-project-browser__current-label">当前文件夹</div>
              <div className="add-project-browser__current-path">{browsePath}</div>
            </div>
            {browseError ? (
              <div className="add-project-browser__state add-project-browser__state--error">
                <p className="add-project-browser__state-title">目录浏览不可用</p>
                <p className="add-project-browser__state-copy">{browseError}</p>
              </div>
            ) : browseLoading ? (
              <div className="add-project-browser__state">
                <p className="add-project-browser__state-title">加载文件夹中</p>
                <p className="add-project-browser__state-copy">正在获取此位置的目录。</p>
              </div>
            ) : directoryEntries.length === 0 ? (
              <div className="add-project-browser__state">
                <p className="add-project-browser__state-title">此处无可见文件夹</p>
                <p className="add-project-browser__state-copy">请尝试向上导航或选择其他位置。</p>
              </div>
            ) : (
              <div className="add-project-browser__rows">
                {parentPath ? (
                  <button type="button" onClick={() => void browse(parentPath)} className="add-project-browser__row add-project-browser__row--parent">
                    ..
                  </button>
                ) : null}
                {directoryEntries.map((entry) => {
                  const nextPath = joinBrowsePath(browsePath, entry.name);
                  return (
                    <button key={nextPath} type="button" onClick={() => setSelectedBrowsePath(nextPath)} onDoubleClick={() => void browse(nextPath)} className={`add-project-browser__row${selectedBrowsePath === nextPath ? " is-selected" : ""}`}>
                      {entry.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="add-project-modal__pathbar add-project-modal__pathbar--selection">
          <span className="add-project-modal__selection-label">已选择</span>
          <span className="add-project-modal__selection-path">{selectedBrowsePath || "未选择目录"}</span>
        </div>
        <div className="add-project-modal__pathbar add-project-modal__pathbar--selection">
          <label className="add-project-modal__selection-label" htmlFor="project-id-input">项目 ID</label>
          <input
            id="project-id-input"
            value={projectIdInput}
            onChange={(event) => setProjectIdInput(event.target.value)}
            className="add-project-modal__selection-path"
          />
        </div>
        <div className="add-project-modal__pathbar add-project-modal__pathbar--selection">
          <label className="add-project-modal__selection-label" htmlFor="project-name-input">项目名称</label>
          <input
            id="project-name-input"
            value={projectNameInput}
            onChange={(event) => setProjectNameInput(event.target.value)}
            className="add-project-modal__selection-path"
          />
        </div>
        {selectedNotice}

        <div className="add-project-modal__footer">
          <div className="add-project-modal__foldercount">{directoryEntries.length} 个文件夹</div>
          <div className="add-project-modal__actions">
            <button type="button" onClick={onClose} className="add-project-modal__ghostbtn">取消</button>
            <button type="button" onClick={() => void submit()} disabled={!canSubmit || submitting} className="add-project-modal__primarybtn">{submitting ? "添加中…" : "添加项目"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
