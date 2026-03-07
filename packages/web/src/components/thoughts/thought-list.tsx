import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Thought } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

const typeColors: Record<string, string> = {
  note: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  idea: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  question: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  todo: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  insight: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

interface ThoughtListProps {
  thoughts: Thought[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function ThoughtList({ thoughts, isLoading, onDelete }: ThoughtListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!thoughts.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No thoughts yet. Create your first one!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {thoughts.map((thought) => (
        <Card key={thought.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={typeColors[thought.type] ?? ""} variant="secondary">
                    {thought.type}
                  </Badge>
                  {thought.project_name && (
                    <Badge variant="outline" className="text-xs">
                      {thought.project_name}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {timeAgo(thought.created_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{thought.content}</p>
                {thought.tags && thought.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {thought.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(thought.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
