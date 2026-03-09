import { Lightbulb, GitFork, Timer, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BrainSummary } from "@/lib/api";

interface StatsCardsProps {
  thoughtCount?: number;
  decisionCount?: number;
  sessionCount?: number;
  summary?: BrainSummary;
  isLoading: boolean;
}

export function StatsCards({
  thoughtCount,
  decisionCount,
  sessionCount,
  summary,
  isLoading,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Thoughts",
      value: thoughtCount ?? 0,
      icon: Lightbulb,
      description: "this week",
    },
    {
      title: "Decisions",
      value: decisionCount ?? 0,
      icon: GitFork,
      description: "this week",
    },
    {
      title: "Sessions",
      value: sessionCount ?? 0,
      icon: Timer,
      description: "this week",
    },
    {
      title: "Active Days",
      value: summary?.stats?.active_days ?? 0,
      icon: TrendingUp,
      description: "this week",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ title, value, icon: Icon, description }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
