"use client";

import { useMemo, useState, type RefObject } from "react";
import type { SessionInfo } from "@/lib/types";
import { skillExpansionToCommand } from "@/lib/slash-display";
import { formatRelativeTime } from "@/lib/i18n/format";
import { useI18n } from "@/hooks/useI18n";

/** Display title for a session: stored name, else first message, else id. */
export function sessionDisplayTitle(session: SessionInfo): string {
  // A stored first message may be an SDK-expanded <skill> block; collapse it
  // back to the compact /skill:name command, mirroring SessionItem.
  const displayFirstMessage = skillExpansionToCommand(session.firstMessage) ?? session.firstMessage;
  return session.name || displayFirstMessage.slice(0, 50) || session.id.slice(0, 12);
}

export function SessionsDropdown({
  sessions,
  selectedSessionId,
  runningSessionIds,
  unreadSessionIds,
  disabled,
  open,
  onToggle,
  buttonRef,
  dataMobileAction,
}: {
  sessions: SessionInfo[];
  selectedSessionId: string | null;
  runningSessionIds: Set<string>;
  unreadSessionIds: Set<string>;
  disabled?: boolean;
  open: boolean;
  onToggle: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  dataMobileAction?: string;
}) {
  const { t } = useI18n();
  const selected = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );
  const selectedRunning = Boolean(selected && runningSessionIds.has(selected.id));
  const selectedUnread = Boolean(selected && unreadSessionIds.has(selected.id));

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={selected ? sessionDisplayTitle(selected) : t("sessions.title")}
      aria-label={t("sessions.title")}
      aria-haspopup="menu"
      aria-expanded={open}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        position: "relative",
        width: 36, height: "100%", padding: 0,
        background: open ? "var(--bg-selected)" : "none",
        border: "none",
        borderTop: open ? "2px solid var(--accent)" : "2px solid transparent",
        borderRight: "1px solid var(--border)",
        color: open ? "var(--text)" : "var(--text-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        flexShrink: 0,
        transition: "color 0.1s, background 0.1s",
      }}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.color = "var(--text)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.color = open ? "var(--text)" : "var(--text-muted)";
      }}
      data-mobile-toolbar-action={dataMobileAction}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
        <path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9" />
        <path d="M3 15h6l1.5 2h3L15 15h6" />
        <path d="M3 15l1.5 3a2 2 0 0 0 1.8 1h6.4a2 2 0 0 0 1.8-1L21 15" />
      </svg>
      {(selectedRunning || selectedUnread) && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute", top: 3, right: 3,
            width: 7, height: 7, borderRadius: 4,
            background: selectedRunning ? "var(--accent)" : "#f59e0b",
          }}
        />
      )}
    </button>
  );
}

export function SessionsDropdownPanel({
  sessions,
  selectedSessionId,
  runningSessionIds,
  unreadSessionIds,
  onSelectSession,
}: {
  sessions: SessionInfo[];
  selectedSessionId: string | null;
  runningSessionIds: Set<string>;
  unreadSessionIds: Set<string>;
  onSelectSession: (session: SessionInfo) => void;
}) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");

  // Client-side filter on session name / first message / id, mirroring the
  // Filter-Projects input pattern. Sessions arrive sorted by modified desc.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => (
      sessionDisplayTitle(session).toLowerCase().includes(q)
      || (session.firstMessage ?? "").toLowerCase().includes(q)
      || session.id.toLowerCase().includes(q)
    ));
  }, [query, sessions]);

  return (
    <div
      role="menu"
      aria-label={t("sessions.title")}
      style={{
        background: "var(--bg-panel)",
        borderLeft: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
        padding: 4,
      }}
    >
      <input
        type="search"
        autoFocus
        value={query}
        maxLength={200}
        aria-label={t("sessions.search")}
        placeholder={t("sessions.search")}
        onChange={(event) => setQuery(event.target.value)}
        style={{
          display: "block", width: "100%", boxSizing: "border-box",
          height: 29, padding: "0 10px", marginBottom: 4,
          border: "1px solid var(--border)", borderRadius: 7,
          background: "var(--bg)", color: "var(--text)", fontSize: 12,
          outline: "none",
        }}
      />
      <div style={{ maxHeight: "min(50vh, 380px)", overflowY: "auto" }}>
        {visible.length === 0 && (
          <div style={{ padding: "12px 10px", color: "var(--text-muted)", fontSize: 12 }}>
            {t("sidebar.noSessions")}
          </div>
        )}
        {visible.map((session) => {
          const isSelected = session.id === selectedSessionId;
          const isRunning = runningSessionIds.has(session.id);
          const isUnread = unreadSessionIds.has(session.id);
          return (
            <button
              key={session.id}
              type="button"
              role="menuitemradio"
              aria-checked={isSelected}
              onClick={() => onSelectSession(session)}
              title={session.cwd}
              style={{
                display: "block", width: "100%", minHeight: 34, padding: "5px 10px",
                border: "none", borderRadius: 4,
                background: isSelected ? "var(--bg-selected)" : "transparent",
                color: "var(--text)", cursor: "pointer", textAlign: "left", fontSize: 12,
                transition: "background 0.1s",
              }}
              onMouseEnter={(event) => {
                if (!isSelected) event.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(event) => {
                if (!isSelected) event.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {isRunning && (
                  <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: "var(--accent)" }}>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                {isUnread && (
                  <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 4, background: "#f59e0b", flexShrink: 0 }} />
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, fontWeight: isSelected ? 500 : 400 }}>
                  {sessionDisplayTitle(session)}
                </span>
                <span style={{ marginLeft: "auto", flexShrink: 0, color: "var(--text-dim)", fontSize: 11 }} title={session.modified}>
                  {formatRelativeTime(session.modified, locale)}
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, color: "var(--text-dim)", fontSize: 11, minWidth: 0 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {session.cwd}
                </span>
                {session.isWorktree && session.branch && (
                  <span style={{ flexShrink: 0, color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {session.branch}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}