import type {
  AuthUser,
  Thought,
  Decision,
  Session,
  Sentiment,
  TimelineEntry,
  BrainSummary,
  CoachingData,
  Project,
  Handoff,
  ApiKey,
  Team,
  TeamDetail,
  TeamStats,
  TeamFeedItem,
  TeamCoaching,
} from "@/lib/api";

const now = new Date();
function daysAgo(n: number, hours = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `d3m00000-0000-4000-a000-${hex}`;
}

export const DEMO_USER: AuthUser = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@brain-ai.dev",
  system_role: "user",
};

export const DEMO_PROJECTS: Project[] = [
  {
    id: uuid(100),
    name: "payment-service",
    description: "Stripe-based payment processing microservice",
    repo_url: null,
    visibility: "private",
    created_at: daysAgo(30),
  },
  {
    id: uuid(101),
    name: "frontend-redesign",
    description: "React 19 migration and design system overhaul",
    repo_url: null,
    visibility: "private",
    created_at: daysAgo(25),
  },
  {
    id: uuid(102),
    name: "infra-migration",
    description: "Moving from AWS to Cloudflare Workers",
    repo_url: null,
    visibility: "private",
    created_at: daysAgo(20),
  },
];

export const DEMO_THOUGHTS: Thought[] = [
  {
    id: uuid(1),
    user_id: "demo-user",
    type: "insight",
    content:
      "Stripe webhooks need idempotency keys stored in the DB — replaying a charge.succeeded event without checking creates duplicate credits. Added a webhook_events table with unique constraint on event_id.",
    tags: ["stripe", "learned", "payments"],
    project_name: "payment-service",
    created_at: daysAgo(0, 2),
  },
  {
    id: uuid(2),
    user_id: "demo-user",
    type: "todo",
    content:
      "Migrate auth from JWT to session cookies — JWTs are getting too large with team claims (2.4KB). Deferred: needs backend changes coordinated with mobile team.",
    tags: ["auth", "tech-debt"],
    project_name: "frontend-redesign",
    created_at: daysAgo(0, 6),
  },
  {
    id: uuid(3),
    user_id: "demo-user",
    type: "insight",
    content:
      "React 19 useOptimistic hook eliminates manual rollback state. Paired with server actions, the payment form now shows instant feedback. Reduced perceived latency from 800ms to ~50ms.",
    tags: ["react", "learned", "performance"],
    project_name: "frontend-redesign",
    created_at: daysAgo(1, 3),
  },
  {
    id: uuid(4),
    user_id: "demo-user",
    type: "note",
    content:
      "Cloudflare Workers have a 128MB memory limit. Our payment receipt PDF generation was hitting it with large invoices. Moved PDF gen to a separate queue consumer with stream processing.",
    tags: ["cloudflare", "architecture"],
    project_name: "infra-migration",
    created_at: daysAgo(1, 8),
  },
  {
    id: uuid(5),
    user_id: "demo-user",
    type: "idea",
    content:
      "Could use Durable Objects for real-time payment status updates instead of polling. Each checkout session gets a DO instance, clients subscribe via WebSocket. Worth prototyping.",
    tags: ["idea", "architecture", "real-time"],
    project_name: "payment-service",
    created_at: daysAgo(2, 1),
  },
  {
    id: uuid(6),
    user_id: "demo-user",
    type: "todo",
    content:
      "Add retry logic to Stripe API calls — seeing intermittent 429s during peak hours (5-7pm UTC). Need exponential backoff with jitter. Deferred: waiting for new rate limit headers in Stripe v2025-02.",
    tags: ["stripe", "reliability", "todo"],
    project_name: "payment-service",
    created_at: daysAgo(2, 5),
  },
  {
    id: uuid(7),
    user_id: "demo-user",
    type: "insight",
    content:
      "TanStack Query's placeholderData is better than initialData for SSR hydration — it doesn't affect cache staleness, so background refetches still happen. Saved us from stale data bugs on the pricing page.",
    tags: ["tanstack-query", "learned"],
    project_name: "frontend-redesign",
    created_at: daysAgo(3, 2),
  },
  {
    id: uuid(8),
    user_id: "demo-user",
    type: "note",
    content:
      "D1 batch inserts max 100 rows per statement. For the payment ledger migration, chunked 50K rows into batches of 100 wrapped in a transaction. Total migration took 4 minutes.",
    tags: ["d1", "migration"],
    project_name: "infra-migration",
    created_at: daysAgo(3, 7),
  },
  {
    id: uuid(9),
    user_id: "demo-user",
    type: "question",
    content:
      "Should we use Hono middleware or Cloudflare Worker bindings for rate limiting? Middleware is more portable, but bindings give us edge-level enforcement before code runs. Need to benchmark both.",
    tags: ["hono", "performance", "architecture"],
    project_name: "infra-migration",
    created_at: daysAgo(4, 4),
  },
  {
    id: uuid(10),
    user_id: "demo-user",
    type: "insight",
    content:
      "Payment dispute handling: Stripe's dispute.created webhook fires before charge.dispute.created. We were listening to the wrong event and missing the 7-day response window. Fixed by subscribing to both with dedup.",
    tags: ["stripe", "bug-fix", "learned"],
    project_name: "payment-service",
    created_at: daysAgo(4, 9),
  },
  {
    id: uuid(11),
    user_id: "demo-user",
    type: "todo",
    content:
      "Set up Cloudflare Analytics Engine for custom metrics — want to track p95 latency per route and payment success rates. Deferred: need to upgrade Workers plan first.",
    tags: ["observability", "todo"],
    project_name: "infra-migration",
    created_at: daysAgo(5, 3),
  },
  {
    id: uuid(12),
    user_id: "demo-user",
    type: "note",
    content:
      "Design system token migration complete. Moved from CSS custom properties to Tailwind config. 847 color references updated. The component library now has consistent dark mode support.",
    tags: ["design-system", "tailwind"],
    project_name: "frontend-redesign",
    created_at: daysAgo(5, 8),
  },
  {
    id: uuid(13),
    user_id: "demo-user",
    type: "insight",
    content:
      "Wrangler dev mode doesn't support D1 triggers. Spent 2 hours debugging why audit logs weren't being created locally. Production works fine — just a dev tooling gap.",
    tags: ["wrangler", "gotcha", "learned"],
    project_name: "infra-migration",
    created_at: daysAgo(6, 2),
  },
  {
    id: uuid(14),
    user_id: "demo-user",
    type: "note",
    content:
      "BLOCKER: Stripe Connect onboarding flow broken in Safari — the OAuth redirect drops the state parameter. Filed with Stripe support (#SR-44291). Blocking merchant self-service launch.",
    tags: ["stripe", "blocker", "safari"],
    project_name: "payment-service",
    created_at: daysAgo(6, 6),
  },
];

export const DEMO_DECISIONS: Decision[] = [
  {
    id: uuid(50),
    user_id: "demo-user",
    title: "Redis vs Memcached for session cache",
    context:
      "Need a distributed session cache for the payment service. Sessions include cart data, pricing snapshots, and idempotency keys. Average session size is 12KB, peak concurrent sessions ~5K.",
    options: [
      {
        option: "Redis (Upstash)",
        pros: ["Persistence", "Pub/sub for invalidation", "Data structures (sorted sets for TTL)", "Edge-compatible via REST API"],
        cons: ["Higher cost at scale", "More complex operations"],
      },
      {
        option: "Memcached (ElastiCache)",
        pros: ["Simpler", "Lower latency for pure key-value", "Multi-threaded"],
        cons: ["No persistence", "No pub/sub", "Not edge-compatible", "AWS lock-in"],
      },
      {
        option: "Cloudflare KV",
        pros: ["Native CF integration", "Global distribution", "Free tier"],
        cons: ["Eventually consistent", "25ms write propagation", "Not suitable for session data"],
      },
    ],
    chosen: "Redis (Upstash)",
    rationale:
      "Upstash Redis works from edge with REST API. Persistence prevents session loss during deployments. Sorted sets give us efficient TTL management. Cost is reasonable at our scale (~$20/mo).",
    outcome: "Running well for 6 weeks. p99 latency is 8ms from nearest edge. Zero session loss incidents.",
    tags: ["architecture", "caching", "infrastructure"],
    project_name: "payment-service",
    created_at: daysAgo(5),
    updated_at: daysAgo(1),
  },
  {
    id: uuid(51),
    user_id: "demo-user",
    title: "Monorepo vs polyrepo for the platform",
    context:
      "Three services (payment, frontend, infra) currently in separate repos. Cross-cutting changes require 3 PRs, versions drift, and shared types get out of sync.",
    options: [
      {
        option: "Monorepo (pnpm workspaces)",
        pros: ["Atomic cross-service changes", "Shared types", "Single CI pipeline", "Easier refactoring"],
        cons: ["CI complexity", "Larger clone", "Need workspace tooling"],
      },
      {
        option: "Polyrepo (status quo)",
        pros: ["Independent deployments", "Clear ownership", "Smaller repos"],
        cons: ["Type drift", "Multi-PR changes", "Duplicated config"],
      },
    ],
    chosen: "Monorepo (pnpm workspaces)",
    rationale:
      "Type safety across services outweighs CI complexity. pnpm workspaces handle dependency management well. Turborepo for build caching keeps CI fast.",
    tags: ["architecture", "dx", "tooling"],
    project_name: "infra-migration",
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
  },
  {
    id: uuid(52),
    user_id: "demo-user",
    title: "REST vs GraphQL for the new checkout API",
    context:
      "Building a new checkout API consumed by web, mobile, and third-party integrations. Need to balance flexibility with simplicity.",
    options: [
      {
        option: "REST (OpenAPI)",
        pros: ["Simple", "Cacheable", "Great tooling", "Team familiarity"],
        cons: ["Over/under-fetching", "Multiple roundtrips for complex views"],
      },
      {
        option: "GraphQL",
        pros: ["Flexible queries", "Single endpoint", "Type generation"],
        cons: ["Complexity", "Caching challenges", "N+1 query risks", "Learning curve for team"],
      },
      {
        option: "tRPC",
        pros: ["End-to-end type safety", "No codegen", "Simple"],
        cons: ["TypeScript only", "Can't serve mobile/third-party", "Tight coupling"],
      },
    ],
    chosen: "REST (OpenAPI)",
    rationale:
      "Third-party integrations need stable, documented endpoints. REST is the most portable. OpenAPI spec generates SDKs for any language. Over-fetching is minimal with well-designed resources.",
    tags: ["api-design", "architecture"],
    project_name: "payment-service",
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: uuid(53),
    user_id: "demo-user",
    title: "Component library: Build vs adopt Radix + shadcn",
    context:
      "Frontend redesign needs a consistent component library. Currently using a mix of custom components and Material UI. Need accessible, themeable primitives.",
    options: [
      {
        option: "shadcn/ui (Radix primitives)",
        pros: ["Copy-paste ownership", "Accessible by default", "Tailwind native", "Active community"],
        cons: ["Manual updates", "No versioning"],
      },
      {
        option: "Build custom from scratch",
        pros: ["Full control", "No dependencies", "Exactly what we need"],
        cons: ["Months of work", "Accessibility burden", "Maintenance cost"],
      },
      {
        option: "Keep Material UI",
        pros: ["Already integrated", "Comprehensive", "Team knows it"],
        cons: ["Heavy bundle", "Hard to customize", "Doesn't fit new design language"],
      },
    ],
    chosen: "shadcn/ui (Radix primitives)",
    rationale:
      "Ownership without maintenance burden. Radix handles accessibility correctly. Tailwind theming aligns with our design system migration. We can customize every component.",
    outcome: "Migrated 23 components in 2 weeks. Bundle size dropped 40%. Dark mode works perfectly.",
    tags: ["frontend", "design-system", "dx"],
    project_name: "frontend-redesign",
    created_at: daysAgo(4),
    updated_at: daysAgo(2),
  },
];

export const DEMO_SESSIONS: Session[] = [
  {
    id: uuid(70),
    user_id: "demo-user",
    started_at: daysAgo(0, 4),
    ended_at: daysAgo(0, 1),
    mood_start: "focused",
    mood_end: "productive",
    goals: ["Fix Stripe webhook idempotency", "Add retry logic for 429s"],
    accomplishments: [
      "Added webhook_events table with unique constraint",
      "Implemented idempotent webhook handler",
      "Wrote integration tests for duplicate events",
    ],
    summary: "Fixed critical payment webhook bug. Duplicate charge credits are now impossible.",
    project_name: "payment-service",
    scores: { productivity_score: 8.5, sentiment_score: 7.5, flow_score: 9.0, overall_score: 8.3 },
  },
  {
    id: uuid(71),
    user_id: "demo-user",
    started_at: daysAgo(1, 6),
    ended_at: daysAgo(1, 2),
    mood_start: "focused",
    mood_end: "satisfied",
    goals: ["Migrate pricing page to React 19", "Implement useOptimistic for cart"],
    accomplishments: [
      "Pricing page fully migrated to server components",
      "Cart uses useOptimistic — instant UI feedback",
      "Removed 340 lines of manual state management",
    ],
    summary: "React 19 migration for pricing page done. Cart interactions feel instant now.",
    project_name: "frontend-redesign",
    scores: { productivity_score: 9.0, sentiment_score: 8.0, flow_score: 8.5, overall_score: 8.5 },
  },
  {
    id: uuid(72),
    user_id: "demo-user",
    started_at: daysAgo(3, 5),
    ended_at: daysAgo(3, 2),
    mood_start: "debugging",
    mood_end: "satisfied",
    goals: ["Debug D1 migration failures", "Optimize payment ledger queries"],
    accomplishments: [
      "Fixed batch insert chunking for D1 (100 row limit)",
      "Payment ledger query: 1200ms -> 45ms with proper indexes",
    ],
    blockers: ["D1 EXPLAIN not available — had to guess at index strategy"],
    summary: "Migrated payment ledger to D1. Performance is excellent despite limited debugging tools.",
    project_name: "infra-migration",
    scores: { productivity_score: 7.0, sentiment_score: 6.5, flow_score: 6.0, overall_score: 6.5 },
  },
  {
    id: uuid(73),
    user_id: "demo-user",
    started_at: daysAgo(5, 7),
    ended_at: daysAgo(5, 3),
    mood_start: "exploratory",
    mood_end: "excited",
    goals: ["Evaluate session cache options", "Prototype Upstash Redis integration"],
    accomplishments: [
      "Benchmarked Redis vs KV vs Memcached",
      "Upstash REST API working from Workers",
      "Session cache prototype handling 500 req/s",
    ],
    summary: "Redis session cache prototype is fast and reliable. Decided on Upstash for production.",
    project_name: "payment-service",
    scores: { productivity_score: 8.0, sentiment_score: 9.0, flow_score: 8.5, overall_score: 8.5 },
  },
];

export const DEMO_SENTIMENT: Sentiment[] = [
  {
    id: uuid(80),
    user_id: "demo-user",
    target_type: "tool",
    target_name: "Cloudflare D1",
    feeling: "impressed",
    intensity: 4,
    reason: "Query performance at the edge is genuinely fast. The SQLite-based approach just works for our use case.",
    project_id: uuid(102),
    created_at: daysAgo(1),
  },
  {
    id: uuid(81),
    user_id: "demo-user",
    target_type: "library",
    target_name: "React 19",
    feeling: "satisfied",
    intensity: 4,
    reason: "useOptimistic and server actions simplified our payment forms significantly. Migration was smoother than expected.",
    project_id: uuid(101),
    created_at: daysAgo(2),
  },
  {
    id: uuid(82),
    user_id: "demo-user",
    target_type: "tool",
    target_name: "Wrangler Dev Mode",
    feeling: "frustrated",
    intensity: 3,
    reason: "No D1 trigger support, no EXPLAIN. Lost 2 hours debugging audit logs that work fine in production.",
    project_id: uuid(102),
    created_at: daysAgo(6),
  },
];

export const DEMO_COACHING: CoachingData = {
  sessions: {
    total: 4,
    completed: 4,
    with_accomplishments: 4,
    with_blockers: 1,
  },
  thoughts: {
    total: 14,
    insights: 5,
    todos: 3,
    ideas: 1,
  },
  decisions: {
    total: 4,
    with_outcome: 2,
  },
  sentiment: [
    { feeling: "impressed", count: 1 },
    { feeling: "satisfied", count: 1 },
    { feeling: "frustrated", count: 1 },
  ],
  conversations: {
    total: 12,
    avg_quality: 4.2,
    goal_rate: 0.83,
    context_rate: 0.75,
  },
};

export const DEMO_TIMELINE: TimelineEntry[] = [
  ...DEMO_THOUGHTS.slice(0, 8).map((t) => ({
    type: "thought" as const,
    id: t.id,
    created_at: t.created_at,
    content: t.content,
    thought_type: t.type,
    tags: t.tags,
  })),
  ...DEMO_DECISIONS.slice(0, 3).map((d) => ({
    type: "decision" as const,
    id: d.id,
    created_at: d.created_at,
    title: d.title,
    tags: d.tags,
  })),
  ...DEMO_SESSIONS.map((s) => ({
    type: "session" as const,
    id: s.id,
    created_at: s.started_at,
    mood_start: s.mood_start,
    mood_end: s.mood_end,
    summary: s.summary,
  })),
].sort(
  (a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

export const DEMO_SUMMARY: BrainSummary = {
  stats: {
    total_thoughts: DEMO_THOUGHTS.length,
    total_decisions: DEMO_DECISIONS.length,
    total_sessions: DEMO_SESSIONS.length,
    active_days: 6,
    total_session_minutes: 960,
    thoughts_by_type: { insight: 5, todo: 3, idea: 1, note: 4, question: 1 },
  },
  themes: [
    { tag: "stripe", cnt: 5 },
    { tag: "architecture", cnt: 5 },
    { tag: "learned", cnt: 5 },
    { tag: "performance", cnt: 3 },
    { tag: "infrastructure", cnt: 2 },
    { tag: "frontend", cnt: 2 },
  ],
  decisions: DEMO_DECISIONS.map((d) => ({
    title: d.title,
    chosen: d.chosen ?? "",
    rationale: d.rationale ?? "",
    date: d.created_at,
    tags: d.tags ?? [],
  })),
  insights: DEMO_THOUGHTS.filter((t) => t.type === "insight").map((t) => ({
    content: t.content,
    date: t.created_at,
    tags: t.tags ?? [],
  })),
  accomplishments: DEMO_SESSIONS.flatMap(
    (s) =>
      s.accomplishments?.map((a) => ({ content: a, date: s.started_at })) ?? []
  ),
  blockers: DEMO_SESSIONS.flatMap(
    (s) =>
      s.blockers?.map((b) => ({ content: b, date: s.started_at })) ?? []
  ),
};

export const DEMO_HANDOFFS: Handoff[] = [
  {
    id: uuid(200),
    user_id: "demo-user",
    from_project: "payment-service",
    to_project: "infra-migration",
    handoff_type: "blocker",
    priority: "high",
    message:
      "Stripe webhook retry queue needs a durable backing store. Currently in-memory — if the Worker restarts mid-retry, events are lost. Need D1 or Durable Objects solution before going live.",
    status: "pending",
    claimed_at: null,
    claim_note: null,
    created_at: daysAgo(1, 2),
  },
  {
    id: uuid(201),
    user_id: "demo-user",
    from_project: "frontend-redesign",
    to_project: "payment-service",
    handoff_type: "context",
    priority: "medium",
    message:
      "The new checkout form uses useOptimistic for instant feedback. Payment API needs to return a predictable shape for optimistic updates — specifically the line_items array with calculated totals.",
    status: "claimed",
    claimed_at: daysAgo(0, 8),
    claim_note: "Adding line_items to the POST /checkout response. PR #47 in progress.",
    created_at: daysAgo(2, 5),
  },
  {
    id: uuid(202),
    user_id: "demo-user",
    from_project: "infra-migration",
    to_project: "frontend-redesign",
    handoff_type: "task",
    priority: "low",
    message:
      "Cloudflare Workers environment variables changed from BINDING to env.BINDING in the new module format. Frontend build scripts that reference worker bindings need updating.",
    status: "resolved",
    claimed_at: daysAgo(3, 1),
    claim_note: "Updated vite.config.ts and wrangler.toml references. Merged in commit abc1234.",
    created_at: daysAgo(4, 3),
  },
];

export const DEMO_API_KEYS: ApiKey[] = [
  {
    id: uuid(300),
    name: "CLI dev machine",
    key_prefix: "brn_dk82",
    scope: "full",
    expires_at: null,
    created_at: daysAgo(14),
    last_used_at: daysAgo(0, 1),
    is_active: 1,
  },
  {
    id: uuid(301),
    name: "CI pipeline",
    key_prefix: "brn_ci03",
    scope: "read",
    expires_at: daysAgo(-30), // 30 days in the future
    created_at: daysAgo(7),
    last_used_at: daysAgo(1, 4),
    is_active: 1,
  },
];

const DEMO_TEAM_ID = uuid(400);

export const DEMO_TEAMS: Team[] = [
  {
    id: DEMO_TEAM_ID,
    name: "Platform Engineering",
    slug: "platform-eng",
    description: "Core platform team — payments, infra, and frontend systems",
    created_by: "demo-user",
    created_at: daysAgo(20),
    updated_at: daysAgo(2),
    my_role: "owner",
  },
];

export const DEMO_TEAM_DETAIL: TeamDetail = {
  ...DEMO_TEAMS[0],
  members: [
    {
      id: uuid(410),
      team_id: DEMO_TEAM_ID,
      user_id: "demo-user",
      role: "owner",
      joined_at: daysAgo(20),
      user_name: "Demo User",
      user_email: "demo@brain-ai.dev",
      user_avatar: null,
    },
    {
      id: uuid(411),
      team_id: DEMO_TEAM_ID,
      user_id: uuid(412),
      role: "member",
      joined_at: daysAgo(18),
      user_name: "Alex Chen",
      user_email: "alex@example.com",
      user_avatar: null,
    },
    {
      id: uuid(413),
      team_id: DEMO_TEAM_ID,
      user_id: uuid(414),
      role: "member",
      joined_at: daysAgo(15),
      user_name: "Sarah Kim",
      user_email: "sarah@example.com",
      user_avatar: null,
    },
  ],
};

export const DEMO_TEAM_STATS: TeamStats = {
  members: 3,
  thoughts: 28,
  decisions: 6,
  sessions: 12,
  member_activity: [
    {
      user_id: "demo-user",
      name: "Demo User",
      avatar_url: null,
      role: "owner",
      thoughts: 14,
      decisions: 4,
      sessions: 4,
      last_active: daysAgo(0, 2),
    },
    {
      user_id: uuid(412),
      name: "Alex Chen",
      avatar_url: null,
      role: "member",
      thoughts: 9,
      decisions: 1,
      sessions: 5,
      last_active: daysAgo(0, 5),
    },
    {
      user_id: uuid(414),
      name: "Sarah Kim",
      avatar_url: null,
      role: "member",
      thoughts: 5,
      decisions: 1,
      sessions: 3,
      last_active: daysAgo(1, 3),
    },
  ],
};

export const DEMO_TEAM_FEED: TeamFeedItem[] = [
  {
    id: uuid(420),
    type: "thought",
    content: "Edge caching strategy for the checkout API — using stale-while-revalidate with 30s TTL on product catalog, no-store on cart endpoints.",
    title: null,
    thought_type: "insight",
    tags: ["caching", "performance"],
    created_at: daysAgo(0, 3),
    user_name: "Alex Chen",
    user_avatar: null,
  },
  {
    id: uuid(421),
    type: "decision",
    content: null,
    title: "Use Vitest over Jest for the frontend test suite",
    thought_type: null,
    tags: ["testing", "dx"],
    created_at: daysAgo(1, 2),
    user_name: "Sarah Kim",
    user_avatar: null,
  },
  {
    id: uuid(422),
    type: "session",
    content: null,
    title: null,
    thought_type: null,
    tags: [],
    created_at: daysAgo(1, 6),
    user_name: "Demo User",
    user_avatar: null,
  },
];

export const DEMO_TEAM_COACHING: TeamCoaching = {
  productivity_score: 7.8,
  highlights: [
    "Strong cross-project communication via handoffs",
    "Decisions are well-documented with clear rationale",
    "Consistent session tracking across all team members",
  ],
  challenges: [
    "Two open blockers involving Stripe and Cloudflare integration",
    "Some sessions lack defined goals upfront",
  ],
  suggestions: [
    "Consider a weekly decision review to capture outcomes",
    "Add tags consistently to improve searchability",
  ],
  collaboration_patterns: [
    "Payment-service and infra-migration have the most cross-project handoffs",
    "Alex focuses on backend; Sarah on frontend — good domain coverage",
  ],
  period_days: 7,
  member_count: 3,
  generated_at: daysAgo(0),
};
