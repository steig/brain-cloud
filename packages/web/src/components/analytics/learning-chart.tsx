import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLearningCurve, usePromptQuality, useDecisionAccuracy } from "@/lib/queries";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export function LearningChart() {
  const learning = useLearningCurve(12);
  const promptQuality = usePromptQuality(30);
  const decisionAccuracy = useDecisionAccuracy(90);

  if (learning.isLoading) {
    return <Skeleton className="h-80" />;
  }

  const learningData = learning.data as Record<string, unknown> | undefined;
  const weeks = (learningData?.weeks as Array<Record<string, unknown>>) ?? [];

  const qualityData = promptQuality.data as Record<string, unknown> | undefined;
  const accuracyData = decisionAccuracy.data as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Prompt Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qualityData?.avg_quality_score
                ? (qualityData.avg_quality_score as number).toFixed(1)
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">out of 5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Decision Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyData?.avg_outcome_rating
                ? (accuracyData.avg_outcome_rating as number).toFixed(1)
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              avg outcome rating ({(accuracyData?.total_reviews as number) ?? 0} reviews)
            </p>
          </CardContent>
        </Card>
      </div>

      {weeks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Learning Curve</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                conversations: { label: "Conversations", color: "var(--chart-1)" },
                avg_turns: { label: "Avg Turns", color: "var(--chart-2)" },
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
                    dataKey="conversations"
                    name="Conversations"
                    stroke="var(--color-conversations)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_turns"
                    name="Avg Turns"
                    stroke="var(--color-avg_turns)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
