import { useParams, Link } from "react-router-dom";
import { useTeam, useTeamFeed } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  Brain,
  GitFork,
  Timer,
} from "lucide-react";

const typeConfig = {
  thought: { icon: Brain, label: "Thought", color: "text-blue-500" },
  decision: { icon: GitFork, label: "Decision", color: "text-purple-500" },
  session: { icon: Timer, label: "Session", color: "text-green-500" },
} as const;

export function TeamWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading: teamLoading } = useTeam(id ?? null);
  const { data: feed, isLoading: feedLoading } = useTeamFeed(id ?? null);

  if (teamLoading || feedLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-3xl">
        <p className="text-muted-foreground">Team not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/teams">
          <Button variant="ghost" size="icon" aria-label="Back to teams">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{team.name} - Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Recent activity from all team members
          </p>
        </div>
      </div>

      {!feed || feed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No activity yet</p>
            <p className="text-sm text-muted-foreground">
              Team members' thoughts, decisions, and sessions will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;

            return (
              <Card key={`${item.type}-${item.id}`}>
                <CardContent className="flex gap-4 py-4">
                  <div className={`mt-1 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={item.user_avatar ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {item.user_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{item.user_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.type === "thought" && item.thought_type
                          ? item.thought_type
                          : config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.title || item.content || "No content"}
                    </p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {item.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
