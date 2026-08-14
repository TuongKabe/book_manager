"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, List, X } from "@phosphor-icons/react";
import Modal from "@/app/components/ui/Modal";
import { WORKFLOWS, type Workflow } from "./content";

type Progress = {
  [workflowId: string]: { [stepIndex: number]: boolean };
};

const STORAGE_KEY = "bookbase:help:progress";
const PROGRESS_CHANGE_EVENT = "bookbase:help:progress-change";
const EMPTY_PROGRESS: Progress = {};

let lastRaw: string | null = null;
let lastSnapshot: Progress = EMPTY_PROGRESS;

function getSnapshot(): Progress {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (raw === lastRaw) return lastSnapshot;
  lastRaw = raw;
  if (raw === null) {
    lastSnapshot = EMPTY_PROGRESS;
  } else {
    try {
      lastSnapshot = JSON.parse(raw) as Progress;
    } catch {
      lastSnapshot = EMPTY_PROGRESS;
    }
  }
  return lastSnapshot;
}

function getServerSnapshot(): Progress {
  return EMPTY_PROGRESS;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PROGRESS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PROGRESS_CHANGE_EVENT, callback);
  };
}

function writeProgress(p: Progress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(PROGRESS_CHANGE_EVENT));
}

function getDoneCount(w: Workflow, progress: Progress): number {
  const wf = progress[w.id] ?? {};
  return w.steps.reduce((sum, _, i) => sum + (wf[i] ? 1 : 0), 0);
}

export default function HelpClient() {
  const [activeId, setActiveId] = useState<string>(WORKFLOWS[0].id);
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [confirmReset, setConfirmReset] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sections = WORKFLOWS.map((w) => document.getElementById(w.id));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((s) => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function scrollToWorkflow(id: string, closeDrawer = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActiveId(id);
    if (closeDrawer) {
      setTimeout(() => setDrawerOpen(false), 100);
    }
  }

  function toggleStep(workflowId: string, stepIndex: number) {
    const current = getSnapshot();
    const wf = { ...(current[workflowId] ?? {}) };
    wf[stepIndex] = !wf[stepIndex];
    writeProgress({ ...current, [workflowId]: wf });
  }

  function handleReset() {
    writeProgress({});
    setConfirmReset(false);
  }

  return (
    <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6 md:items-start">
      {/* Desktop TOC */}
      <aside className="hidden md:block md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {WORKFLOWS.map((w) => (
            <li key={w.id}>
              <a
                href={`#${w.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToWorkflow(w.id);
                }}
                aria-current={activeId === w.id ? "true" : undefined}
                className={[
                  "block rounded-r-md border-l-2 px-3 py-2 text-[13px] transition-colors",
                  activeId === w.id
                    ? "border-brand bg-brand-soft font-medium text-brand"
                    : "border-transparent text-ink-muted hover:bg-surface-soft hover:text-ink",
                ].join(" ")}
              >
                <span className="inline-block w-5 text-ink-faint font-tabular">
                  {w.number}.
                </span>
                {w.shortTitle}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {/* Content */}
      <div className="max-w-3xl pb-20">
        {/* Mobile TOC button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-2 text-[13px] font-medium text-ink md:hidden"
          aria-label="Mở mục lục"
        >
          <List size={16} weight="bold" /> Mục lục
        </button>

        {/* Page header + reset */}
        <div className="flex items-start justify-between gap-3 pb-3">
          <div>
            <h1 className="font-tabular text-[22px] font-semibold tracking-tight text-ink">
              Hướng dẫn sử dụng BookBase
            </h1>
            <p className="mt-1 text-[13px] text-ink-faint">
              Mỗi mục là một công việc cụ thể. Tick các bước để theo dõi tiến độ.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-danger hover:bg-danger-soft hover:text-danger"
            aria-label="Reset tất cả checklist"
          >
            Reset checklist
          </button>
        </div>

        {/* Workflow sections */}
        {WORKFLOWS.map((w) => {
          const Icon = w.icon;
          const done = getDoneCount(w, progress);
          const total = w.steps.length;
          const wfProgress = progress[w.id] ?? {};
          const allDone = done === total && total > 0;
          return (
            <section
              key={w.id}
              id={w.id}
              className="scroll-mt-4 border-b border-hairline py-6 last:border-b-0"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-soft font-tabular text-[12px] font-semibold text-brand">
                  {w.number}
                </span>
                <Icon size={18} weight="regular" className="text-brand" />
                <h2 className="font-tabular text-[18px] font-semibold tracking-tight text-ink">
                  {w.title}
                </h2>
                <span
                  className={[
                    "ml-auto font-tabular text-[12px] font-medium",
                    allDone ? "text-success" : "text-brand",
                  ].join(" ")}
                >
                  {done}/{total} bước
                </span>
              </div>

              <div className="mb-5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Mục đích
                </p>
                <p className="text-[14px] leading-relaxed text-ink">{w.purpose}</p>
              </div>

              <div className="mb-5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Khi nào dùng
                </p>
                <p className="text-[14px] leading-relaxed text-ink">{w.whenToUse}</p>
              </div>

              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Các bước
                </p>
                <ul className="flex flex-col gap-1">
                  {w.steps.map((step, i) => {
                    const isDone = !!wfProgress[i];
                    return (
                      <li key={i}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-soft">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleStep(w.id, i)}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand"
                            aria-label={`Bước ${i + 1}: ${step}`}
                          />
                          <span
                            className={[
                              "text-[14px] leading-relaxed",
                              isDone ? "text-ink-faint line-through" : "text-ink",
                            ].join(" ")}
                          >
                            {step}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Lưu ý
                </p>
                <ul className="flex flex-col gap-2">
                  {w.notes.map((note, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-hairline pl-3 text-[13px] leading-relaxed text-ink-muted"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={w.ctaHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[14px] font-medium text-on-brand transition-colors hover:bg-brand-hover"
              >
                {w.ctaLabel}
                <ArrowRight size={14} weight="bold" />
              </Link>
            </section>
          );
        })}
      </div>

      {/* Reset confirm modal */}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset tất cả checklist?"
        description="Toàn bộ tick ở 8 workflow sẽ bị xoá. Không thể hoàn tác."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-md border border-hairline bg-surface px-3.5 py-2 text-[13px] text-ink hover:bg-surface-soft"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md bg-danger px-3.5 py-2 text-[13px] font-medium text-on-brand hover:opacity-90"
            >
              Xoá hết
            </button>
          </div>
        }
      >
        {null}
      </Modal>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mục lục"
        >
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 h-full w-[280px] max-w-[80vw] overflow-y-auto border-r border-hairline bg-surface p-4">
            <div className="mb-3 flex items-center justify-between border-b border-hairline pb-3">
              <p className="text-[14px] font-semibold text-ink">Mục lục</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-surface-soft hover:text-ink"
                aria-label="Đóng mục lục"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
            <ul className="flex flex-col gap-0.5">
              {WORKFLOWS.map((w) => (
                <li key={w.id}>
                  <a
                    href={`#${w.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToWorkflow(w.id, true);
                    }}
                    className={[
                      "block rounded-r-md border-l-2 px-3 py-2 text-[13px] transition-colors",
                      activeId === w.id
                        ? "border-brand bg-brand-soft font-medium text-brand"
                        : "border-transparent text-ink-muted hover:bg-surface-soft hover:text-ink",
                    ].join(" ")}
                  >
                    <span className="inline-block w-5 text-ink-faint font-tabular">
                      {w.number}.
                    </span>
                    {w.shortTitle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
