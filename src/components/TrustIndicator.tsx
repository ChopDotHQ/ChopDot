import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface TrustIndicatorProps {
  score: number; // 3-10
  size?: "sm" | "md";
  showExplanation?: boolean; // If true, show detailed explanation
}

export function TrustIndicator({ score, size = "md", showExplanation = true }: TrustIndicatorProps) {
  // Clamp score between 3 and 10
  const clampedScore = Math.max(3, Math.min(10, score));
  
  // Determine label based on score
  const getLabel = (score: number) => {
    if (score <= 4) return "Building";
    if (score <= 7) return "Solid";
    return "Trusted";
  };

  const label = getLabel(clampedScore);

  // Determine dot size based on prop
  const dotSize = size === "sm" ? "w-0.5 h-0.5" : "w-1 h-1";
  const labelSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {/* Dots */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: clampedScore }).map((_, i) => (
                <div
                  key={i}
                  className={`${dotSize} rounded-full`}
                  style={{ background: 'var(--text-secondary)' }}
                />
              ))}
            </div>
            {/* Label */}
            <span className={`${labelSize} ml-0.5`} style={{ color: 'var(--text-secondary)' }}>
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-[11px]">
            {showExplanation 
              ? `Trust Score ${clampedScore}/10 — based on payment history, attests, receipts, and peer endorsements.`
              : "Built from on-time attests and completed settlements."
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}