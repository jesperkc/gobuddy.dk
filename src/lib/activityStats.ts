export function formatDistance(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(metres)} m`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}t ${m}m` : `${m} min`;
}

export function formatElevation(metres: number): string {
  return `↑ ${Math.round(metres)} m`;
}
