import {
  LineChart,
  Line,
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
import { Skeleton } from "@/components/ui/skeleton";
import { usePromptQuality, useLearningCurve } from "@/lib/queries";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import type { PromptQualityStats, LearningWeek } from "@/lib/api";

export function PatternsTab() {
  const promptQuality = usePromptQuality(30);
  const learningCurve = useLearningCurve(12);

  if (promptQuality.isLoading || learningCurve.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const quality = (promptQuality.data ?? {}) as unknown as PromptQualityStats;
  const weeks = (learningCurve.data ?? []) as LearningWeek[];

  const hasQualityData = quality.total > 0;
  const hasLearningData = weeks.length > 0;

  if (!hasQualityData && !hasLearningData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No pattern data available yet. Log conversations with quality scores to see trends.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quality stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quality.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quality.avg_quality != null ? quality.avg_quality.toFixed(1) : "---"}
            </div>
            <p className="text-xs text-muted-foreground">out of 5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Goal Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quality.goal_rate != null ? `${(quality.goal_rate * 100).toFixed(0)}%` : "---"}
            </div>
            <p className="text-xs text-muted-foreground">goals achieved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Turns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quality.avg_turns != null ? quality.avg_turns.toFixed(1) : "---"}
            </div>
            <p className="text-xs text-muted-foreground">per conversation</p>
          </CardContent>
        </Card>
      </div>

      {/* Learning curve chart */}
      {hasLearningData && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Learning Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total_conversations: { label: "Conversations", color: "var(--chart-1)" },
                avg_quality: { label: "Avg Quality", color: "var(--chart-2)" },
                goal_rate: { label: "Goal Rate", color: "var(--chart-3)" },
              }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeks}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_conversations"
                    name="Conversations"
                    stroke="var(--color-total_conversations)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_quality"
                    name="Avg Quality"
                    stroke="var(--color-avg_quality)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Goal rate trend as bar chart */}
      {hasLearningData && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Goal Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                goal_rate: { label: "Goal Rate", color: "var(--chart-3)" },
              }}
              className="h-56"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeks.map((w) => ({ ...w, goal_pct: (w.goal_rate ?? 0) * 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(0)}%`} />}
                  />
                  <Bar
                    dataKey="goal_pct"
                    name="Goal Rate"
                    fill="var(--color-goal_rate)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
