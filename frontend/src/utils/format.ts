export function safeFixed(value: number | null | undefined, digits = 0): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return (0).toFixed(digits);
  }
  return value.toFixed(digits);
}
