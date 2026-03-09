import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { setDemoMode } from "./api";
import {
  DEMO_USER,
  DEMO_THOUGHTS,
  DEMO_DECISIONS,
  DEMO_SESSIONS,
  DEMO_SENTIMENT,
  DEMO_TIMELINE,
  DEMO_SUMMARY,
  DEMO_COACHING,
  DEMO_PROJECTS,
  DEMO_HANDOFFS,
  DEMO_API_KEYS,
  DEMO_TEAMS,
  DEMO_TEAM_DETAIL,
  DEMO_TEAM_STATS,
  DEMO_TEAM_FEED,
  DEMO_TEAM_COACHING,
} from "@/components/demo/sample-data";

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

function seedQueryCache(qc: ReturnType<typeof useQueryClient>) {
  qc.setQueryData(["user"], DEMO_USER);

  // Thoughts: seed for no-params, full list page, and dashboard widget
  qc.setQueryData(["thoughts", undefined], DEMO_THOUGHTS);
  qc.setQueryData(["thoughts", { order: "created_at.desc" }], DEMO_THOUGHTS);
  qc.setQueryData(["thoughts", { order: "created_at.desc", limit: "5" }], DEMO_THOUGHTS.slice(0, 5));

  // Decisions: seed for no-params, full list page, and dashboard widget
  qc.setQueryData(["decisions", undefined], DEMO_DECISIONS);
  qc.setQueryData(["decisions", { order: "created_at.desc" }], DEMO_DECISIONS);
  qc.setQueryData(["decisions", { order: "created_at.desc", limit: "5" }], DEMO_DECISIONS);

  // Sessions: seed for no-params, full list page, and dashboard widget
  qc.setQueryData(["sessions", undefined], DEMO_SESSIONS);
  qc.setQueryData(["sessions", { order: "started_at.desc" }], DEMO_SESSIONS);
  qc.setQueryData(["sessions", { order: "started_at.desc", limit: "5" }], DEMO_SESSIONS);

  qc.setQueryData(["timeline", 7], DEMO_TIMELINE);
  qc.setQueryData(["sentiment", undefined], DEMO_SENTIMENT);
  qc.setQueryData(["projects"], DEMO_PROJECTS);
  qc.setQueryData(["coaching-data", 7], DEMO_COACHING);

  // Summary uses dynamic date keys
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const toDate = new Date();
  qc.setQueryData(
    ["brain-summary", fromDate.toISOString().slice(0, 10), toDate.toISOString().slice(0, 10)],
    DEMO_SUMMARY
  );

  // Handoffs
  qc.setQueryData(["handoffs", undefined], DEMO_HANDOFFS);
  qc.setQueryData(["handoffs", {}], DEMO_HANDOFFS);

  // API keys
  qc.setQueryData(["api-keys"], DEMO_API_KEYS);

  // Teams
  qc.setQueryData(["teams"], DEMO_TEAMS);
  const teamId = DEMO_TEAMS[0].id;
  qc.setQueryData(["teams", teamId], DEMO_TEAM_DETAIL);
  qc.setQueryData(["team-stats", teamId], DEMO_TEAM_STATS);
  qc.setQueryData(["team-feed", teamId, 50], DEMO_TEAM_FEED);
  qc.setQueryData(["team-coaching", teamId, 7], DEMO_TEAM_COACHING);

  // Empty arrays for features the demo doesn't populate
  qc.setQueryData(["github-repos"], []);
  qc.setQueryData(["github-activity", undefined], []);
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
  qc.setQueryData(["notifications", undefined], { notifications: [], unread_count: 0 });
  qc.setQueryData(["notifications", { unread: true, limit: 5 }], { notifications: [], unread_count: 0 });
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
