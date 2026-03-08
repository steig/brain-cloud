import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  api,
  auth,
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
    mutationFn: (name: string) => auth.createApiKey(name),
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
    queryFn: () =>
      api.get<Array<{ id: string; name: string }>>("/api/projects"),
  });
}
