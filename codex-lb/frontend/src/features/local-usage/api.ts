import { get } from "@/lib/api-client";
import {
  LocalActivitySchema,
  LocalQuotaSchema,
  LocalSessionDetailSchema,
  LocalSessionsSchema,
  LocalStatsSchema,
  LocalUsageSchema,
} from "./schemas";

export const LOCAL_TOOLS = ["codex", "claude", "opencode", "pi_agent", "mimo"] as const;
export type LocalTool = (typeof LOCAL_TOOLS)[number];

export function getLocalUsage(period: string) {
  return get(`/api/local-usage/usage?period=${encodeURIComponent(period)}`, LocalUsageSchema);
}

export function getLocalSessions(tool: LocalTool, period: string) {
  return get(
    `/api/local-usage/sessions?tool=${encodeURIComponent(tool)}&period=${encodeURIComponent(period)}`,
    LocalSessionsSchema,
  );
}

export function getLocalSession(tool: LocalTool, sessionId: string) {
  return get(
    `/api/local-usage/session?tool=${encodeURIComponent(tool)}&session_id=${encodeURIComponent(sessionId)}`,
    LocalSessionDetailSchema,
  );
}

export function getLocalStats(year: number) {
  return get(`/api/local-usage/stats?year=${year}`, LocalStatsSchema);
}

export function getLocalQuota() {
  return get("/api/local-usage/quota", LocalQuotaSchema);
}

export function getLocalActivity() {
  return get("/api/local-usage/activity", LocalActivitySchema);
}
