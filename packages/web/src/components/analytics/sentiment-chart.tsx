import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSentiment } from "@/lib/queries";

const feelingColors: Record<string, string> = {
  frustrated: "#ef4444",
  confused: "#f59e0b",
  satisfied: "#22c55e",
  excited: "#3b82f6",
  neutral: "#6b7280",
  annoyed: "#f97316",
  impressed: "#8b5cf6",
};

export function SentimentChart() {
  const { data: sentiments, isLoading } = useSentiment({ order: "created_at.desc" });

  if (isLoading) {
    return <Skeleton className="h-80" />;
  }

  if (!sentiments?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No sentiment data available yet.
        </CardContent>
      </Card>
    );
  }

  // Group by feeling
  const counts = sentiments.reduce(
    (acc, s) => {
      acc[s.feeling] = (acc[s.feeling] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const chartData = Object.entries(counts)
    .map(([feeling, count]) => ({ name: feeling, value: count }))
    .sort((a, b) => b.value - a.value);

  // Group by target type
  const byTarget = sentiments.reduce(
    (acc, s) => {
      const key = `${s.target_type}:${s.target_name}`;
      if (!acc[key]) acc[key] = { type: s.target_type, name: s.target_name, count: 0, avgIntensity: 0 };
      acc[key].count++;
      acc[key].avgIntensity += s.intensity;
      return acc;
    },
    {} as Record<string, { type: string; name: string; count: number; avgIntensity: number }>
  );
  const topTargets = Object.values(byTarget)
    .map((t) => ({ ...t, avgIntensity: t.avgIntensity / t.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feeling Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={feelingColors[entry.name] ?? "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topTargets.map((t) => (
                <div key={`${t.type}:${t.name}`} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({t.type})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t.count} entries</span>
                    <span className="text-xs">avg {t.avgIntensity.toFixed(1)}/5</span>
                  </div>
                </div>
              ))}
              {topTargets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
