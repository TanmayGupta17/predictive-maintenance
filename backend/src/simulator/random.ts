export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

export function pickOne<T>(items: readonly T[]) {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty collection');
  }

  return items[randomInt(0, items.length - 1)] as T;
}

export function chance(probability: number) {
  return Math.random() < probability;
}
