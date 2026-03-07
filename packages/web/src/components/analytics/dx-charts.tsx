import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDxSummary } from "@/lib/queries";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export function DxCharts() {
  const { data, isLoading } = useDxSummary(30);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const summary = data as Record<string, unknown> | undefined;
  const events = (summary?.daily_events as Array<Record<string, unknown>>) ?? [];
  const stats = {
    totalCommands: (summary?.total_commands as number) ?? 0,
    successRate: (summary?.success_rate as number) ?? 0,
    totalTokensIn: (summary?.total_tokens_in as number) ?? 0,
    totalTokensOut: (summary?.total_tokens_out as number) ?? 0,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCommands.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.successRate * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tokens In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalTokensIn / 1000).toFixed(0)}k</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tokens Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalTokensOut / 1000).toFixed(0)}k</div>
          </CardContent>
        </Card>
      </div>

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                tokens_in: { label: "Tokens In", color: "var(--chart-1)" },
                tokens_out: { label: "Tokens Out", color: "var(--chart-2)" },
              }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={events}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="tokens_in"
                    name="Tokens In"
                    stackId="1"
                    stroke="var(--color-tokens_in)"
                    fill="var(--color-tokens_in)"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens_out"
                    name="Tokens Out"
                    stackId="1"
                    stroke="var(--color-tokens_out)"
                    fill="var(--color-tokens_out)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
