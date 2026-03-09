import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Target, Trophy, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

const moodEmoji: Record<string, string> = {
  focused: "🎯",
  exploratory: "🔍",
  debugging: "🐛",
  urgent: "🚨",
  productive: "✅",
  blocked: "🚧",
  partial: "⚡",
  successful: "🎉",
};

interface SessionListProps {
  sessions: Session[];
  isLoading: boolean;
}

export function SessionList({ sessions, isLoading }: SessionListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No sessions recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isOpen = expanded.has(session.id);
        const duration =
          session.ended_at && session.started_at
            ? Math.round(
                (new Date(session.ended_at).getTime() -
                  new Date(session.started_at).getTime()) /
                  60000
              )
            : null;

        return (
          <Card key={session.id}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {moodEmoji[session.mood_start ?? ""] ?? "💭"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatDateTime(session.started_at)}
                      </span>
                      {session.mood_start && (
                        <Badge variant="secondary" className="text-xs">
                          {session.mood_start}
                        </Badge>
                      )}
                      {session.mood_end && session.mood_end !== session.mood_start && (
                        <>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant="secondary" className="text-xs">
                            {moodEmoji[session.mood_end] ?? ""} {session.mood_end}
                          </Badge>
                        </>
                      )}
                    </div>
                    {duration !== null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        {duration}m
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.scores && (
                    <Badge variant="outline">
                      Score: {session.scores.overall_score?.toFixed(1)}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Toggle session details" onClick={() => toggle(session.id)}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {session.summary && (
                  <Markdown content={session.summary} compact />
                )}

                {session.goals && session.goals.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <Target className="h-3 w-3" /> Goals
                    </div>
                    <Markdown content={session.goals.map((g) => "- " + g).join("\n")} compact />
                  </div>
                )}

                {session.accomplishments && session.accomplishments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <Trophy className="h-3 w-3" /> Accomplishments
                    </div>
                    <Markdown content={session.accomplishments.map((a) => "- " + a).join("\n")} compact />
                  </div>
                )}

                {session.blockers && session.blockers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <AlertTriangle className="h-3 w-3" /> Blockers
                    </div>
                    <Markdown content={session.blockers.map((b) => "- " + b).join("\n")} compact />
                  </div>
                )}

                {session.scores && (
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                    {(
                      [
                        ["Productivity", session.scores.productivity_score],
                        ["Sentiment", session.scores.sentiment_score],
                        ["Flow", session.scores.flow_score],
                        ["Overall", session.scores.overall_score],
                      ] as const
                    ).map(([label, val]) => (
                      <div key={label} className="text-center">
                        <div className="text-lg font-bold">{val?.toFixed(1) ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
