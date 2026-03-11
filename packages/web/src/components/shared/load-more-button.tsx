import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function LoadMoreButton({ hasMore, isLoading, onClick }: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" onClick={onClick} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Load more
      </Button>
    </div>
  );
}
