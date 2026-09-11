import type { SessionInfo } from "./types";
import { workspaceKeyOf } from "./workspace-memory";

export interface RecentProject {
  /** Stable server-provided identity used for comparison and Map keys. */
  key: string;
  /** Original project path used for display and filesystem operations. */
  root: string;
}

/** Projects sorted by most recent activity and deduplicated by stable key. */
export function getRecentProjects(sessions: readonly SessionInfo[]): RecentProject[] {
  const latestByProject = new Map<string, { root: string; modified: string }>();
  for (const session of sessions) {
    const root = session.projectRoot ?? session.cwd;
    if (!root) continue;
    const key = workspaceKeyOf(session);
    const previous = latestByProject.get(key);
    if (!previous || session.modified > previous.modified) {
      latestByProject.set(key, { root, modified: session.modified });
    }
  }
  return [...latestByProject.entries()]
    .sort((a, b) => b[1].modified.localeCompare(a[1].modified))
    .map(([key, { root }]) => ({ key, root }));
}

export function getProjectActivity(
  sessions: readonly SessionInfo[],
  runningSessionIds: ReadonlySet<string>,
  unreadSessionIds: ReadonlySet<string>,
): Map<string, { running: number; unread: number }> {
  const counts = new Map<string, { running: number; unread: number }>();
  for (const session of sessions) {
    const key = workspaceKeyOf(session);
    if (!key) continue;
    let entry = counts.get(key);
    if (!entry) {
      entry = { running: 0, unread: 0 };
      counts.set(key, entry);
    }
    if (runningSessionIds.has(session.id)) entry.running++;
    if (unreadSessionIds.has(session.id)) entry.unread++;
  }
  return counts;
}

export function sessionsForProject(
  sessions: readonly SessionInfo[],
  projectKey: string,
): SessionInfo[] {
  return sessions.filter((session) => workspaceKeyOf(session) === projectKey);
}

export interface ProjectCostTotalOptions {
  /** Live cost of the session currently being viewed; replaces its stale list cost. */
  currentSessionId?: string | null;
  currentSessionCost?: number | null;
}

/**
 * Total usage cost across every session in a project folder. The session being
 * viewed contributes its live cost when provided, so the total stays in sync
 * with the top-bar cost counter between session-list refreshes.
 */
export function getProjectCostTotal(
  sessions: readonly SessionInfo[],
  projectKey: string,
  options: ProjectCostTotalOptions = {},
): number {
  const { currentSessionId, currentSessionCost } = options;
  let total = 0;
  for (const session of sessions) {
    if (workspaceKeyOf(session) !== projectKey) continue;
    if (currentSessionId && session.id === currentSessionId && typeof currentSessionCost === "number") continue;
    total += session.cost ?? 0;
  }
  if (typeof currentSessionCost === "number") {
    total += currentSessionCost;
  }
  return total;
}
