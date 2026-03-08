import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoachingData } from "@/lib/queries";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Zap, Brain, Handshake, Heart, TrendingUp } from "lucide-react";

interface DimensionCard {
  name: string;
  key: string;
  icon: React.ReactNode;
  score: number;
  explanation: string;
  tip: string;
}

function computeDimensions(data: NonNullable<ReturnType<typeof useCoachingData>["data"]>): DimensionCard[] {
  const { sessions, thoughts, decisions, sentiment, conversations } = data;

  // Productivity: based on session completion and accomplishments
  const sessionCompletionRate = sessions.total > 0 ? sessions.completed / sessions.total : 0;
  const accomplishmentRate = sessions.total > 0 ? sessions.with_accomplishments / sessions.total : 0;
  const productivityScore = Math.min(10, Math.round((sessionCompletionRate * 5 + accomplishmentRate * 5) * 10) / 10);

  // Decision-Making: based on decision volume and outcomes
  const decisionOutcomeRate = decisions.total > 0 ? decisions.with_outcome / decisions.total : 0;
  const decisionScore = Math.min(10, Math.round((Math.min(decisions.total / 5, 1) * 5 + decisionOutcomeRate * 5) * 10) / 10);

  // AI Collaboration: based on conversation quality and context
  const avgQuality = conversations.avg_quality ?? 0;
  const goalRate = conversations.goal_rate ?? 0;
  const contextRate = conversations.context_rate ?? 0;
  const aiScore = Math.min(10, Math.round(((avgQuality / 5) * 4 + goalRate * 3 + contextRate * 3) * 10) / 10);

  // Wellbeing: based on sentiment balance
  const totalSentiment = sentiment.reduce((sum, s) => sum + s.count, 0);
  const positiveFeelings = sentiment
    .filter((s) => ["satisfied", "excited", "impressed"].includes(s.feeling))
    .reduce((sum, s) => sum + s.count, 0);
  const negativeFeelings = sentiment
    .filter((s) => ["frustrated", "confused", "annoyed"].includes(s.feeling))
    .reduce((sum, s) => sum + s.count, 0);
  const wellbeingRatio = totalSentiment > 0 ? positiveFeelings / totalSentiment : 0.5;
  const wellbeingScore = Math.min(10, Math.round(wellbeingRatio * 10 * 10) / 10);

  // Growth: based on insights and ideas generated
  const insightRate = thoughts.total > 0 ? thoughts.insights / thoughts.total : 0;
  const ideaCount = thoughts.ideas;
  const growthScore = Math.min(10, Math.round((insightRate * 5 + Math.min(ideaCount / 3, 1) * 5) * 10) / 10);

  return [
    {
      name: "Productivity",
      key: "productivity",
      icon: <Zap className="h-4 w-4" />,
      score: productivityScore || 0,
      explanation: `${sessions.completed}/${sessions.total} sessions completed, ${sessions.with_accomplishments} with accomplishments`,
      tip: sessions.with_accomplishments < sessions.completed
        ? "Try recording accomplishments at the end of each session"
        : "Keep up the momentum with consistent session tracking",
    },
    {
      name: "Decision-Making",
      key: "decisions",
      icon: <Brain className="h-4 w-4" />,
      score: decisionScore || 0,
      explanation: `${decisions.total} decisions made, ${decisions.with_outcome} with recorded outcomes`,
      tip: decisionOutcomeRate < 0.5
        ? "Review past decisions and record their outcomes"
        : "Great follow-through on tracking decision outcomes",
    },
    {
      name: "AI Collaboration",
      key: "ai",
      icon: <Handshake className="h-4 w-4" />,
      score: aiScore || 0,
      explanation: `${conversations.total} conversations, avg quality ${(avgQuality).toFixed(1)}/5`,
      tip: goalRate < 0.7
        ? "Be more specific in your prompts to improve goal achievement"
        : "Your prompts are effective — keep providing clear context",
    },
    {
      name: "Wellbeing",
      key: "wellbeing",
      icon: <Heart className="h-4 w-4" />,
      score: wellbeingScore || 0,
      explanation: `${positiveFeelings} positive vs ${negativeFeelings} negative sentiments`,
      tip: negativeFeelings > positiveFeelings
        ? "Take breaks when frustrated; step back from confusing code"
        : "Healthy sentiment balance — good self-awareness",
    },
    {
      name: "Growth",
      key: "growth",
      icon: <TrendingUp className="h-4 w-4" />,
      score: growthScore || 0,
      explanation: `${thoughts.insights} insights and ${thoughts.ideas} ideas from ${thoughts.total} thoughts`,
      tip: insightRate < 0.1
        ? "Pause to reflect on what you learned during each session"
        : "Strong reflection habit — insights are compounding",
    },
  ];
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 7 ? "bg-green-500" : score >= 4 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export function CoachingTab() {
  const coaching = useCoachingData(7);

  if (coaching.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (coaching.isError || !coaching.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No coaching data available. Start using Brain MCP to generate insights.
        </CardContent>
      </Card>
    );
  }

  const dimensions = computeDimensions(coaching.data);
  const radarData = dimensions.map((d) => ({ dimension: d.name, score: d.score }));

  return (
    <div className="space-y-4">
      {/* Radar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Coaching Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ score: { label: "Score", color: "var(--chart-1)" } }}
            className="h-72"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
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

      {/* Dimension cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dimensions.map((dim) => (
          <Card key={dim.key}>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              {dim.icon}
              <CardTitle className="text-sm font-medium">{dim.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ScoreBar score={dim.score} />
              <p className="text-xs text-muted-foreground">{dim.explanation}</p>
              <p className="text-xs font-medium">{dim.tip}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
