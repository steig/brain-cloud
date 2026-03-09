import { cn } from "@/lib/utils";

interface BrainCloudLogoProps {
  size?: number;
  className?: string;
  variant?: "icon" | "full";
}

export function BrainCloudLogo({
  size = 24,
  className,
  variant = "icon",
}: BrainCloudLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Cloud shape */}
        <path
          d="M52 34c0-2.2-1.8-4-4-4h-1a10 10 0 0 0-19.6-3A8 8 0 1 0 20 42h28a4 4 0 0 0 4-4z"
          fill="currentColor"
          opacity={0.15}
        />
        <path
          d="M52 34c0-2.2-1.8-4-4-4h-1a10 10 0 0 0-19.6-3A8 8 0 1 0 20 42h28a4 4 0 0 0 4-4z"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Brain left hemisphere */}
        <path
          d="M26 28c0-3 2-5.5 5-6 0 0-1 3 1 5s-1 5-3 6"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Brain right hemisphere */}
        <path
          d="M38 28c0-3-2-5.5-5-6 0 0 1 3-1 5s1 5 3 6"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Brain stem / center line */}
        <path
          d="M32 22v16"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Neural connection dots */}
        <circle cx={28} cy={35} r={1.5} fill="currentColor" />
        <circle cx={36} cy={35} r={1.5} fill="currentColor" />
        <circle cx={32} cy={31} r={1.5} fill="currentColor" />
      </svg>
      {variant === "full" && (
        <span className="font-semibold whitespace-nowrap">Brain Cloud</span>
      )}
    </span>
  );
}
