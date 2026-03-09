import { Lightbulb, GitFork, Timer, Heart, ArrowRightLeft, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TimelineEntry } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

const typeConfig: Record<string, { icon: typeof Lightbulb; color: string }> = {
  thought: { icon: Lightbulb, color: "bg-blue-500" },
  decision: { icon: GitFork, color: "bg-purple-500" },
  session: { icon: Timer, color: "bg-green-500" },
  sentiment: { icon: Heart, color: "bg-rose-500" },
  handoff: { icon: ArrowRightLeft, color: "bg-amber-500" },
  conversation: { icon: MessageSquare, color: "bg-cyan-500" },
};

interface TimelineProps {
  entries: TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No recent activity
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const config = typeConfig[entry.type] ?? typeConfig.thought;
        const Icon = config.icon;

        return (
          <Card key={`${entry.type}-${entry.id}`}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className={`mt-0.5 rounded-full p-1.5 text-white ${config.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {entry.type}
                  </Badge>
                  {(entry.subtype || entry.thought_type) && (
                    <Badge variant="outline" className="text-xs">
                      {entry.subtype || entry.thought_type}
                    </Badge>
                  )}
                  {entry.project_name && (
                    <span className="text-xs text-muted-foreground">
                      {entry.project_name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
                <p className="text-sm line-clamp-2">
                  {entry.title || entry.content || entry.summary || "Session"}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
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
  );
}
