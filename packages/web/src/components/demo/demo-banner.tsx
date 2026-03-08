import { useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/config";

export function DemoBanner() {
  const { isDemo } = useDemo();

  if (!isDemo) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground">
      <span>You're viewing a demo — Sign up to save your own data</span>
      <Button asChild size="sm" variant="secondary" className="h-7 text-xs">
        <a href={`${APP_URL}login`}>Sign up</a>
      </Button>
    </div>
  );
}
