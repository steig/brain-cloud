import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import type { Decision } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

interface DecisionListProps {
  decisions: Decision[];
  isLoading: boolean;
}

export function DecisionList({ decisions, isLoading }: DecisionListProps) {
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
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (!decisions.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No decisions recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {decisions.map((decision) => {
        const isOpen = expanded.has(decision.id);
        const OutcomeIcon = decision.outcome
          ? CheckCircle2
          : decision.chosen
            ? Circle
            : AlertCircle;
        const outcomeColor = decision.outcome
          ? "text-green-500"
          : decision.chosen
            ? "text-blue-500"
            : "text-muted-foreground";

        return (
          <Card key={decision.id}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <OutcomeIcon className={`h-5 w-5 mt-0.5 ${outcomeColor}`} />
                  <div>
                    <CardTitle className="text-base">{decision.title}</CardTitle>
                    {decision.chosen && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Chose: <span className="font-medium text-foreground">{decision.chosen}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {decision.access_count === 0 && !decision.last_accessed_at &&
                    Math.floor((Date.now() - new Date(decision.created_at).getTime()) / 86400000) > 90 && (
                      <span className="text-xs text-muted-foreground/60 italic">Never reviewed</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(decision.created_at)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Toggle details" onClick={() => toggle(decision.id)}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {decision.tags && decision.tags.length > 0 && (
                <div className="flex gap-1 mt-2 ml-8">
                  {decision.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>

            {isOpen && (
              <CardContent className="px-4 pb-4 pt-0 ml-8">
                {decision.context && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Context</p>
                    <Markdown content={decision.context} compact />
                  </div>
                )}

                {decision.options && decision.options.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Options Considered</p>
                    <div className="space-y-2">
                      {decision.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`rounded-md border p-3 text-sm ${
                            opt.option === decision.chosen ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          <p className="font-medium">{opt.option}</p>
                          {opt.pros?.length > 0 && (
                            <div className="mt-1 text-green-600 dark:text-green-400 text-xs">
                              {opt.pros.map((p, j) => (
                                <div key={j} className="flex gap-1">
                                  <span>+</span>
                                  <Markdown content={p} compact className="[&>*]:!my-0 text-xs text-green-600 dark:text-green-400" />
                                </div>
                              ))}
                            </div>
                          )}
                          {opt.cons?.length > 0 && (
                            <div className="mt-1 text-red-600 dark:text-red-400 text-xs">
                              {opt.cons.map((c, j) => (
                                <div key={j} className="flex gap-1">
                                  <span>-</span>
                                  <Markdown content={c} compact className="[&>*]:!my-0 text-xs text-red-600 dark:text-red-400" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {decision.rationale && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Rationale</p>
                    <Markdown content={decision.rationale} compact />
                  </div>
                )}

                {decision.outcome && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Outcome</p>
                    <Markdown content={decision.outcome} compact />
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
