/** Removes items failing `keep` in place (no new array per step). */
export function compact<T>(items: T[], keep: (item: T) => boolean): void {
  let w = 0;
  for (let r = 0; r < items.length; r++) {
    const item = items[r]!;
    if (keep(item)) items[w++] = item;
  }
  items.length = w;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
