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
import { Skeleton } from "@/components/ui/skeleton";
import { useDxCosts } from "@/lib/queries";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export function CostCharts() {
  const { data: costs, isLoading } = useDxCosts(30);

  if (isLoading) {
    return <Skeleton className="h-80" />;
  }

  if (!costs?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No cost data available yet.
        </CardContent>
      </Card>
    );
  }

  // Group by date, stack by model
  const models = [...new Set(costs.map((c) => c.model))];
  const byDate = costs.reduce(
    (acc, c) => {
      if (!acc[c.date]) acc[c.date] = { date: c.date };
      acc[c.date][c.model] = (acc[c.date][c.model] as number ?? 0) + c.cost_usd;
      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );
  const chartData = Object.values(byDate).sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );

  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  const config = models.reduce(
    (acc, model, i) => {
      acc[model] = { label: model, color: colors[i % colors.length] };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  const totalCost = costs.reduce((sum, c) => sum + c.cost_usd, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Cost (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Cost by Model</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val) => `$${(val as number).toFixed(4)}`}
                    />
                  }
                />
                <Legend />
                {models.map((model, i) => (
                  <Bar
                    key={model}
                    dataKey={model}
                    name={model}
                    stackId="cost"
                    fill={colors[i % colors.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
