import * as React from "react";
import { cn } from "@/lib/utils";

// Minimal chart container that provides consistent styling for Recharts
interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: Record<string, { label: string; color: string }>;
}

function ChartContainer({ className, config, children, ...props }: ChartContainerProps) {
  const style = Object.entries(config).reduce(
    (acc, [key, value]) => {
      acc[`--color-${key}`] = value.color;
      return acc;
    },
    {} as Record<string, string>
  );

  return (
    <div className={cn("w-full", className)} style={style} {...props}>
      {children}
    </div>
  );
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  formatter?: (value: number, name: string) => React.ReactNode;
}

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="text-xs text-muted-foreground mb-1">
        {labelFormatter ? labelFormatter(label ?? "") : label}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">
              {formatter ? formatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltipContent };
