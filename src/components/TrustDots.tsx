/**
 * TrustDots Component
 * 
 * Displays a 3×3+1 dot grid representing trust score (values 3-10).
 * Designed as an overlay badge on avatars, positioned bottom-right.
 * 
 * Visual spec:
 * - 10 dots total (3×3 grid + 1 centered on 4th row)
 * - Container: ~16×16px
 * - Dot size: 2px diameter
 * - Gap: 1px between dots
 * - Filled dots = trust score (3-10)
 * - Tooltip: "Trust grows with on-time settlements and confirmations."
 */

interface TrustDotsProps {
  /** Trust score between 3 and 10 */
  score: number;
  /** Optional className for positioning/styling */
  className?: string;
}

export function TrustDots({ score, className = "" }: TrustDotsProps) {
  // Clamp score between 3 and 10
  const clampedScore = Math.max(3, Math.min(10, score));
  
  // Grid layout: 3×3 + 1 centered = 10 dots total
  // Row 1: dots 0, 1, 2
  // Row 2: dots 3, 4, 5
  // Row 3: dots 6, 7, 8
  // Row 4: dot 9 (centered)
  
  const dots = Array.from({ length: 10 }, (_, i) => i);
  const isFilled = (index: number) => index < clampedScore;
  
  return (
    <div 
      className={`absolute ${className}`}
      title="Trust grows with on-time settlements and confirmations."
      style={{
        width: '16px',
        height: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 2px)',
        gridTemplateRows: 'repeat(4, 2px)',
        gap: '1px',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {dots.map((dotIndex) => {
        // Last dot (index 9) should be centered in 4th row
        const isLastDot = dotIndex === 9;
        
        return (
          <div
            key={dotIndex}
            className="rounded-full transition-colors duration-200"
            style={{
              width: '2px',
              height: '2px',
              backgroundColor: isFilled(dotIndex) 
                ? 'var(--success)' 
                : 'var(--muted)',
              opacity: isFilled(dotIndex) ? 1 : 0.3,
              // Center the last dot in its grid area
              gridColumn: isLastDot ? '2 / 3' : undefined,
              gridRow: isLastDot ? '4 / 5' : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
