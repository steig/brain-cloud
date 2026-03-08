import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrainSummary } from "@/lib/queries";
import { Brain, Lightbulb, GitBranch, Calendar, Clock, Trophy, AlertTriangle, Hash } from "lucide-react";

function formatDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function SummaryTab() {
  const today = formatDate(0);
  const weekAgo = formatDate(7);
  const summary = useBrainSummary(weekAgo, today);

  if (summary.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (summary.isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load summary. Try again later.
        </CardContent>
      </Card>
    );
  }

  const data = summary.data;
  if (!data?.stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No activity data yet. Start logging thoughts, decisions, and sessions to see your summary here.
        </CardContent>
      </Card>
    );
  }

  const { stats, themes, insights, accomplishments, blockers, decisions } = data;

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_sessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_session_minutes} min this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Thoughts</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_thoughts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.thoughts_by_type?.insight ?? 0} insights
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Decisions</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_decisions}</div>
            <p className="text-xs text-muted-foreground">this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_days}</div>
            <p className="text-xs text-muted-foreground">out of 7</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Accomplishments */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium">Recent Accomplishments</CardTitle>
          </CardHeader>
          <CardContent>
            {accomplishments.length > 0 ? (
              <ul className="space-y-2">
                {accomplishments.map((a, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-muted-foreground text-xs">{a.date}</span>
                    <p>{a.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No accomplishments recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Blockers */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-sm font-medium">Recent Blockers</CardTitle>
          </CardHeader>
          <CardContent>
            {blockers.length > 0 ? (
              <ul className="space-y-2">
                {blockers.map((b, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-muted-foreground text-xs">{b.date}</span>
                    <p>{b.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No blockers recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Insights */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-medium">Recent Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length > 0 ? (
              <ul className="space-y-3">
                {insights.map((ins, i) => (
                  <li key={i} className="text-sm border-l-2 border-amber-500/30 pl-3">
                    <p>{ins.content}</p>
                    <span className="text-muted-foreground text-xs">{ins.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No insights yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Themes */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Top Themes</CardTitle>
          </CardHeader>
          <CardContent>
            {themes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                  >
                    {t.tag}
                    <span className="text-muted-foreground">({t.cnt})</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Decisions */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {decisions.map((d, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{d.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{d.date}</span>
                  </div>
                  {d.chosen && (
                    <p className="text-muted-foreground mt-0.5">Chose: {d.chosen}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
