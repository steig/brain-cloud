import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCoachingData } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import type { CoachingData } from "@/lib/api";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Markdown } from "@/components/shared/markdown";
import {
  Zap,
  Brain,
  Handshake,
  Heart,
  TrendingUp,
  RefreshCw,
  GraduationCap,
} from "lucide-react";

// --- Dimension scoring logic (shared with coaching-tab) ---

interface Dimension {
  name: string;
  key: string;
  icon: React.ReactNode;
  score: number;
  explanation: string;
  tip: string;
}

function computeDimensions(data: CoachingData): Dimension[] {
  const { sessions, thoughts, decisions, sentiment, conversations } = data;

  const sessionCompletionRate =
    sessions.total > 0 ? sessions.completed / sessions.total : 0;
  const accomplishmentRate =
    sessions.total > 0 ? sessions.with_accomplishments / sessions.total : 0;
  const productivityScore =
    Math.min(
      10,
      Math.round((sessionCompletionRate * 5 + accomplishmentRate * 5) * 10) / 10
    );

  const decisionOutcomeRate =
    decisions.total > 0 ? decisions.with_outcome / decisions.total : 0;
  const decisionScore =
    Math.min(
      10,
      Math.round(
        (Math.min(decisions.total / 5, 1) * 5 + decisionOutcomeRate * 5) * 10
      ) / 10
    );

  const avgQuality = conversations.avg_quality ?? 0;
  const goalRate = conversations.goal_rate ?? 0;
  const contextRate = conversations.context_rate ?? 0;
  const aiScore =
    Math.min(
      10,
      Math.round(
        ((avgQuality / 5) * 4 + goalRate * 3 + contextRate * 3) * 10
      ) / 10
    );

  const totalSentiment = sentiment.reduce((sum, s) => sum + s.count, 0);
  const positiveFeelings = sentiment
    .filter((s) => ["satisfied", "excited", "impressed"].includes(s.feeling))
    .reduce((sum, s) => sum + s.count, 0);
  const negativeFeelings = sentiment
    .filter((s) => ["frustrated", "confused", "annoyed"].includes(s.feeling))
    .reduce((sum, s) => sum + s.count, 0);
  const wellbeingRatio =
    totalSentiment > 0 ? positiveFeelings / totalSentiment : 0.5;
  const wellbeingScore =
    Math.min(10, Math.round(wellbeingRatio * 10 * 10) / 10);

  const insightRate =
    thoughts.total > 0 ? thoughts.insights / thoughts.total : 0;
  const ideaCount = thoughts.ideas;
  const growthScore =
    Math.min(
      10,
      Math.round((insightRate * 5 + Math.min(ideaCount / 3, 1) * 5) * 10) / 10
    );

  return [
    {
      name: "Productivity",
      key: "productivity",
      icon: <Zap className="h-5 w-5" />,
      score: productivityScore || 0,
      explanation: `${sessions.completed}/${sessions.total} sessions completed, ${sessions.with_accomplishments} with accomplishments`,
      tip:
        sessions.with_accomplishments < sessions.completed
          ? "Try recording accomplishments at the end of each session"
          : "Keep up the momentum with consistent session tracking",
    },
    {
      name: "Decision-Making",
      key: "decisions",
      icon: <Brain className="h-5 w-5" />,
      score: decisionScore || 0,
      explanation: `${decisions.total} decisions made, ${decisions.with_outcome} with recorded outcomes`,
      tip:
        decisionOutcomeRate < 0.5
          ? "Review past decisions and record their outcomes"
          : "Great follow-through on tracking decision outcomes",
    },
    {
      name: "AI Collaboration",
      key: "ai",
      icon: <Handshake className="h-5 w-5" />,
      score: aiScore || 0,
      explanation: `${conversations.total} conversations, avg quality ${avgQuality.toFixed(1)}/5`,
      tip:
        goalRate < 0.7
          ? "Be more specific in your prompts to improve goal achievement"
          : "Your prompts are effective -- keep providing clear context",
    },
    {
      name: "Wellbeing",
      key: "wellbeing",
      icon: <Heart className="h-5 w-5" />,
      score: wellbeingScore || 0,
      explanation: `${positiveFeelings} positive vs ${negativeFeelings} negative sentiments`,
      tip:
        negativeFeelings > positiveFeelings
          ? "Take breaks when frustrated; step back from confusing code"
          : "Healthy sentiment balance -- good self-awareness",
    },
    {
      name: "Growth",
      key: "growth",
      icon: <TrendingUp className="h-5 w-5" />,
      score: growthScore || 0,
      explanation: `${thoughts.insights} insights and ${thoughts.ideas} ideas from ${thoughts.total} thoughts`,
      tip:
        insightRate < 0.1
          ? "Pause to reflect on what you learned during each session"
          : "Strong reflection habit -- insights are compounding",
    },
  ];
}

// --- Components ---

function OverallScore({ dimensions }: { dimensions: Dimension[] }) {
  const avg =
    dimensions.length > 0
      ? dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length
      : 0;
  const rounded = Math.round(avg * 10) / 10;

  // SVG circular progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (avg / 10) * circumference;
  const color =
    avg >= 7
      ? "text-green-500"
      : avg >= 4
        ? "text-yellow-500"
        : "text-red-500";
  const strokeColor =
    avg >= 7
      ? "stroke-green-500"
      : avg >= 4
        ? "stroke-yellow-500"
        : "stroke-red-500";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Overall Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pb-6">
        <div className="relative h-36 w-36">
          <svg
            className="h-36 w-36 -rotate-90"
            viewBox="0 0 128 128"
          >
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              className="stroke-muted"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              className={strokeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${color}`}>{rounded}</span>
            <span className="text-xs text-muted-foreground">/ 10</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {avg >= 7
            ? "Strong performance across all dimensions."
            : avg >= 4
              ? "Good progress. Focus on the lower-scoring areas."
              : "Getting started. Keep logging sessions to improve."}
        </p>
      </CardContent>
    </Card>
  );
}

function DimensionBar({ dim }: { dim: Dimension }) {
  const pct = (dim.score / 10) * 100;
  const color =
    dim.score >= 7
      ? "bg-green-500"
      : dim.score >= 4
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          {dim.icon}
          <span className="text-sm font-medium flex-1">{dim.name}</span>
          <Badge
            variant={
              dim.score >= 7
                ? "default"
                : dim.score >= 4
                  ? "secondary"
                  : "destructive"
            }
          >
            {dim.score.toFixed(1)}
          </Badge>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className={`h-2 rounded-full ${color}`}
            style={{
              width: `${pct}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <Markdown content={dim.explanation} compact className="text-xs text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function CoachingTips({ dimensions }: { dimensions: Dimension[] }) {
  // Sort by score ascending so weakest areas appear first
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((dim) => (
          <div
            key={dim.key}
            className="flex items-start gap-3 rounded-md border p-3"
          >
            <div className="mt-0.5 shrink-0">{dim.icon}</div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{dim.name}</p>
              <Markdown content={dim.tip} compact className="text-sm text-muted-foreground" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivitySnapshot({ data }: { data: CoachingData }) {
  const stats = [
    { label: "Sessions", value: data.sessions.total },
    { label: "Completed", value: data.sessions.completed },
    { label: "Thoughts", value: data.thoughts.total },
    { label: "Decisions", value: data.decisions.total },
    { label: "Conversations", value: data.conversations.total },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const TIME_RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

export function CoachingPage() {
  const [days, setDays] = useState<number>(7);
  const coaching = useCoachingData(days);
  const qc = useQueryClient();

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["coaching-data", days] });
  };

  if (coaching.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Coaching</h1>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56 lg:col-span-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (coaching.isError || !coaching.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Coaching</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No coaching data available. Start using Brain MCP to generate
            insights.
          </CardContent>
        </Card>
      </div>
    );
  }

  const dimensions = computeDimensions(coaching.data);
  const radarData = dimensions.map((d) => ({
    dimension: d.name,
    score: d.score,
  }));

  return (
    <div className="space-y-6" data-tour="coaching">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Coaching</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Time range toggle */}
          <div className="flex rounded-md border">
            {TIME_RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                  days === r.days
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={coaching.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${coaching.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top row: Overall score + Radar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OverallScore dimensions={dimensions} />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dimension Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ score: { label: "Score", color: "var(--chart-1)" } }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 10]}
                    tick={{ fontSize: 10 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="var(--color-score)"
                    fill="var(--color-score)"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Dimension progress bars */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {dimensions.map((dim) => (
          <DimensionBar key={dim.key} dim={dim} />
        ))}
      </div>

      {/* Activity + Recommendations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivitySnapshot data={coaching.data} />
        <CoachingTips dimensions={dimensions} />
      </div>
    </div>
  );
}
