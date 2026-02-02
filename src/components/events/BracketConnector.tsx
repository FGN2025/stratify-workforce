import { cn } from '@/lib/utils';

interface BracketConnectorProps {
  /** Number of matches in the current (source) round */
  sourceMatchCount: number;
  /** Index of the current match in the source round (0-based) */
  matchIndex: number;
  /** Height of each match card in pixels */
  matchHeight?: number;
  /** Gap between matches in pixels */
  matchGap?: number;
  /** Whether this is the last round (finals) - no connectors needed */
  isLastRound?: boolean;
  /** Whether the match has a winner (show as active/highlighted) */
  hasWinner?: boolean;
}

/**
 * SVG connector that draws lines from match cards to their destination in the next round.
 * Two consecutive matches (e.g., match 0 and 1) feed into one match in the next round.
 */
export function BracketConnector({
  sourceMatchCount,
  matchIndex,
  matchHeight = 140,
  matchGap = 16,
  isLastRound = false,
  hasWinner = false,
}: BracketConnectorProps) {
  if (isLastRound) return null;

  // Determine if this is top or bottom of a pair
  const isTopOfPair = matchIndex % 2 === 0;
  const pairIndex = Math.floor(matchIndex / 2);
  
  // Calculate vertical positions
  const currentMatchCenterY = matchHeight / 2;
  
  // Next round has half the matches, so each match is spaced further apart
  // The target Y is the center point between this match and its pair
  const totalCurrentRoundHeight = sourceMatchCount * matchHeight + (sourceMatchCount - 1) * matchGap;
  const nextRoundMatchHeight = totalCurrentRoundHeight / (sourceMatchCount / 2);
  const targetCenterY = (pairIndex + 0.5) * nextRoundMatchHeight - (matchIndex * (matchHeight + matchGap));
  
  // SVG dimensions
  const width = 48;
  const height = matchHeight + matchGap;
  
  // Control points for curved connector
  const startX = 0;
  const startY = currentMatchCenterY;
  const endX = width;
  const endY = isTopOfPair 
    ? currentMatchCenterY + (matchHeight + matchGap) / 2
    : currentMatchCenterY - (matchHeight + matchGap) / 2;
  
  // Bezier control point for smooth curve
  const controlX = width * 0.6;
  
  return (
    <div className="flex items-center" style={{ height: matchHeight }}>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        style={{ 
          marginTop: isTopOfPair ? 0 : -matchGap,
          marginBottom: isTopOfPair ? -matchGap : 0,
        }}
      >
        {/* Main connector line */}
        <path
          d={`M ${startX} ${startY} 
              C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
          fill="none"
          className={cn(
            'transition-all duration-300',
            hasWinner 
              ? 'stroke-primary stroke-[2px]' 
              : 'stroke-border stroke-[1.5px]'
          )}
          strokeLinecap="round"
        />
        
        {/* Arrow head at the end */}
        <polygon
          points={`${endX - 4},${endY - 3} ${endX},${endY} ${endX - 4},${endY + 3}`}
          className={cn(
            hasWinner ? 'fill-primary' : 'fill-border'
          )}
        />
        
        {/* Glow effect for active connections */}
        {hasWinner && (
          <path
            d={`M ${startX} ${startY} 
                C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
            fill="none"
            className="stroke-primary/30 stroke-[6px] blur-sm"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Simplified straight connector for horizontal bracket layouts
 */
export function SimpleBracketConnector({
  isActive = false,
}: {
  isActive?: boolean;
}) {
  return (
    <div className="flex items-center px-2">
      <svg width="40" height="24" className="overflow-visible">
        {/* Horizontal line */}
        <line
          x1="0"
          y1="12"
          x2="32"
          y2="12"
          className={cn(
            'transition-all duration-300',
            isActive 
              ? 'stroke-primary stroke-[2px]' 
              : 'stroke-border stroke-[1.5px]'
          )}
          strokeLinecap="round"
        />
        {/* Arrow head */}
        <polygon
          points="28,8 36,12 28,16"
          className={cn(
            isActive ? 'fill-primary' : 'fill-border'
          )}
        />
        {/* Glow effect */}
        {isActive && (
          <line
            x1="0"
            y1="12"
            x2="32"
            y2="12"
            className="stroke-primary/30 stroke-[6px] blur-sm"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Bracket connector lines that merge two matches into one
 * This creates the classic tournament bracket look with merging lines
 */
export function MergingBracketConnector({
  matchCount,
  matchIndex,
  matchHeight = 140,
  matchGap = 16,
  hasWinner = false,
}: {
  matchCount: number;
  matchIndex: number;
  matchHeight?: number;
  matchGap?: number;
  hasWinner?: boolean;
}) {
  const isTopOfPair = matchIndex % 2 === 0;
  const width = 48;
  
  // Calculate the vertical distance to the merge point
  const halfTotalHeight = (matchHeight + matchGap) / 2;
  
  // The merge point Y depends on whether this is top or bottom
  const startY = matchHeight / 2;
  const midX = width / 2;
  const endX = width;
  
  // For top of pair: line goes down-right then right
  // For bottom of pair: line goes up-right then right
  const mergeY = isTopOfPair 
    ? startY + halfTotalHeight 
    : startY - halfTotalHeight;
  
  return (
    <div className="relative flex items-center" style={{ height: matchHeight }}>
      <svg
        width={width}
        height={matchHeight + matchGap}
        className="overflow-visible"
        viewBox={`0 ${isTopOfPair ? 0 : -matchGap} ${width} ${matchHeight + matchGap}`}
      >
        {/* Glow layer (rendered first, behind main lines) */}
        {hasWinner && (
          <path
            d={`M 0 ${startY} 
                L ${midX} ${startY}
                L ${midX} ${mergeY}
                L ${endX} ${mergeY}`}
            fill="none"
            className="stroke-primary/20 stroke-[8px] blur-sm"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Main path: horizontal -> vertical -> horizontal */}
        <path
          d={`M 0 ${startY} 
              L ${midX} ${startY}
              L ${midX} ${mergeY}
              L ${endX} ${mergeY}`}
          fill="none"
          className={cn(
            'transition-all duration-300',
            hasWinner 
              ? 'stroke-primary stroke-[2px]' 
              : 'stroke-muted-foreground/30 stroke-[1.5px]'
          )}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Arrow head */}
        <polygon
          points={`${endX - 5},${mergeY - 4} ${endX},${mergeY} ${endX - 5},${mergeY + 4}`}
          className={cn(
            hasWinner ? 'fill-primary' : 'fill-muted-foreground/30'
          )}
        />
      </svg>
    </div>
  );
}
