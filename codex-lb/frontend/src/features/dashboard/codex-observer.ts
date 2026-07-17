import { z } from "zod";

export const CodexObserverSnapshotSchema = z.object({
  revision: z.string(),
  observedAt: z.string(),
  connected: z.boolean(),
  projects: z.array(z.object({ projectId: z.string(), path: z.string(), label: z.string(), removed: z.boolean().optional(), removalAuthoritative: z.boolean().optional() })).default([]),
  threads: z.array(z.object({ id: z.string(), cwd: z.string(), title: z.string(), state: z.enum(["active", "archived", "deleted"]), createdAt: z.string(), updatedAt: z.string() })).default([]),
  stations: z.array(z.object({ integrationId: z.string(), kind: z.enum(["mcp", "plugin", "ci", "tool"]), displayName: z.string(), status: z.enum(["configured", "active", "healthy", "degraded", "offline"]) })).default([]),
  pulsars: z.array(z.object({ automationId: z.string(), displayName: z.string(), schedule: z.string(), status: z.enum(["healthy", "running", "failed", "paused", "removed"]), projectId: z.string().nullable().optional(), workspaceRoot: z.string().nullable().optional() })).default([]),
});

export type CodexObserverSnapshot = z.infer<typeof CodexObserverSnapshotSchema>;

export async function getCodexObserverSnapshot() {
  const response = await fetch("/api/codex-observer/snapshot");
  if (!response.ok) throw new Error("Codex observer is unavailable");
  return CodexObserverSnapshotSchema.parse(await response.json());
}
