import { API_BASE } from "./config";

const BASE = API_BASE;

// Demo mode flag — set by DemoProvider, checked by mutation methods
let _demoMode = false;
export function setDemoMode(enabled: boolean) {
  _demoMode = enabled;
}
export function isDemoMode() {
  return _demoMode;
}

class DemoBlockedError extends Error {
  constructor() {
    super("Sign up to use this feature");
    this.name = "DemoBlockedError";
  }
}

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

function guardDemo(): void {
  if (_demoMode) throw new DemoBlockedError();
}

// Build query string supporting duplicate keys (e.g. created_at=gte.X&created_at=lte.Y)
export function buildParams(entries: [string, string][]): string {
  const sp = new URLSearchParams();
  for (const [k, v] of entries) {
    if (v) sp.append(k, v);
  }
  return sp.toString();
}

// REST helpers
export const api = {
  get: <T>(path: string) => request<T>(path),
  head: async (path: string): Promise<number> => {
    const res = await fetch(`${BASE}${path}`, {
      method: "HEAD",
      credentials: "include",
    });
    const range = res.headers.get("Content-Range") ?? "";
    const match = range.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  },
  post: <T>(path: string, body?: unknown) => {
    guardDemo();
    return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
  },
  patch: <T>(path: string, body: unknown) => {
    guardDemo();
    return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  },
  delete: <T>(path: string) => {
    guardDemo();
    return request<T>(path, { method: "DELETE" });
  },

  // RPC calls go to /api/rpc/<method> (read-only RPCs, no guard)
  rpc: <T>(method: string, params: Record<string, unknown> = {}) =>
    request<T>(`/api/rpc/${method}`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

// Related entries (vector similarity)
export const related = {
  forThought: (id: string) => api.get<RelatedEntry[]>(`/api/thoughts/${id}/related`),
  forDecision: (id: string) => api.get<RelatedEntry[]>(`/api/decisions/${id}/related`),
};

// Account deletion (GDPR right-to-erasure)
export async function deleteAccount(): Promise<void> {
  guardDemo();
  await request<void>("/api/account", {
    method: "DELETE",
    body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }),
  });
}

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
  createApiKey: (name: string, scope?: string, expiresAt?: string) =>
    api.post<ApiKey & { key: string }>("/auth/api-keys", { name, scope, expires_at: expiresAt }),
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
  scope: string;
  expires_at: string | null;
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
  approved_at?: string;
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
  access_count?: number;
  last_accessed_at?: string | null;
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

export interface Project {
  id: string;
  name: string;
  description: string | null;
  repo_url: string | null;
  visibility: string;
  created_at: string;
  updated_at?: string;
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

export interface RelatedEntry {
  id: string;
  content?: string;
  title?: string;
  type: string;
  created_at: string;
  similarity: number;
}

export interface TimelineEntry {
  type: "thought" | "decision" | "session" | "sentiment" | "handoff" | "conversation";
  id: string;
  created_at: string;
  content?: string;
  title?: string;
  subtype?: string;
  project_name?: string;
  mood_start?: string;
  mood_end?: string;
  summary?: string;
  thought_type?: string;
  tags?: string[];
}

// Reminder types
export interface Reminder {
  id: string;
  user_id: string;
  project_id: string | null;
  content: string;
  due_at: string;
  completed_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export const reminders = {
  list: (params?: { status?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.limit) sp.set("limit", String(params.limit));
    return api.get<Reminder[]>(`/api/reminders?${sp}`);
  },
  create: (data: { content: string; due_at: string; project_id?: string }) =>
    api.post<Reminder>("/api/reminders", data),
  complete: (id: string) =>
    api.patch<{ success: boolean }>(`/api/reminders/${id}`, { action: "complete" }),
  dismiss: (id: string) =>
    api.patch<{ success: boolean }>(`/api/reminders/${id}`, { action: "dismiss" }),
  delete: (id: string) => api.delete<void>(`/api/reminders/${id}`),
};

// Team types
export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  my_role?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface TeamStats {
  members: number;
  thoughts: number;
  decisions: number;
  sessions: number;
  member_activity: Array<{
    user_id: string;
    name: string;
    avatar_url: string | null;
    role: string;
    thoughts: number;
    decisions: number;
    sessions: number;
    last_active: string;
  }>;
}

export interface TeamFeedItem {
  id: string;
  type: "thought" | "decision" | "session";
  content: string | null;
  title: string | null;
  thought_type: string | null;
  tags?: string[];
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}

export interface TeamCoaching {
  productivity_score: number | null;
  highlights: string[];
  challenges: string[];
  suggestions: string[];
  collaboration_patterns: string[];
  period_days: number;
  member_count: number;
  generated_at: string;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

// Notifications API
export const notifications = {
  list: (params?: { unread?: boolean; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.unread) sp.set("unread", "true");
    if (params?.limit) sp.set("limit", String(params.limit));
    return api.get<NotificationsResponse>(`/api/notifications?${sp}`);
  },
  markRead: (id: string) =>
    api.patch<void>(`/api/notifications/${id}/read`, {}),
  markAllRead: () => api.post<void>("/api/notifications/read-all"),
};

// Teams API
export const teams = {
  list: () => api.get<Team[]>("/api/teams"),
  get: (id: string) => api.get<TeamDetail>(`/api/teams/${id}`),
  create: (data: { name: string; slug: string; description?: string }) =>
    api.post<Team>("/api/teams", data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<void>(`/api/teams/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/teams/${id}`),
  removeMember: (teamId: string, userId: string) =>
    api.delete<void>(`/api/teams/${teamId}/members/${userId}`),
  listInvites: (teamId: string) =>
    api.get<TeamInvite[]>(`/api/teams/${teamId}/invites`),
  createInvite: (teamId: string, data: { email: string; role?: string }) =>
    api.post<TeamInvite>(`/api/teams/${teamId}/invites`, data),
  cancelInvite: (teamId: string, inviteId: string) =>
    api.delete<void>(`/api/teams/${teamId}/invites/${inviteId}`),
  getStats: (teamId: string) =>
    api.get<TeamStats>(`/api/teams/${teamId}/stats`),
  getFeed: (teamId: string, limit = 50) =>
    api.get<TeamFeedItem[]>(`/api/teams/${teamId}/feed?limit=${limit}`),
  getCoaching: (teamId: string, days = 7) =>
    api.get<TeamCoaching>(`/api/teams/${teamId}/coaching?days=${days}`),
};

// GitHub types
export interface GitHubRepo {
  id: string;
  user_id: string;
  owner: string;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface GitHubActivity {
  id: string;
  repo_id: string;
  activity_type: "commit" | "pull_request" | "issue";
  github_id: string;
  title: string;
  body: string;
  author_login: string;
  author_avatar: string | null;
  state: string | null;
  html_url: string;
  created_at: string;
  imported_at: string;
  thought_id: string | null;
  repo_full_name: string;
  repo_owner: string;
  repo_name: string;
}

// GitHub API helpers
export const github = {
  listRepos: () => api.get<GitHubRepo[]>("/api/github/repos"),
  linkRepo: (owner: string, name: string) =>
    api.post<GitHubRepo>("/api/github/repos", { owner, name }),
  unlinkRepo: (id: string) => api.delete(`/api/github/repos/${id}`),
  syncRepo: (id: string) =>
    api.post<{ success: boolean; synced: { commits: number; pull_requests: number; issues: number } }>(
      `/api/github/repos/${id}/sync`
    ),
  listActivity: (params?: { type?: string; repo_id?: string; since?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set("type", params.type);
    if (params?.repo_id) sp.set("repo_id", params.repo_id);
    if (params?.since) sp.set("since", params.since);
    if (params?.limit) sp.set("limit", String(params.limit));
    return api.get<GitHubActivity[]>(`/api/github/activity?${sp}`);
  },
};

// Admin types
export interface AdminStats {
  totals: { users: number; thoughts: number; decisions: number; sessions: number; api_keys: number }
  daily_activity: Array<{ date: string; thoughts: number; decisions: number; sessions: number }>
  top_users: Array<{ id: string; name: string; email: string; system_role: string; thought_count: number; decision_count: number; session_count: number }>
}

export interface AdminUser {
  id: string; name: string; email: string; avatar: string | null; system_role: string
  approved_at: string | null; created_at: string; thought_count: number; session_count: number
}

export interface AdminUserDetail extends AdminUser {
  counts: Record<string, number>
}

export const admin = {
  getStats: () => request<AdminStats>('/api/admin/stats'),
  getUsers: (params?: { limit?: number; offset?: number; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    if (params?.search) qs.set('search', params.search)
    return request<{ users: AdminUser[]; total: number }>(`/api/admin/users?${qs}`)
  },
  getUser: (id: string) => request<AdminUserDetail>(`/api/admin/users/${id}`),
  updateRole: (id: string, system_role: string) => request<void>(`/api/admin/users/${id}`, {
    method: 'PATCH', body: JSON.stringify({ system_role }),
  }),
  approveUser: (id: string) => request<void>(`/api/admin/users/${id}/approve`, { method: 'POST' }),
}

// Cross-project insights
export interface CrossProjectInsights {
  period_days: number;
  decision_patterns: Array<{
    title: string;
    count: number;
    projects: string;
    choices: string;
  }>;
  common_blockers: Array<{
    content: string;
    count: number;
    projects: string;
  }>;
  sentiment_trends: Array<{
    target_name: string;
    target_type: string;
    feeling: string;
    count: number;
    avg_intensity: number;
    projects: string;
  }>;
  project_activity: Array<{
    name: string;
    id: string;
    thoughts: number;
    decisions: number;
    sessions: number;
  }>;
}
