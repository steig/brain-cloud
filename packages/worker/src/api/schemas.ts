import { z } from 'zod'

// --- Thought schemas ---

export const createThoughtSchema = z.object({
  content: z.string().min(1, 'content is required'),
  type: z.enum(['note', 'idea', 'question', 'todo', 'insight']).optional(),
  visibility: z.enum(['private', 'team', 'public']).optional(),
  machine_id: z.string().optional(),
  project_id: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  ai_model: z.string().optional(),
})

export const updateThoughtSchema = z.object({
  content: z.string().min(1).optional(),
  type: z.enum(['note', 'idea', 'question', 'todo', 'insight']).optional(),
  tags: z.array(z.string()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

// --- Decision schemas ---

export const createDecisionSchema = z.object({
  title: z.string().min(1, 'title is required'),
  context: z.string().optional(),
  options: z.array(z.object({
    option: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
  })).optional(),
  chosen: z.string().optional(),
  rationale: z.string().optional(),
  outcome: z.string().optional(),
  tags: z.array(z.string()).optional(),
  machine_id: z.string().optional(),
  project_id: z.string().nullable().optional(),
  ai_model: z.string().optional(),
})

export const updateDecisionSchema = z.object({
  outcome: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// --- Session schemas ---

export const createSessionSchema = z.object({
  machine_id: z.string().optional(),
  project_id: z.string().nullable().optional(),
  mood_start: z.string().optional(),
  goals: z.array(z.string()).optional(),
  ai_model: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateSessionSchema = z.object({
  ended_at: z.string().optional(),
  mood_end: z.string().optional(),
  accomplishments: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
  summary: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// --- Sentiment schemas ---

export const createSentimentSchema = z.object({
  target_type: z.string().min(1, 'target_type is required'),
  target_name: z.string().min(1, 'target_name is required'),
  feeling: z.string().min(1, 'feeling is required'),
  intensity: z.number().int().min(1).max(5).optional(),
  reason: z.string().optional(),
  project_id: z.string().nullable().optional(),
  ai_model: z.string().optional(),
})

// --- Handoff schemas ---

export const createHandoffSchema = z.object({
  to_project: z.string().min(1, 'to_project is required'),
  from_project: z.string().optional(),
  handoff_type: z.enum(['context', 'decision', 'blocker', 'task']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  message: z.string().min(1, 'message is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const claimHandoffSchema = z.object({
  note: z.string().optional(),
})

// --- Analytics RPC schemas ---

export const dateRangeSchema = z.object({
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

export const dateRangeRequiredSchema = z.object({
  from_date: z.string(),
  to_date: z.string(),
})

export const brainSummarySchema = z.object({
  p_from_date: z.string(),
  p_to_date: z.string(),
  p_project_id: z.string().nullable().optional(),
})

export const searchBrainSchema = z.object({
  query: z.string().min(1, 'query is required'),
  limit_rows: z.number().int().positive().optional(),
})

export const timelineSchema = z.object({
  from_date: z.string(),
  to_date: z.string(),
  limit_rows: z.number().int().positive().optional(),
})

export const registerMachineSchema = z.object({
  p_hostname: z.string().min(1),
  p_os: z.string().optional(),
  p_arch: z.string().optional(),
  p_metadata: z.record(z.string(), z.unknown()).optional(),
})

export const registerProjectSchema = z.object({
  p_name: z.string().min(1),
  p_repo_url: z.string().optional(),
  p_description: z.string().optional(),
  p_metadata: z.record(z.string(), z.unknown()).optional(),
})

export const coachingDailyDataSchema = z.object({
  p_days: z.number().int().positive().optional(),
})

export const decisionReviewSchema = z.object({
  decision_id: z.string().min(1, 'decision_id is required'),
  review_type: z.string().optional(),
  outcome_rating: z.number().int().min(1).max(5).optional(),
  outcome_notes: z.string().optional(),
  lessons_learned: z.string().optional(),
  would_decide_same: z.boolean().optional(),
  follow_up_days: z.number().int().positive().optional(),
})

export const conversationSchema = z.object({
  prompt_text: z.string().min(1, 'prompt_text is required'),
  machine_id: z.string().optional(),
  project_id: z.string().nullable().optional(),
  session_id: z.string().optional(),
  ai_model: z.string().optional(),
  response_summary: z.string().optional(),
  turns: z.number().int().positive().optional(),
  prompt_tokens: z.number().int().nonnegative().optional(),
  response_tokens: z.number().int().nonnegative().optional(),
  goal_achieved: z.boolean().optional(),
  context_sufficient: z.boolean().optional(),
  quality_score: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
})

export const learningCurveSchema = z.object({
  p_weeks: z.number().int().positive().optional(),
})

// --- Team schemas ---

export const createTeamSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  slug: z.string().min(1, 'slug is required').max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
})

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

export const addMemberSchema = z.object({
  user_id: z.string().min(1, 'user_id is required'),
  role: z.enum(['member', 'admin']).optional(),
})

export const createInviteSchema = z.object({
  email: z.string().email('valid email is required'),
  role: z.enum(['member', 'admin']).optional(),
})

// --- Shared query param schemas ---

export const limitSchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).optional(),
})

// --- Helper ---

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown):
  { success: true; data: T } | { success: false; error: string; details: z.ZodIssue[] } {
  const result = schema.safeParse(body)
  if (result.success) return { success: true, data: result.data }
  return {
    success: false,
    error: 'Validation failed',
    details: result.error.issues,
  }
}
