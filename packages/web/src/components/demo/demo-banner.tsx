import { useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/config";
import { useTour, TourOverlay } from "./tour";

export function DemoBanner() {
  const { isDemo } = useDemo();
  const tour = useTour();

  if (!isDemo) return null;

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground">
        <span>You're viewing a demo — Sign up to save your own data</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => tour.restart()}
        >
          Restart Tour
        </Button>
        <Button asChild size="sm" variant="secondary" className="h-7 text-xs">
          <a href={`${APP_URL}login`}>Sign up</a>
        </Button>
      </div>
      {tour.active && (
        <TourOverlay
          step={tour.step}
          onNext={tour.next}
          onPrev={tour.prev}
          onSkip={tour.stop}
          totalSteps={tour.totalSteps}
        />
      )}
    </>
  );
}
