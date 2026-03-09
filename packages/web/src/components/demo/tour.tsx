import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/config";

interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Route to navigate to before highlighting */
  route: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='dashboard']",
    route: "/dashboard",
    title: "Your week at a glance",
    description:
      "The dashboard shows your recent thoughts, decisions, and sessions — everything captured automatically as you work.",
  },
  {
    target: "[data-tour='thoughts']",
    route: "/thoughts",
    title: "Every insight is searchable",
    description:
      "Notes, ideas, todos, and insights are all captured with tags and project context. Click any thought to see related entries found by semantic search.",
  },
  {
    target: "[data-tour='decisions']",
    route: "/decisions",
    title: "Decisions with full context",
    description:
      "Track what you chose, why you chose it, and how it turned out. Review past decisions to learn from your own patterns.",
  },
  {
    target: "[data-tour='coaching']",
    route: "/coaching",
    title: "AI-powered coaching",
    description:
      "Get scored across 5 dimensions — productivity, decision-making, AI collaboration, wellbeing, and growth. Actionable tips based on your actual work patterns.",
  },
  {
    target: "[data-tour='sessions']",
    route: "/sessions",
    title: "Session tracking",
    description:
      "Every coding session captures goals, accomplishments, and mood. See your productivity patterns emerge over time.",
  },
  {
    target: "",
    route: "",
    title: "Ready to build your own brain?",
    description:
      "Sign up for free and connect your development tools. Your thoughts, decisions, and sessions are captured automatically via the CLI.",
  },
];

const STORAGE_KEY = "demo_tour_step";

function getStoredStep(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v !== null) {
      const n = parseInt(v, 10);
      if (n >= 0 && n < TOUR_STEPS.length) return n;
    }
  } catch {
    // localStorage may be unavailable
  }
  return 0;
}

function setStoredStep(step: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(step));
  } catch {
    // ignore
  }
}

function clearStoredStep() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function useTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const start = useCallback((fromStep?: number) => {
    const s = fromStep ?? getStoredStep();
    setStep(s);
    setStoredStep(s);
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    clearStoredStep();
  }, []);

  const next = useCallback(() => {
    setStep((prev) => {
      const n = prev + 1;
      setStoredStep(n);
      return n;
    });
  }, []);

  const prev = useCallback(() => {
    setStep((prev) => {
      const n = Math.max(0, prev - 1);
      setStoredStep(n);
      return n;
    });
  }, []);

  const restart = useCallback(() => {
    setStep(0);
    setStoredStep(0);
    setActive(true);
  }, []);

  return { active, step, start, stop, next, prev, restart, totalSteps: TOUR_STEPS.length };
}

interface TourOverlayProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  totalSteps: number;
}

export function TourOverlay({ step, onNext, onPrev, onSkip, totalSteps }: TourOverlayProps) {
  const navigate = useNavigate();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const currentStep = TOUR_STEPS[step];
  const isLastStep = step === totalSteps - 1;

  // Navigate to the correct route and find the target element
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.route) {
      navigate(currentStep.route);
    }

    // Wait for route change and DOM update
    const timer = setTimeout(() => {
      if (!currentStep.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(currentStep.target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Small delay after scroll for accurate position
        setTimeout(() => {
          setRect(el.getBoundingClientRect());
        }, 100);
      } else {
        setRect(null);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [step, currentStep, navigate]);

  // Recompute rect on resize
  useEffect(() => {
    if (!currentStep?.target) return;

    const handleResize = () => {
      const el = document.querySelector(currentStep.target);
      if (el) setRect(el.getBoundingClientRect());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentStep]);

  if (!currentStep) return null;

  const padding = 8;
  const hasTarget = rect !== null;

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {};
  if (hasTarget) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const tooltipWidth = 380;

    if (spaceBelow > 200) {
      // Position below
      tooltipStyle = {
        top: rect.bottom + padding + 8,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16)),
      };
    } else if (spaceAbove > 200) {
      // Position above
      tooltipStyle = {
        bottom: window.innerHeight - rect.top + padding + 8,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16)),
      };
    } else {
      // Center
      tooltipStyle = {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
  } else {
    // No target — center the tooltip
    tooltipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-label="Guided tour">
      {/* SVG overlay with cutout */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={rect.left - padding}
                y={rect.top - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={onSkip}
        />
      </svg>

      {/* Spotlight ring */}
      {hasTarget && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 transition-all duration-300"
          style={{
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-[10000] w-[380px] rounded-lg border bg-card p-5 shadow-xl transition-all duration-300"
        style={tooltipStyle}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {step + 1} / {totalSteps}
          </span>
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </button>
        </div>
        <h3 className="mb-2 text-lg font-semibold">{currentStep.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          {currentStep.description}
        </p>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={step === 0}
          >
            Previous
          </Button>
          {isLastStep ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onSkip}>
                Explore on my own
              </Button>
              <Button size="sm" asChild>
                <a href={`${APP_URL}login`}>Sign up free</a>
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onNext}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
