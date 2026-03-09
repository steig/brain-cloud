import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTeam, useTeamCoaching } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Users,
  RefreshCw,
  Activity,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const TIME_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
];

function ScoreGauge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 70
      ? "text-green-500"
      : score >= 40
        ? "text-yellow-500"
        : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-4xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-muted-foreground">Productivity Score</span>
    </div>
  );
}

function InsightCard({
  title,
  icon: Icon,
  items,
  emptyText,
  variant = "default",
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
  emptyText: string;
  variant?: "default" | "warning" | "success";
}) {
  const iconColor =
    variant === "warning"
      ? "text-yellow-500"
      : variant === "success"
        ? "text-green-500"
        : "text-primary";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamCoachingPage() {
  const { id } = useParams<{ id: string }>();
  const [days, setDays] = useState(7);
  const { data: team, isLoading: teamLoading } = useTeam(id ?? null);
  const {
    data: coaching,
    isLoading: coachingLoading,
    isFetching,
  } = useTeamCoaching(id ?? null, days);
  const qc = useQueryClient();

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["team-coaching", id, days] });
  };

  if (teamLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/teams/${id}/workspace`}>
            <Button variant="ghost" size="icon" aria-label="Back to workspace">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Team Coaching</h1>
            {team && (
              <p className="text-sm text-muted-foreground">{team.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(parseInt(v))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh coaching data"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {coachingLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : coaching ? (
        <>
          <div className="flex items-center gap-6 rounded-lg border p-6">
            <ScoreGauge score={coaching.productivity_score} />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {coaching.member_count} team member
                {coaching.member_count !== 1 ? "s" : ""} over the last{" "}
                {coaching.period_days} days
              </p>
              <p className="text-xs text-muted-foreground">
                Generated{" "}
                {new Date(coaching.generated_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InsightCard
              title="Highlights"
              icon={TrendingUp}
              items={coaching.highlights}
              emptyText="No highlights to report for this period."
              variant="success"
            />
            <InsightCard
              title="Challenges"
              icon={AlertTriangle}
              items={coaching.challenges}
              emptyText="No challenges identified."
              variant="warning"
            />
            <InsightCard
              title="Suggestions"
              icon={Lightbulb}
              items={coaching.suggestions}
              emptyText="No suggestions at this time."
            />
            <InsightCard
              title="Collaboration Patterns"
              icon={Users}
              items={coaching.collaboration_patterns}
              emptyText="Not enough data to identify patterns."
            />
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">
              No coaching data available
            </p>
            <p className="text-sm text-muted-foreground">
              Try a different time range or check back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
