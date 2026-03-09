import { Check, X, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Reminder } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

interface ReminderListProps {
  reminders: Reminder[];
  isLoading: boolean;
  onComplete?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

function dueBadge(dueAt: string, completed: boolean, dismissed: boolean) {
  if (completed) return <Badge variant="outline" className="text-green-600">Completed</Badge>;
  if (dismissed) return <Badge variant="outline" className="text-muted-foreground">Dismissed</Badge>;

  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>;
  }

  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays === 0) {
    return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" />Due today</Badge>;
  }

  return <Badge variant="outline" className="text-muted-foreground gap-1"><Clock className="h-3 w-3" />Due in {diffDays}d</Badge>;
}

export function ReminderList({ reminders, isLoading, onComplete, onDismiss }: ReminderListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!reminders.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No reminders found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => {
        const isPending = !reminder.completed_at && !reminder.dismissed_at;

        return (
          <Card key={reminder.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!isPending ? "text-muted-foreground line-through" : ""}`}>
                  {reminder.content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {dueBadge(reminder.due_at, !!reminder.completed_at, !!reminder.dismissed_at)}
                  <span className="text-xs text-muted-foreground">
                    Created {timeAgo(reminder.created_at)}
                  </span>
                </div>
              </div>
              {isPending && (
                <div className="flex gap-1 shrink-0">
                  {onComplete && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Complete" onClick={() => onComplete(reminder.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {onDismiss && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Dismiss" onClick={() => onDismiss(reminder.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
