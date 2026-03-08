import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTimeline, useBrainSummary, useThoughts, useDecisions, useSessions, useApiKeys } from "@/lib/queries";
import { useDemo } from "@/lib/demo-context";
import { StatsCards } from "./stats-cards";
import { Timeline } from "./timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupWizard, DISMISSED_KEY } from "@/components/onboarding/setup-wizard";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const { isDemo } = useDemo();
  const timeline = useTimeline(7);
  const summary = useBrainSummary(daysAgo(7), daysAgo(0));
  const thoughts = useThoughts({ order: "created_at.desc", limit: "5" });
  const decisions = useDecisions({ order: "created_at.desc", limit: "5" });
  const sessions = useSessions({ order: "started_at.desc", limit: "5" });
  const apiKeys = useApiKeys();

  const activeKeys = apiKeys.data?.filter((k) => k.is_active) ?? [];
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");
  const showWizard = !isDemo && !dismissed && !apiKeys.isLoading && activeKeys.length === 0;

  return (
    <div className="space-y-6">
      <Helmet><title>Dashboard — Brain Cloud</title></Helmet>
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
