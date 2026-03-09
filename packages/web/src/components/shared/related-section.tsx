import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RelatedEntry } from "@/lib/api";

interface Props {
  entries: RelatedEntry[] | undefined;
  isLoading: boolean;
}

export function RelatedSection({ entries, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-32" />;
  if (!entries?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Related</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            to={entry.type === "decision" ? `/decisions` : `/thoughts`}
            className="block rounded-md p-2 text-sm hover:bg-accent transition-colors"
          >
            <div className="font-medium truncate">
              {entry.title ?? entry.content?.slice(0, 80)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="capitalize">{entry.type}</span>
              <span>{Math.round(entry.similarity * 100)}% match</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
