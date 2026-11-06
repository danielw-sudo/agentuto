/**
 * A percentage for a readout that spans several decades, such as a transmission coefficient. One decimal is enough from
 * 1 % up; below that it keeps two significant figures, so a small value is not rounded to 0.0 %. Under 0.001 % it says
 * so rather than printing digits that mean nothing.
 */
export function formatPercent(percent: number): string {
  if (percent >= 1) return `${percent.toFixed(1)}%`;
  if (percent < 0.001) return '< 0.001%';
  return `${percent.toPrecision(2)}%`;
}
