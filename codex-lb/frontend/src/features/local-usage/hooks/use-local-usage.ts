import { useQuery } from "@tanstack/react-query";

import { getLocalActivity, getLocalQuota, getLocalSession, getLocalSessions, getLocalStats, getLocalUsage, type LocalTool } from "../api";

export function useLocalActivity() {
  return useQuery({
    queryKey: ["local-usage", "activity"],
    queryFn: getLocalActivity,
    refetchInterval: 2_000,
  });
}

export function useLocalUsage(period: string) {
  return useQuery({
    queryKey: ["local-usage", "summary", period],
    queryFn: () => getLocalUsage(period),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useLocalSessions(tool: LocalTool, period: string) {
  return useQuery({
    queryKey: ["local-usage", "sessions", tool, period],
    queryFn: () => getLocalSessions(tool, period),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useLocalSession(tool: LocalTool, sessionId: string | null) {
  return useQuery({
    queryKey: ["local-usage", "session", tool, sessionId],
    queryFn: () => getLocalSession(tool, sessionId!),
    enabled: Boolean(sessionId),
  });
}

export function useLocalStats(year: number) {
  return useQuery({
    queryKey: ["local-usage", "stats", year],
    queryFn: () => getLocalStats(year),
    staleTime: 60_000,
  });
}

export function useLocalQuota() {
  return useQuery({
    queryKey: ["local-usage", "quota"],
    queryFn: getLocalQuota,
    staleTime: 30_000,
  });
}
