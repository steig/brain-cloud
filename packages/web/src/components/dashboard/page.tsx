import { useState } from "react";
import { useTimeline, useBrainSummary, useThoughts, useDecisions, useSessions, useApiKeys } from "@/lib/queries";
import { StatsCards } from "./stats-cards";
import { Timeline } from "./timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupWizard, DISMISSED_KEY } from "@/components/onboarding/setup-wizard";

export function DashboardPage() {
  const timeline = useTimeline(7);
  const summary = useBrainSummary("this week");
  const thoughts = useThoughts({ order: "created_at.desc", limit: "5" });
  const decisions = useDecisions({ order: "created_at.desc", limit: "5" });
  const sessions = useSessions({ order: "started_at.desc", limit: "5" });
  const apiKeys = useApiKeys();

  const activeKeys = apiKeys.data?.filter((k) => k.is_active) ?? [];
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");
  const showWizard = !dismissed && !apiKeys.isLoading && activeKeys.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {showWizard && <SetupWizard onDismiss={() => setDismissed(true)} />}

      <StatsCards
        thoughtCount={thoughts.data?.length}
        decisionCount={decisions.data?.length}
        sessionCount={sessions.data?.length}
        summary={summary.data}
        isLoading={summary.isLoading}
      />

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {timeline.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <Timeline entries={timeline.data ?? []} />
        )}
      </div>
    </div>
  );
}
