import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useCrossProjectInsights } from "@/lib/queries";

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

const FEELING_COLORS: Record<string, string> = {
  frustrated: "destructive",
  confused: "destructive",
  annoyed: "destructive",
  satisfied: "default",
  excited: "default",
  impressed: "default",
  neutral: "secondary",
};

export function CrossProjectTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useCrossProjectInsights(days);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No cross-project data available.
        </CardContent>
      </Card>
    );
  }

  const hasActivity = data.project_activity.length > 0;
  const hasDecisionPatterns = data.decision_patterns.length > 0;
  const hasBlockers = data.common_blockers.length > 0;
  const hasSentiment = data.sentiment_trends.length > 0;

  return (
    <div className="space-y-4">
      {/* Time range selector */}
      <div className="flex gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.days}
            variant={days === opt.days ? "default" : "outline"}
            size="sm"
            onClick={() => setDays(opt.days)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Project activity chart */}
      {hasActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Project Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                thoughts: { label: "Thoughts", color: "var(--chart-1)" },
                decisions: { label: "Decisions", color: "var(--chart-2)" },
                sessions: { label: "Sessions", color: "var(--chart-3)" },
              }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.project_activity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar
                    dataKey="thoughts"
                    name="Thoughts"
                    stackId="a"
                    fill="var(--color-thoughts)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="decisions"
                    name="Decisions"
                    stackId="a"
                    fill="var(--color-decisions)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="sessions"
                    name="Sessions"
                    stackId="a"
                    fill="var(--color-sessions)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Decision patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Repeated Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            {hasDecisionPatterns ? (
              <div className="space-y-3">
                {data.decision_patterns.map((dp, i) => (
                  <div key={i} className="border-b pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{dp.title}</p>
                      <Badge variant="secondary">{dp.count}x</Badge>
                    </div>
                    {dp.projects && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Projects: {dp.projects}
                      </p>
                    )}
                    {dp.choices && (
                      <p className="text-xs text-muted-foreground">
                        Choices: {dp.choices}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No repeated decision patterns found.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Common blockers */}
        <Card>
          <CardHeader>
            <CardTitle>Common Blockers</CardTitle>
          </CardHeader>
          <CardContent>
            {hasBlockers ? (
              <div className="space-y-3">
                {data.common_blockers.map((b, i) => (
                  <div key={i} className="border-b pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm line-clamp-2">{b.content}</p>
                      <Badge variant="destructive">{b.count}x</Badge>
                    </div>
                    {b.projects && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Projects: {b.projects}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No repeated blockers found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sentiment trends */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment by Tool / Library</CardTitle>
        </CardHeader>
        <CardContent>
          {hasSentiment ? (
            <div className="space-y-3">
              {data.sentiment_trends.map((s, i) => (
                <div key={i} className="flex items-center gap-3 border-b pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.target_name}</p>
                    <p className="text-xs text-muted-foreground">{s.target_type}</p>
                  </div>
                  <Badge
                    variant={
                      (FEELING_COLORS[s.feeling] as "default" | "secondary" | "destructive") ??
                      "outline"
                    }
                  >
                    {s.feeling}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {s.count}x, avg {s.avg_intensity?.toFixed(1)}
                  </span>
                  {s.projects && (
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {s.projects}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sentiment data recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
