import { useTimeline, useBrainSummary, useThoughts, useDecisions, useSessions } from "@/lib/queries";
import { StatsCards } from "./stats-cards";
import { Timeline } from "./timeline";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPage() {
  const timeline = useTimeline(7);
  const summary = useBrainSummary("this week");
  const thoughts = useThoughts({ order: "created_at.desc", limit: "5" });
  const decisions = useDecisions({ order: "created_at.desc", limit: "5" });
  const sessions = useSessions({ order: "started_at.desc", limit: "5" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

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
