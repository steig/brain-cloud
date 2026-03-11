import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface DateRange {
  from: string;
  to: string;
}

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 0 },
] as const;

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DateRangeFilterProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activePreset = !showCustom && value
    ? presets.find((p) =>
        p.days === 0
          ? value.from === "" && value.to === ""
          : value.from === daysAgoISO(p.days)
      )
    : null;

  const handlePreset = (days: number) => {
    setShowCustom(false);
    if (days === 0) {
      onChange(null);
    } else {
      onChange({ from: daysAgoISO(days), to: todayISO() });
    }
  };

  const handleCustomApply = () => {
    if (customFrom || customTo) {
      onChange({
        from: customFrom || "2020-01-01",
        to: customTo || todayISO(),
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.label}
          variant={
            (!showCustom && ((p.days === 0 && !value) || (activePreset === p)))
              ? "default"
              : "outline"
          }
          size="sm"
          onClick={() => handlePreset(p.days)}
        >
          {p.label}
        </Button>
      ))}
      <Button
        variant={showCustom ? "default" : "outline"}
        size="sm"
        onClick={() => setShowCustom(!showCustom)}
      >
        Custom
      </Button>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
          <Button size="sm" onClick={handleCustomApply}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
