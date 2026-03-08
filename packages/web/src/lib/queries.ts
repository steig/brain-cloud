import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  api,
  auth,
  admin,
  deleteAccount,
  github,
  related,
  teams as teamsApi,
  notifications as notificationsApi,
  type AuthUser,
  type ApiKey,
  type Thought,
  type Decision,
  type Session,
  type Sentiment,
  type Handoff,
  type TimelineEntry,
  type DxCost,
  type DecisionReview,
  type ReviewStats,
  type BrainSummary,
  type CoachingData,
  type PromptQualityStats,
  type LearningWeek,
  type GitHubRepo,
  type GitHubActivity,
  type RelatedEntry,
  type Team,
  type TeamDetail,
  type TeamInvite,
  type TeamStats,
  type TeamFeedItem,
  type TeamCoaching,
  type NotificationsResponse,
  type Project,
  type CrossProjectInsights,
} from "./api";

// Auth
export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: auth.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: auth.providers,
    staleTime: Infinity,
  });
}

// API Keys
export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: auth.listApiKeys,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, scope, expiresAt }: { name: string; scope?: string; expiresAt?: string }) =>
      auth.createApiKey(name, scope, expiresAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => auth.revokeApiKeyById(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

// Account Deletion
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      qc.clear();
    },
  });
}

// Thoughts
export function useThoughts(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: ["thoughts", params],
    queryFn: () => api.get<Thought[]>(`/api/thoughts?${searchParams}`),
  });
}

export function useCreateThought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Thought>) =>
      api.post<Thought>("/api/thoughts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thoughts"] }),
  });
}

export function useUpdateThought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Thought> & { id: string }) =>
      api.patch<void>(`/api/thoughts?id=eq.${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thoughts"] }),
  });
}

export function useDeleteThought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/thoughts?id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thoughts"] }),
  });
}

// Decisions
export function useDecisions(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: ["decisions", params],
    queryFn: () => api.get<Decision[]>(`/api/decisions?${searchParams}`),
  });
}

export function useCreateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Decision>) =>
      api.post<Decision>("/api/decisions", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });
}

export function useUpdateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Decision> & { id: string }) =>
      api.patch<void>(`/api/decisions?id=eq.${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });
}

// Sessions
export function useSessions(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: ["sessions", params],
    queryFn: () => api.get<Session[]>(`/api/sessions?${searchParams}`),
  });
}

// Sentiment
export function useSentiment(params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return useQuery({
    queryKey: ["sentiment", params],
    queryFn: () => api.get<Sentiment[]>(`/api/sentiment?${searchParams}`),
  });
}

export function useCreateSentiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Sentiment>) =>
      api.post<Sentiment>("/api/sentiment", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sentiment"] }),
  });
}

// Timeline (RPC)
export function useTimeline(days = 7) {
  return useQuery({
    queryKey: ["timeline", days],
    queryFn: () => api.rpc<TimelineEntry[]>("timeline", { days }),
  });
}

// Analytics (RPC)
export function useDxSummary(days = 30) {
  return useQuery({
    queryKey: ["dx-summary", days],
    queryFn: () => api.rpc<Record<string, unknown>>("dx_summary", { days }),
  });
}

export function useDxCosts(days = 30) {
  return useQuery({
    queryKey: ["dx-costs", days],
    queryFn: () => api.get<DxCost[]>(`/api/dx_costs?days=${days}`),
  });
}

export function useDecisionAccuracy(days = 90) {
  return useQuery({
    queryKey: ["decision-accuracy", days],
    queryFn: () =>
      api.rpc<Record<string, unknown>>("decision_accuracy", { days }),
  });
}

export function useLearningCurve(weeks = 12) {
  return useQuery({
    queryKey: ["learning-curve", weeks],
    queryFn: () =>
      api.rpc<Record<string, unknown>>("learning_curve", { weeks }),
  });
}

export function usePromptQuality(days = 30) {
  return useQuery({
    queryKey: ["prompt-quality", days],
    queryFn: () =>
      api.rpc<Record<string, unknown>>("prompt_quality_stats", { days }),
  });
}

export function useBrainSummary(fromDate: string, toDate: string, projectId?: string) {
  return useQuery({
    queryKey: ["brain-summary", fromDate, toDate, projectId],
    queryFn: () =>
      api.rpc<BrainSummary>("brain_summary", {
        p_from_date: fromDate,
        p_to_date: toDate,
        ...(projectId ? { p_project_id: projectId } : {}),
      }),
  });
}

export function useCoachingData(days = 7) {
  return useQuery({
    queryKey: ["coaching-data", days],
    queryFn: () => api.rpc<CoachingData>("coaching_daily_data", { p_days: days }),
  });
}

// Handoffs
export function useHandoffs(params?: { to_project?: string; status?: string }) {
  const searchParams = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v) as [string, string][]
  );
  return useQuery({
    queryKey: ["handoffs", params],
    queryFn: () => api.get<Handoff[]>(`/api/handoffs?${searchParams}`),
  });
}

export function useCreateHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      to_project: string;
      message: string;
      handoff_type?: string;
      priority?: string;
      metadata?: Record<string, unknown>;
    }) => api.post<Handoff>("/api/handoffs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["handoffs"] }),
  });
}

export function useClaimHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.patch<{ success: boolean }>(`/api/handoffs/${id}/claim`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["handoffs"] }),
  });
}

// Decision Reviews
export function useDecisionReviews() {
  return useQuery({
    queryKey: ["decision-reviews"],
    queryFn: () => api.get<DecisionReview[]>("/api/decisions/reviews"),
  });
}

export function useDecisionsNeedingReview() {
  return useQuery({
    queryKey: ["decisions-needing-review"],
    queryFn: () => api.get<Decision[]>("/api/decisions/needing-review"),
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: ["review-stats"],
    queryFn: () => api.get<ReviewStats>("/api/decisions/review-stats"),
  });
}

export function useCreateDecisionReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      decision_id: string;
      outcome_rating?: number;
      outcome_notes?: string;
      lessons_learned?: string;
      would_decide_same?: boolean;
    }) => api.post<{ id: string }>("/api/decisions/reviews", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decision-reviews"] });
      qc.invalidateQueries({ queryKey: ["decisions-needing-review"] });
      qc.invalidateQueries({ queryKey: ["review-stats"] });
    },
  });
}

// Projects
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/api/projects"),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; repo_url?: string; visibility?: string }) =>
      api.patch<Project>(`/api/projects/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", vars.id] });
    },
  });
}

// GitHub
export function useGitHubRepos() {
  return useQuery({
    queryKey: ["github-repos"],
    queryFn: github.listRepos,
  });
}

export function useLinkGitHubRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ owner, name }: { owner: string; name: string }) =>
      github.linkRepo(owner, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["github-repos"] }),
  });
}

export function useUnlinkGitHubRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => github.unlinkRepo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github-repos"] });
      qc.invalidateQueries({ queryKey: ["github-activity"] });
    },
  });
}

export function useSyncGitHubRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => github.syncRepo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github-repos"] });
      qc.invalidateQueries({ queryKey: ["github-activity"] });
    },
  });
}

export function useGitHubActivity(params?: {
  type?: string;
  repo_id?: string;
  since?: string;
}) {
  return useQuery({
    queryKey: ["github-activity", params],
    queryFn: () => github.listActivity(params),
  });
}

// Related entries (vector similarity)
export function useRelatedThoughts(id: string | undefined) {
  return useQuery({
    queryKey: ["thoughts", id, "related"],
    queryFn: () => related.forThought(id!),
    enabled: !!id,
  });
}

export function useRelatedDecisions(id: string | undefined) {
  return useQuery({
    queryKey: ["decisions", id, "related"],
    queryFn: () => related.forDecision(id!),
    enabled: !!id,
  });
}

// Teams
export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: teamsApi.list,
  });
}

export function useTeam(id: string | null) {
  return useQuery({
    queryKey: ["teams", id],
    queryFn: () => teamsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      teamsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      teamsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamsApi.removeMember(teamId, userId),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["teams", vars.teamId] }),
  });
}

export function useTeamInvites(teamId: string | null) {
  return useQuery({
    queryKey: ["team-invites", teamId],
    queryFn: () => teamsApi.listInvites(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateTeamInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, ...data }: { teamId: string; email: string; role?: string }) =>
      teamsApi.createInvite(teamId, data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["team-invites", vars.teamId] }),
  });
}

export function useCancelTeamInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, inviteId }: { teamId: string; inviteId: string }) =>
      teamsApi.cancelInvite(teamId, inviteId),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["team-invites", vars.teamId] }),
  });
}

export function useTeamStats(teamId: string | null) {
  return useQuery({
    queryKey: ["team-stats", teamId],
    queryFn: () => teamsApi.getStats(teamId!),
    enabled: !!teamId,
  });
}

export function useTeamFeed(teamId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["team-feed", teamId, limit],
    queryFn: () => teamsApi.getFeed(teamId!, limit),
    enabled: !!teamId,
  });
}

// Team Coaching
export function useTeamCoaching(teamId: string | null, days = 7) {
  return useQuery({
    queryKey: ["team-coaching", teamId, days],
    queryFn: () => teamsApi.getCoaching(teamId!, days),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
}

// Notifications
export function useNotifications(params?: { unread?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => notificationsApi.list(params),
    refetchInterval: 60 * 1000, // Poll every 60s
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// Admin
export function useAdminStats() {
  return useQuery({ queryKey: ['admin-stats'], queryFn: admin.getStats })
}

export function useAdminUsers(search?: string, page = 0) {
  return useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => admin.getUsers({ search, offset: page * 50, limit: 50 }),
  })
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => admin.getUser(id!),
    enabled: !!id,
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, system_role }: { id: string; system_role: string }) =>
      admin.updateRole(id, system_role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-user'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

// Cross-project insights
export function useCrossProjectInsights(days: number = 30) {
  return useQuery({
    queryKey: ["cross-project-insights", days],
    queryFn: () => api.get<CrossProjectInsights>(`/api/insights/cross-project?days=${days}`),
  });
}
