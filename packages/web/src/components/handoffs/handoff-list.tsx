import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Handoff } from "@/lib/api";
import { useClaimHandoff } from "@/lib/queries";
import { timeAgo } from "@/lib/utils";

interface HandoffListProps {
  handoffs: Handoff[];
  isLoading: boolean;
}

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const typeLabels: Record<string, string> = {
  context: "Context",
  decision: "Decision",
  blocker: "Blocker",
  task: "Task",
};

export function HandoffList({ handoffs, isLoading }: HandoffListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const claimMutation = useClaimHandoff();

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
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!handoffs.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No handoffs yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {handoffs.map((handoff) => {
        const isOpen = expanded.has(handoff.id);
        const isPending = handoff.status === "pending";
        const StatusIcon = isPending ? Clock : CheckCircle2;
        const statusColor = isPending ? "text-amber-500" : "text-green-500";

        return (
          <Card key={handoff.id}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <StatusIcon
                    className={`h-5 w-5 mt-0.5 ${statusColor}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {handoff.from_project && (
                        <span className="text-sm font-medium">
                          {handoff.from_project}
                        </span>
                      )}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {handoff.to_project}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {handoff.message.slice(0, 200)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(handoff.created_at)}
                  </span>
                  {isPending && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={claimMutation.isPending}
                      onClick={() => claimMutation.mutate({ id: handoff.id })}
                    >
                      Claim
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggle(handoff.id)}
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex gap-1 mt-2 ml-8 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {typeLabels[handoff.handoff_type] || handoff.handoff_type}
                </Badge>
                <Badge
                  className={`text-xs border-0 ${priorityStyles[handoff.priority] || ""}`}
                >
                  {handoff.priority}
                </Badge>
                {!isPending && (
                  <Badge
                    variant="outline"
                    className="text-xs text-green-600 border-green-300"
                  >
                    claimed
                  </Badge>
                )}
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="px-4 pb-4 pt-0 ml-8">
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Message
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {handoff.message}
                  </p>
                </div>

                {handoff.claim_note && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Claim Note
                    </p>
                    <p className="text-sm">{handoff.claim_note}</p>
                  </div>
                )}

                {handoff.claimed_at && (
                  <p className="text-xs text-muted-foreground">
                    Claimed {timeAgo(handoff.claimed_at)}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
