import type { Option } from "@/lib/types/database";

export interface Pair {
  optionA: Option;
  optionB: Option;
  pairHash: string;
}

/**
 * Generate a deterministic hash for a pair of options
 * Ensures consistent ordering regardless of which option is passed first
 */
export function generatePairHash(optionA: string, optionB: string): string {
  if (optionA < optionB) {
    return `${optionA}-${optionB}`;
  }
  return `${optionB}-${optionA}`;
}

/**
 * Generate all unique pairs from a list of options
 * For n options, generates C(n,2) = n*(n-1)/2 pairs
 */
export function generateAllPairs(options: Option[]): Pair[] {
  const pairs: Pair[] = [];

  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      pairs.push({
        optionA: options[i],
        optionB: options[j],
        pairHash: generatePairHash(options[i].id, options[j].id),
      });
    }
  }

  return pairs;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * Creates a new array, doesn't mutate the original
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get the pairs that haven't been voted on yet
 */
export function getUnvotedPairs(
  allPairs: Pair[],
  votedPairHashes: Set<string>
): Pair[] {
  return allPairs.filter((pair) => !votedPairHashes.has(pair.pairHash));
}

/**
 * Calculate the number of pairs for n options
 */
export function calculatePairCount(optionCount: number): number {
  return (optionCount * (optionCount - 1)) / 2;
}
