import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { projectIdentityKey } = await jiti.import("./project-identity.ts");
const {
  getProjectActivity,
  getProjectCostTotal,
  getRecentProjects,
  sessionsForProject,
} = await jiti.import("./project-groups.ts");

function session(id, projectRoot, modified) {
  return {
    id,
    path: `${id}.jsonl`,
    cwd: projectRoot,
    projectRoot,
    projectKey: projectIdentityKey(projectRoot, "win32"),
    created: modified,
    modified,
    messageCount: 1,
    firstMessage: id,
  };
}

test("Windows path variants form one recent project using the newest display path", () => {
  const older = session("older", "C:\\Users\\Alex\\Project\\Study\\ELM", "2026-08-12T00:00:00.000Z");
  const newer = session("newer", "c:/users/ALEX/project/study/elm", "2026-08-13T00:00:00.000Z");

  assert.deepEqual(getRecentProjects([older, newer]), [{
    key: older.projectKey,
    root: newer.projectRoot,
  }]);
});

test("project filtering includes every session with the stable identity", () => {
  const first = session("first", "C:\\Users\\Alex\\Project", "2026-08-12T00:00:00.000Z");
  const second = session("second", "c:/users/alex/project/", "2026-08-13T00:00:00.000Z");
  const other = session("other", "D:\\Elsewhere", "2026-08-13T01:00:00.000Z");

  assert.deepEqual(
    sessionsForProject([first, second, other], first.projectKey).map((item) => item.id),
    ["first", "second"],
  );
});

test("running and unread counts aggregate under the stable project identity", () => {
  const first = session("first", "C:\\Users\\Alex\\Project", "2026-08-12T00:00:00.000Z");
  const second = session("second", "c:/users/alex/project/", "2026-08-13T00:00:00.000Z");

  const activity = getProjectActivity(
    [first, second],
    new Set(["first", "second"]),
    new Set(["second"]),
  );

  assert.deepEqual(activity.get(first.projectKey), { running: 2, unread: 1 });
  assert.equal(activity.size, 1);
});

test("folder cost total sums same-project sessions and honours the live current cost", () => {
  const first = { ...session("first", "C:\\Users\\Alex\\Project", "2026-08-12T00:00:00.000Z"), cost: 1.25 };
  const second = { ...session("second", "c:/users/alex/project/", "2026-08-13T00:00:00.000Z"), cost: 0.75 };
  const other = { ...session("other", "D:\\Elsewhere", "2026-08-13T01:00:00.000Z"), cost: 9.99 };
  const free = session("free", "C:\\Users\\Alex\\Project\\worktree", "2026-08-14T00:00:00.000Z");

  assert.equal(getProjectCostTotal([first, second, other, free], first.projectKey), 2);

  // The viewed session contributes its live cost instead of its stale list cost.
  assert.equal(
    getProjectCostTotal([first, second, other], first.projectKey, {
      currentSessionId: first.id,
      currentSessionCost: 1.5,
    }),
    2.25,
  );

  // Without a live value the viewed session keeps its list cost.
  assert.equal(
    getProjectCostTotal([first, second, other], first.projectKey, { currentSessionId: first.id }),
    2,
  );

  // A zero live cost is authoritative and replaces the stale list cost.
  assert.equal(
    getProjectCostTotal([first, second, other], first.projectKey, { currentSessionId: first.id, currentSessionCost: 0 }),
    0.75,
  );

  // Sessions without a cost field contribute zero.
  assert.equal(getProjectCostTotal([free], free.projectKey), 0);
});
