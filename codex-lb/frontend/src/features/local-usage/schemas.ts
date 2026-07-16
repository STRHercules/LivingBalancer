import { z } from "zod";

const ModelUsageSchema = z.looseObject({
  name: z.string(),
  tokens: z.number().default(0),
  tokens_in: z.number().default(0),
  tokens_out: z.number().default(0),
  tokens_cache: z.number().default(0),
  cost: z.number().default(0),
  messages: z.number().default(0),
});

export const AppUsageSchema = z.looseObject({
  tokens: z.number().default(0),
  tokens_in: z.number().default(0),
  tokens_out: z.number().default(0),
  tokens_cache: z.number().default(0),
  cost: z.number().default(0),
  messages: z.number().default(0),
  models: z.array(ModelUsageSchema).default([]),
});

export const LocalUsageSchema = z.looseObject({
  total_tokens: z.number().default(0),
  total_cost: z.number().default(0),
  total_messages: z.number().default(0),
  apps: z.record(z.string(), AppUsageSchema).default({}),
  coding_apps: z.record(z.string(), AppUsageSchema).default({}),
  combined_models: z.array(ModelUsageSchema).default([]),
  comparison: z.looseObject({
    tokens_pct: z.number().nullable().optional(),
    cost_pct: z.number().nullable().optional(),
    messages_pct: z.number().nullable().optional(),
  }).optional(),
});

export const LocalSessionSchema = z.looseObject({
  tool: z.string().default("codex"),
  session_id: z.string(),
  display_name: z.string().optional(),
  project: z.string().default("unknown"),
  project_id: z.string().nullable().optional(),
  model: z.string().default("unknown"),
  token_events: z.number().default(0),
  tokens_in: z.number().default(0),
  tokens_out: z.number().default(0),
  tokens_cache: z.number().default(0),
  tokens_reasoning: z.number().default(0),
  tokens: z.number().default(0),
  cache_ratio: z.number().default(0),
  cost: z.number().default(0),
  started_at: z.string().nullable().optional(),
  last_seen_at: z.string(),
});

export const LocalSessionsSchema = z.looseObject({
  tool: z.string(),
  tool_label: z.string(),
  latest_session: LocalSessionSchema.nullable(),
  sessions: z.array(LocalSessionSchema),
  summary: z.looseObject({ session_count: z.number(), tokens: z.number(), cost: z.number() }),
});

export const LocalSessionDetailSchema = z.looseObject({
  session: LocalSessionSchema,
  turns: z.array(z.looseObject({
    turn_index: z.number(),
    model: z.string(),
    tokens_in: z.number().default(0),
    tokens_out: z.number().default(0),
    tokens_cache: z.number().default(0),
    tokens_reasoning: z.number().default(0),
    tokens: z.number().default(0),
    cost: z.number().default(0),
    timestamp: z.string(),
  })),
});

export const LocalStatsSchema = z.looseObject({
  summary: z.looseObject({
    totalTokens: z.number().default(0),
    totalCost: z.number().default(0),
    activeDays: z.number().default(0),
    totalDays: z.number().default(0),
  }),
  stats: z.looseObject({
    favorite_model: z.string().default("N/A"),
    sessions: z.number().default(0),
  }),
  contributions: z.array(z.looseObject({
    date: z.string(),
    intensity: z.number().default(0),
    totals: z.looseObject({ tokens: z.number(), cost: z.number(), messages: z.number() }),
  })),
});

const QuotaBucketSchema = z.looseObject({
  bucket: z.string(),
  bucket_label: z.string(),
  used_percent: z.number(),
  resets_at: z.number().nullable().optional(),
});

export const LocalQuotaSchema = z.looseObject({
  enabled: z.boolean().default(true),
  providers: z.record(z.string(), z.looseObject({
    plan: z.string().nullable().optional(),
    buckets: z.array(QuotaBucketSchema).default([]),
  })).default({}),
});

const LocalActivityEventSchema = z.looseObject({
  id: z.string(),
  kind: z.enum(["thinking", "workflow", "tool", "search"]),
  label: z.string(),
  timestamp: z.string().nullable().optional(),
});

const LocalActivitySessionSchema = z.looseObject({
  session_id: z.string(),
  state: z.enum(["idle", "thinking", "workflow", "tool", "search"]).default("idle"),
  events: z.array(LocalActivityEventSchema).default([]),
});

export const LocalActivitySchema = z.looseObject({
  session_id: z.string().nullable(),
  state: z.enum(["idle", "thinking", "workflow", "tool", "search"]).default("idle"),
  events: z.array(LocalActivityEventSchema).default([]),
  sessions: z.array(LocalActivitySessionSchema).default([]),
});

export type LocalUsage = z.infer<typeof LocalUsageSchema>;
export type LocalSession = z.infer<typeof LocalSessionSchema>;
export type LocalSessions = z.infer<typeof LocalSessionsSchema>;
export type LocalStats = z.infer<typeof LocalStatsSchema>;
export type LocalQuota = z.infer<typeof LocalQuotaSchema>;
export type LocalActivity = z.infer<typeof LocalActivitySchema>;
