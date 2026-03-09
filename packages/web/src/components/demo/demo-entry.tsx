import { useEffect, useState } from "react";
import { useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Play, Eye } from "lucide-react";
import { useTour, TourOverlay } from "./tour";

const STORAGE_KEY = "demo_tour_step";

/** Route component for /demo — shows intro then enters demo mode */
export function DemoEntry() {
  const { isDemo, enterDemo } = useDemo();
  const tour = useTour();
  const [entered, setEntered] = useState(false);

  // If already in demo mode (e.g. navigated back to /demo), show tour controls
  useEffect(() => {
    if (isDemo) setEntered(true);
  }, [isDemo]);

  const handleStartTour = () => {
    enterDemo();
    setEntered(true);
    // Small delay so the dashboard renders first
    setTimeout(() => tour.start(0), 300);
  };

  const handleExplore = () => {
    enterDemo();
    setEntered(true);
  };

  const handleResumeTour = () => {
    enterDemo();
    setEntered(true);
    setTimeout(() => tour.start(), 300);
  };

  const hasProgress = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  })();

  // When entered + tour active, show overlay
  if (entered && tour.active) {
    return (
      <TourOverlay
        step={tour.step}
        onNext={tour.next}
        onPrev={tour.prev}
        onSkip={tour.stop}
        totalSteps={tour.totalSteps}
      />
    );
  }

  // Already entered without tour — nothing to render (dashboard is showing)
  if (entered) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">See Brain Cloud in action</h1>
            <p className="mt-2 text-muted-foreground">
              Explore with sample data from a real developer's week — thoughts, decisions, sessions, and coaching insights.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button size="lg" className="w-full gap-2" onClick={handleStartTour}>
              <Play className="h-4 w-4" />
              Start guided tour
            </Button>
            {hasProgress && (
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={handleResumeTour}
              >
                <Play className="h-4 w-4" />
                Resume tour
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              className="w-full gap-2"
              onClick={handleExplore}
            >
              <Eye className="h-4 w-4" />
              Explore on your own
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No account needed. All data is local to your browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
