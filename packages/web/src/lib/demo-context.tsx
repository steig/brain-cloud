import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  setDemoMode,
  type AuthUser,
  type Thought,
  type Decision,
  type Session,
  type TimelineEntry,
  type BrainSummary,
} from "./api";

interface DemoContextValue {
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  enterDemo: () => {},
  exitDemo: () => {},
});

export function useDemo() {
  return useContext(DemoContext);
}

// --- Demo Data ---

const DEMO_USER: AuthUser = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@brain-ai.dev",
  system_role: "user",
};

const now = new Date();
function daysAgo(n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const DEMO_THOUGHTS: Thought[] = [
  {
    id: "demo-t1",
    user_id: "demo-user",
    type: "insight",
    content:
      "React 19 useOptimistic hook simplifies optimistic UI updates — no more manual rollback state. Works great with server actions.",
    tags: ["react", "learned"],
    project_name: "frontend-app",
    created_at: daysAgo(0),
  },
  {
    id: "demo-t2",
    user_id: "demo-user",
    type: "todo",
    content:
      "Migrate auth from JWT to session cookies — JWTs are getting too large with team claims. Deferred: needs backend changes first.",
    tags: ["auth", "tech-debt"],
    project_name: "brain-cloud",
    created_at: daysAgo(1),
  },
  {
    id: "demo-t3",
    user_id: "demo-user",
    type: "idea",
    content:
      "Could use Cloudflare Durable Objects for real-time collaborative editing in the dashboard. Worth prototyping.",
    tags: ["idea", "architecture"],
    project_name: "brain-cloud",
    created_at: daysAgo(2),
  },
  {
    id: "demo-t4",
    user_id: "demo-user",
    type: "note",
    content:
      "D1 batch inserts max 100 rows per statement. For bulk imports, chunk the array and use a transaction wrapper.",
    tags: ["d1", "learned"],
    project_name: "brain-cloud",
    created_at: daysAgo(3),
  },
  {
    id: "demo-t5",
    user_id: "demo-user",
    type: "insight",
    content:
      "TanStack Query's placeholderData option is better than initialData for prefetching — it doesn't affect cache staleness.",
    tags: ["tanstack-query", "learned"],
    project_name: "frontend-app",
    created_at: daysAgo(4),
  },
  {
    id: "demo-t6",
    user_id: "demo-user",
    type: "question",
    content:
      "Should we use Hono middleware or Cloudflare Worker bindings for rate limiting? Need to benchmark both approaches.",
    tags: ["hono", "performance"],
    project_name: "brain-cloud",
    created_at: daysAgo(5),
  },
];

const DEMO_DECISIONS: Decision[] = [
  {
    id: "demo-d1",
    user_id: "demo-user",
    title: "Database choice: D1 vs Turso vs PlanetScale",
    context:
      "Need an edge-compatible SQL database for the Brain Cloud backend. Must work with Cloudflare Workers.",
    options: [
      {
        option: "Cloudflare D1",
        pros: ["Native CF integration", "Free tier", "No cold starts"],
        cons: ["SQLite limitations", "Newer/less mature"],
      },
      {
        option: "Turso",
        pros: ["LibSQL (SQLite fork)", "Multi-region", "Good DX"],
        cons: ["External dependency", "Extra latency for auth"],
      },
      {
        option: "PlanetScale",
        pros: ["MySQL compatible", "Branching", "Mature"],
        cons: ["Free tier removed", "Higher latency from edge"],
      },
    ],
    chosen: "Cloudflare D1",
    rationale:
      "Native integration with Workers eliminates network hops. Free tier is generous. SQLite limitations are acceptable for our schema.",
    outcome: "Working well after 3 months. Query performance is excellent at the edge.",
    tags: ["architecture", "database"],
    project_name: "brain-cloud",
    created_at: daysAgo(14),
    updated_at: daysAgo(2),
  },
  {
    id: "demo-d2",
    user_id: "demo-user",
    title: "Edge framework: Hono vs Express vs Elysia",
    context:
      "Choosing a web framework for the Cloudflare Worker API layer.",
    options: [
      {
        option: "Hono",
        pros: ["Built for edge", "Tiny bundle", "Great middleware"],
        cons: ["Smaller ecosystem"],
      },
      {
        option: "Express",
        pros: ["Huge ecosystem", "Team familiarity"],
        cons: ["Not edge-native", "Large bundle", "Node.js APIs"],
      },
      {
        option: "Elysia",
        pros: ["Type-safe", "Fast", "Bun-native"],
        cons: ["Bun-only", "Very new"],
      },
    ],
    chosen: "Hono",
    rationale:
      "Purpose-built for edge runtimes. Minimal bundle size matters for Workers. Middleware pattern is clean.",
    tags: ["architecture", "framework"],
    project_name: "brain-cloud",
    created_at: daysAgo(21),
    updated_at: daysAgo(21),
  },
  {
    id: "demo-d3",
    user_id: "demo-user",
    title: "State management: TanStack Query vs SWR vs Zustand",
    context: "Need server state management for the React dashboard.",
    options: [
      {
        option: "TanStack Query",
        pros: ["Best caching", "Devtools", "Mutations"],
        cons: ["Learning curve"],
      },
      {
        option: "SWR",
        pros: ["Simple API", "Lightweight"],
        cons: ["Fewer features", "No mutation helpers"],
      },
      {
        option: "Zustand",
        pros: ["Simple", "Flexible"],
        cons: ["Not server-state focused", "Manual cache invalidation"],
      },
    ],
    chosen: "TanStack Query",
    rationale:
      "Best-in-class for server state. Cache invalidation and optimistic updates out of the box.",
    tags: ["frontend", "state-management"],
    project_name: "brain-cloud",
    created_at: daysAgo(28),
    updated_at: daysAgo(28),
  },
];

const DEMO_SESSIONS: Session[] = [
  {
    id: "demo-s1",
    user_id: "demo-user",
    started_at: daysAgo(0),
    ended_at: daysAgo(0),
    mood_start: "focused",
    mood_end: "productive",
    goals: ["Implement demo mode for landing page", "Add interactive preview"],
    accomplishments: ["Built demo context provider", "Added sample data", "Connected to dashboard"],
    summary: "Productive session building the interactive demo feature.",
    project_name: "brain-cloud",
  },
  {
    id: "demo-s2",
    user_id: "demo-user",
    started_at: daysAgo(1),
    ended_at: daysAgo(1),
    mood_start: "focused",
    mood_end: "satisfied",
    goals: ["Fix auth refresh loop", "Add API key management"],
    accomplishments: ["Fixed token refresh race condition", "Built multi-key management UI"],
    summary: "Fixed a tricky auth bug and shipped API key management.",
    project_name: "brain-cloud",
  },
  {
    id: "demo-s3",
    user_id: "demo-user",
    started_at: daysAgo(2),
    ended_at: daysAgo(2),
    mood_start: "exploratory",
    mood_end: "excited",
    goals: ["Research edge database options"],
    accomplishments: ["Benchmarked D1 vs Turso", "Chose D1 for native integration"],
    summary: "Evaluated database options and made final architecture decision.",
    project_name: "brain-cloud",
  },
  {
    id: "demo-s4",
    user_id: "demo-user",
    started_at: daysAgo(3),
    ended_at: daysAgo(3),
    mood_start: "debugging",
    mood_end: "satisfied",
    goals: ["Debug slow queries on sessions page"],
    accomplishments: ["Added index on created_at", "Query time: 800ms -> 12ms"],
    blockers: ["D1 EXPLAIN not supported yet"],
    summary: "Optimized slow queries. Missing EXPLAIN was annoying but worked around it.",
    project_name: "brain-cloud",
  },
  {
    id: "demo-s5",
    user_id: "demo-user",
    started_at: daysAgo(5),
    ended_at: daysAgo(5),
    mood_start: "focused",
    mood_end: "productive",
    goals: ["Build GitHub integration", "Import commit history"],
    accomplishments: ["GitHub OAuth flow working", "Commit import pipeline done"],
    summary: "Shipped GitHub integration — repos can now sync commits and PRs.",
    project_name: "brain-cloud",
  },
];

const DEMO_TIMELINE: TimelineEntry[] = [
  ...DEMO_THOUGHTS.slice(0, 4).map((t) => ({
    type: "thought" as const,
    id: t.id,
    created_at: t.created_at,
    content: t.content,
    thought_type: t.type,
    tags: t.tags,
  })),
  ...DEMO_DECISIONS.slice(0, 2).map((d) => ({
    type: "decision" as const,
    id: d.id,
    created_at: d.created_at,
    title: d.title,
    tags: d.tags,
  })),
  ...DEMO_SESSIONS.slice(0, 3).map((s) => ({
    type: "session" as const,
    id: s.id,
    created_at: s.started_at,
    mood_start: s.mood_start,
    mood_end: s.mood_end,
    summary: s.summary,
  })),
].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

const DEMO_SUMMARY: BrainSummary = {
  stats: {
    total_thoughts: DEMO_THOUGHTS.length,
    total_decisions: DEMO_DECISIONS.length,
    total_sessions: DEMO_SESSIONS.length,
    active_days: 5,
    total_session_minutes: 480,
    thoughts_by_type: { insight: 2, todo: 1, idea: 1, note: 1, question: 1 },
  },
  themes: [
    { tag: "architecture", cnt: 4 },
    { tag: "learned", cnt: 3 },
    { tag: "brain-cloud", cnt: 5 },
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

function seedQueryCache(qc: ReturnType<typeof useQueryClient>) {
  qc.setQueryData(["user"], DEMO_USER);
  qc.setQueryData(["thoughts", undefined], DEMO_THOUGHTS);
  qc.setQueryData(["thoughts", { order: "created_at.desc", limit: "5" }], DEMO_THOUGHTS.slice(0, 5));
  qc.setQueryData(["decisions", undefined], DEMO_DECISIONS);
  qc.setQueryData(["decisions", { order: "created_at.desc", limit: "5" }], DEMO_DECISIONS);
  qc.setQueryData(["sessions", undefined], DEMO_SESSIONS);
  qc.setQueryData(["sessions", { order: "started_at.desc", limit: "5" }], DEMO_SESSIONS);
  qc.setQueryData(["timeline", 7], DEMO_TIMELINE);
  // Summary uses dynamic date keys — seed with a matcher
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const toDate = new Date();
  qc.setQueryData(
    ["brain-summary", fromDate.toISOString().slice(0, 10), toDate.toISOString().slice(0, 10)],
    DEMO_SUMMARY
  );
  // Empty arrays for features the demo doesn't populate
  qc.setQueryData(["handoffs", undefined], []);
  qc.setQueryData(["handoffs", {}], []);
  qc.setQueryData(["api-keys"], []);
  qc.setQueryData(["github-repos"], []);
  qc.setQueryData(["github-activity", undefined], []);
  qc.setQueryData(["teams"], []);
  qc.setQueryData(["projects"], []);
  qc.setQueryData(["sentiment", undefined], []);
  qc.setQueryData(["decision-reviews"], []);
  qc.setQueryData(["decisions-needing-review"], []);
  qc.setQueryData(["review-stats"], {
    total_reviews: 0,
    avg_rating: 0,
    would_repeat: 0,
    positive_outcomes: 0,
    total_decisions: DEMO_DECISIONS.length,
    reviewed_decisions: 0,
    rating_distribution: [],
  });
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const enterDemo = useCallback(() => {
    seedQueryCache(qc);
    setDemoMode(true);
    setIsDemo(true);
    navigate("/dashboard");
  }, [qc, navigate]);

  const exitDemo = useCallback(() => {
    setDemoMode(false);
    setIsDemo(false);
    qc.clear();
    navigate("/login");
  }, [qc, navigate]);

  return (
    <DemoContext.Provider value={{ isDemo, enterDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}
