/** Fractional ordering: moving one tile only rewrites that tile's position. */

export const POSITION_STEP = 1024;

/** Position for an item placed between `before` and `after` (either may be missing). */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return POSITION_STEP;
  if (before === undefined) return after! - POSITION_STEP;
  if (after === undefined) return before + POSITION_STEP;
  return (before + after) / 2;
}

/** Position for a list item moved to `toIndex` (indices in the list *after* removal). */
export function positionForMove(sortedPositions: number[], fromIndex: number, toIndex: number): number {
  const rest = sortedPositions.filter((_, i) => i !== fromIndex);
  return positionBetween(rest[toIndex - 1], rest[toIndex]);
}

/** Position at the end of the list. */
export function positionAtEnd(sortedPositions: number[]): number {
  return positionBetween(sortedPositions[sortedPositions.length - 1], undefined);
}
