import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Thought, type Decision, type Session } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Brain,
  Scale,
  Monitor,
} from "lucide-react";

type ViewMode = "month" | "week";

interface DayCounts {
  thoughts: number;
  decisions: number;
  sessions: number;
}

interface DayEntries {
  thoughts: Thought[];
  decisions: Decision[];
  sessions: Session[];
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getWeekRange(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: Date[] = [];

  // Pad with previous month days
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Pad with next month days
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

function buildWeekGrid(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(date);
    d.setDate(date.getDate() - dayOfWeek + i);
    days.push(d);
  }
  return days;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function useCalendarData(startDate: string, endDate: string) {
  const thoughts = useQuery({
    queryKey: ["calendar-thoughts", startDate, endDate],
    queryFn: () =>
      api.get<Thought[]>(
        `/api/thoughts?created_at=gte.${startDate}T00:00:00Z&created_at=lte.${endDate}T23:59:59Z&order=created_at.desc`
      ),
  });

  const decisions = useQuery({
    queryKey: ["calendar-decisions", startDate, endDate],
    queryFn: () =>
      api.get<Decision[]>(
        `/api/decisions?created_at=gte.${startDate}T00:00:00Z&created_at=lte.${endDate}T23:59:59Z&order=created_at.desc`
      ),
  });

  const sessions = useQuery({
    queryKey: ["calendar-sessions", startDate, endDate],
    queryFn: () =>
      api.get<Session[]>(
        `/api/sessions?started_at=gte.${startDate}T00:00:00Z&started_at=lte.${endDate}T23:59:59Z&order=started_at.desc`
      ),
  });

  return {
    thoughts: thoughts.data ?? [],
    decisions: decisions.data ?? [],
    sessions: sessions.data ?? [],
    isLoading: thoughts.isLoading || decisions.isLoading || sessions.isLoading,
  };
}

function groupByDay(data: {
  thoughts: Thought[];
  decisions: Decision[];
  sessions: Session[];
}) {
  const map: Record<string, DayEntries> = {};

  const ensure = (key: string) => {
    if (!map[key]) map[key] = { thoughts: [], decisions: [], sessions: [] };
    return map[key];
  };

  for (const t of data.thoughts) {
    const key = t.created_at.slice(0, 10);
    ensure(key).thoughts.push(t);
  }
  for (const d of data.decisions) {
    const key = d.created_at.slice(0, 10);
    ensure(key).decisions.push(d);
  }
  for (const s of data.sessions) {
    const key = s.started_at.slice(0, 10);
    ensure(key).sessions.push(s);
  }

  return map;
}

function DayDots({ counts }: { counts: DayCounts }) {
  return (
    <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
      {counts.thoughts > 0 && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-blue-500"
          title={`${counts.thoughts} thought${counts.thoughts > 1 ? "s" : ""}`}
        />
      )}
      {counts.decisions > 0 && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-orange-500"
          title={`${counts.decisions} decision${counts.decisions > 1 ? "s" : ""}`}
        />
      )}
      {counts.sessions > 0 && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-green-500"
          title={`${counts.sessions} session${counts.sessions > 1 ? "s" : ""}`}
        />
      )}
    </div>
  );
}

function DayDetail({ entries }: { entries: DayEntries; date: Date }) {
  const total =
    entries.thoughts.length + entries.decisions.length + entries.sessions.length;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No entries for this day.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.sessions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">
              Sessions ({entries.sessions.length})
            </span>
          </div>
          <div className="space-y-2">
            {entries.sessions.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {s.mood_start && (
                      <Badge variant="secondary" className="text-xs">
                        {s.mood_start}
                      </Badge>
                    )}
                    {s.mood_end && s.mood_end !== s.mood_start && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          →
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {s.mood_end}
                        </Badge>
                      </>
                    )}
                    {s.project_name && (
                      <Badge variant="outline" className="text-xs">
                        {s.project_name}
                      </Badge>
                    )}
                  </div>
                  {s.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {s.summary}
                    </p>
                  )}
                  {s.goals && s.goals.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Goals: {s.goals.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {entries.thoughts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              Thoughts ({entries.thoughts.length})
            </span>
          </div>
          <div className="space-y-2">
            {entries.thoughts.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {t.type}
                    </Badge>
                    {t.project_name && (
                      <Badge variant="outline" className="text-xs">
                        {t.project_name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3">{t.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {entries.decisions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">
              Decisions ({entries.decisions.length})
            </span>
          </div>
          <div className="space-y-2">
            {entries.decisions.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{d.title}</p>
                  {d.chosen && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Chose: {d.chosen}
                    </p>
                  )}
                  {d.project_name && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {d.project_name}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const range =
    viewMode === "month"
      ? getMonthRange(year, month)
      : getWeekRange(year, month, selectedDate?.getDate() ?? today.getDate());

  const { thoughts, decisions, sessions, isLoading } = useCalendarData(
    range.start,
    range.end
  );

  const grouped = useMemo(
    () => groupByDay({ thoughts, decisions, sessions }),
    [thoughts, decisions, sessions]
  );

  const calendarDays =
    viewMode === "month"
      ? buildCalendarGrid(year, month)
      : buildWeekGrid(
          year,
          month,
          selectedDate?.getDate() ?? today.getDate()
        );

  const navigatePrev = () => {
    if (viewMode === "month") {
      if (month === 0) {
        setMonth(11);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      const d = new Date(year, month, (selectedDate?.getDate() ?? today.getDate()) - 7);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setSelectedDate(d);
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      if (month === 11) {
        setMonth(0);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    } else {
      const d = new Date(year, month, (selectedDate?.getDate() ?? today.getDate()) + 7);
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setSelectedDate(d);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(now);
  };

  const selectedEntries = selectedDate
    ? grouped[dateKey(selectedDate)] ?? {
        thoughts: [],
        decisions: [],
        sessions: [],
      }
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            Month
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          <CalendarDays className="h-4 w-4 mr-1" />
          Today
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Thoughts
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Decisions
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Sessions
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid */}
        <Card className={cn("flex-1", selectedDate && "lg:flex-[2]")}>
          <CardContent className="p-2 sm:p-4">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAY_LABELS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-xs font-medium text-muted-foreground py-1"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    const key = dateKey(day);
                    const entries = grouped[key];
                    const counts: DayCounts = entries
                      ? {
                          thoughts: entries.thoughts.length,
                          decisions: entries.decisions.length,
                          sessions: entries.sessions.length,
                        }
                      : { thoughts: 0, decisions: 0, sessions: 0 };
                    const isCurrentMonth = day.getMonth() === month;
                    const isTodayCell = isToday(day);
                    const isSelected =
                      selectedDate && isSameDay(day, selectedDate);

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "relative flex flex-col items-center py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer",
                          "hover:bg-accent",
                          !isCurrentMonth && "opacity-40",
                          isTodayCell &&
                            "bg-accent/50 font-bold",
                          isSelected &&
                            "ring-2 ring-primary bg-accent"
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm sm:text-base",
                            isTodayCell &&
                              "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-xs sm:text-sm"
                          )}
                        >
                          {day.getDate()}
                        </span>
                        <DayDots counts={counts} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        {selectedDate && (
          <Card className="flex-1 lg:max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                >
                  Close
                </Button>
              </div>
              {selectedEntries && (
                <DayDetail entries={selectedEntries} date={selectedDate} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
