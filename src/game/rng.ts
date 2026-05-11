export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export function createSeededRng(seed: number): Rng {
  let value = seed >>> 0;

  const next = () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number) => {
    if (maxExclusive <= 0) {
      throw new Error("maxExclusive must be positive");
    }
    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty list");
    }
    return items[int(items.length)];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = int(index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  };

  return { next, int, pick, shuffle };
}

export function createSequenceRng(sequence: readonly number[]): Rng {
  let index = 0;

  const next = () => {
    if (index >= sequence.length) {
      throw new Error("Sequence RNG exhausted");
    }
    const value = sequence[index];
    index += 1;
    return value;
  };

  const int = (maxExclusive: number) => {
    if (maxExclusive <= 0) {
      throw new Error("maxExclusive must be positive");
    }
    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty list");
    }
    return items[int(items.length)];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let current = copy.length - 1; current > 0; current -= 1) {
      const swapIndex = int(current + 1);
      [copy[current], copy[swapIndex]] = [copy[swapIndex], copy[current]];
    }
    return copy;
  };

  return { next, int, pick, shuffle };
}
