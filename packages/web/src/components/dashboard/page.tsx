import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useBrainSummary, useApiKeys, useReminders } from "@/lib/queries";
import { useLoadMore } from "@/lib/use-load-more";
import { useDemo } from "@/lib/demo-context";
import { api, type TimelineEntry } from "@/lib/api";
import { StatsCards } from "./stats-cards";
import { Timeline } from "./timeline";
import { DateRangeFilter, type DateRange } from "@/components/shared/date-range-filter";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupWizard, DISMISSED_KEY } from "@/components/onboarding/setup-wizard";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardPage() {
  const { isDemo } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange | null>({
    from: daysAgo(30),
    to: todayISO(),
  });

  const fromDate = dateRange?.from || "2020-01-01";
  const toDate = dateRange?.to || todayISO();

  const { items, isLoading: timelineLoading, isFetchingMore, hasMore, loadMore } = useLoadMore<TimelineEntry>({
    queryKey: ["timeline", dateRange],
    queryFn: ({ limit, offset }) =>
      api.rpc<TimelineEntry[]>("timeline", {
        from_date: fromDate,
        to_date: toDate,
        limit_rows: limit,
        offset_rows: offset,
      }),
    pageSize: 30,
  });

  const summary = useBrainSummary(fromDate, toDate);
  const apiKeys = useApiKeys();
  const pendingReminders = useReminders({ status: "pending" });

  const activeKeys = apiKeys.data?.filter((k) => k.is_active) ?? [];
  const overdueReminders = (pendingReminders.data ?? []).filter(
    (r) => new Date(r.due_at) < new Date()
  );
  const dueTodayReminders = (pendingReminders.data ?? []).filter((r) => {
    const due = new Date(r.due_at);
    const now = new Date();
    return due >= now && due.toDateString() === now.toDateString();
  });
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");
  const showWizard = !isDemo && !dismissed && !apiKeys.isLoading && activeKeys.length === 0;

  return (
    <div className="space-y-6" data-tour="dashboard">
      <Helmet><title>Dashboard — Brain Cloud</title></Helmet>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {showWizard && <SetupWizard onDismiss={() => setDismissed(true)} />}

      <StatsCards
        summary={summary.data}
        isLoading={summary.isLoading}
      />

      {(overdueReminders.length > 0 || dueTodayReminders.length > 0) && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm">
            {overdueReminders.length > 0 && (
              <span className="text-destructive font-medium">
                {overdueReminders.length} overdue reminder{overdueReminders.length !== 1 ? "s" : ""}
              </span>
            )}
            {overdueReminders.length > 0 && dueTodayReminders.length > 0 && (
              <span className="text-muted-foreground">&middot;</span>
            )}
            {dueTodayReminders.length > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {dueTodayReminders.length} due today
              </span>
            )}
            <a href="/reminders" className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              View all &rarr;
            </a>
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        {timelineLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Timeline entries={items} />
            <LoadMoreButton hasMore={hasMore} isLoading={isFetchingMore} onClick={loadMore} />
          </>
        )}
      </div>
    </div>
  );
}
