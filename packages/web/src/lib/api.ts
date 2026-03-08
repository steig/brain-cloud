import { API_BASE } from "./config";

const BASE = API_BASE;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Try refresh
    const refreshRes = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshRes.ok) {
      // Retry original request
      const retryRes = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      if (!retryRes.ok) throw new ApiError(retryRes.status, await retryRes.text());
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// REST helpers
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  // RPC calls go to /api/rpc/<method>
  rpc: <T>(method: string, params: Record<string, unknown> = {}) =>
    request<T>(`/api/rpc/${method}`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

// Auth helpers
export const auth = {
  me: () => api.get<AuthUser>("/auth/me"),
  providers: () => api.get<{ providers: string[] }>("/auth/providers"),
  logout: () => api.post("/auth/logout"),
  // Legacy single-key (kept for backward compat)
  generateApiKey: () => api.post<{ api_key: string }>("/auth/api-key"),
  revokeApiKey: () => api.delete("/auth/api-key"),
  // Multi-key management
  listApiKeys: () => api.get<ApiKey[]>("/auth/api-keys"),
  createApiKey: (name: string) =>
    api.post<ApiKey & { key: string }>("/auth/api-keys", { name }),
  revokeApiKeyById: (id: string) => api.delete(`/auth/api-keys/${id}`),
  testApiKey: async (key: string): Promise<boolean> => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { "X-API-Key": key },
    });
    return res.ok;
  },
};

// API Key type
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: number;
}

// Types matching the worker API
export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  system_role: string;
  api_key?: string;
  teams?: Array<{ id: string; name: string; role: string }>;
}

export interface Thought {
  id: string;
  user_id: string;
  type: "note" | "idea" | "question" | "todo" | "insight";
  content: string;
  context?: Record<string, unknown>;
  tags?: string[];
  ai_model?: string;
  visibility?: string;
  project_id?: string;
  project_name?: string;
  created_at: string;
}

export interface Decision {
  id: string;
  user_id: string;
  title: string;
  context?: string;
  options?: Array<{ option: string; pros: string[]; cons: string[] }>;
  chosen?: string;
  rationale?: string;
  outcome?: string;
  tags?: string[];
  project_id?: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  mood_start?: string;
  mood_end?: string;
  goals?: string[];
  accomplishments?: string[];
  blockers?: string[];
  summary?: string;
  metadata?: Record<string, unknown>;
  ai_model?: string;
  project_id?: string;
  project_name?: string;
  scores?: SessionScore;
}

export interface SessionScore {
  productivity_score: number;
  sentiment_score: number;
  flow_score: number;
  overall_score: number;
}

export interface Sentiment {
  id: string;
  user_id: string;
  target_type: string;
  target_name: string;
  feeling: string;
  intensity: number;
  reason?: string;
  project_id?: string;
  created_at: string;
}

export interface DxEvent {
  id: string;
  event_type: string;
  command?: string;
  duration_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  success: boolean;
  created_at: string;
}

export interface DxCost {
  date: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  request_count: number;
}

export interface Handoff {
  id: string;
  user_id: string;
  from_project: string | null;
  to_project: string;
  handoff_type: "context" | "decision" | "blocker" | "task";
  priority: "low" | "medium" | "high" | "urgent";
  message: string;
  metadata?: Record<string, unknown>;
  status: "pending" | "claimed" | "resolved";
  claimed_at: string | null;
  claim_note: string | null;
  created_at: string;
}

export interface DecisionReview {
  id: string;
  decision_id: string;
  user_id: string;
  review_type: string;
  outcome_rating: number | null;
  outcome_notes: string | null;
  lessons_learned: string | null;
  would_decide_same: boolean | null;
  follow_up_days: number | null;
  next_review_at: string | null;
  created_at: string;
  decision_title: string;
  decision_chosen: string | null;
}

export interface ReviewStats {
  total_reviews: number;
  avg_rating: number;
  would_repeat: number;
  positive_outcomes: number;
  total_decisions: number;
  reviewed_decisions: number;
  rating_distribution: Array<{ rating: number; count: number }>;
}

export interface BrainSummary {
  stats: {
    total_thoughts: number;
    total_decisions: number;
    total_sessions: number;
    active_days: number;
    total_session_minutes: number;
    thoughts_by_type: Record<string, number>;
  };
  themes: Array<{ tag: string; cnt: number }>;
  decisions: Array<{
    title: string;
    chosen: string;
    rationale: string;
    date: string;
    tags: string[];
  }>;
  insights: Array<{
    content: string;
    date: string;
    tags: string[];
  }>;
  accomplishments: Array<{ content: string; date: string }>;
  blockers: Array<{ content: string; date: string }>;
}

export interface CoachingData {
  sessions: {
    total: number;
    completed: number;
    with_accomplishments: number;
    with_blockers: number;
  };
  thoughts: {
    total: number;
    insights: number;
    todos: number;
    ideas: number;
  };
  decisions: {
    total: number;
    with_outcome: number;
  };
  sentiment: Array<{ feeling: string; count: number }>;
  conversations: {
    total: number;
    avg_quality: number | null;
    goal_rate: number | null;
    context_rate: number | null;
  };
}

export interface PromptQualityStats {
  total: number;
  avg_quality: number | null;
  goal_rate: number | null;
  context_rate: number | null;
  avg_turns: number | null;
}

export interface LearningWeek {
  week: string;
  total_conversations: number;
  avg_quality: number | null;
  goal_rate: number | null;
}

export interface TimelineEntry {
  type: "thought" | "decision" | "session";
  id: string;
  created_at: string;
  content?: string;
  title?: string;
  mood_start?: string;
  mood_end?: string;
  summary?: string;
  thought_type?: string;
  tags?: string[];
}
