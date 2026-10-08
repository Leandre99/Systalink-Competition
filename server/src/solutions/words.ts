const STOP = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'not', 'are', 'was', 'has', 'have', 'its',
  'les', 'des', 'une', 'est', 'pas', 'pour', 'dans', 'sur', 'par', 'qui', 'que', 'aux', 'avec',
  'error', 'erreur', 'node', 'npm', 'file', 'line', 'xxx',
]);

/** Lowercase meaningful words of a text (no stop words, no numbers), in order, without duplicates. */
export function solutionWords(text: string, max = 15): string[] {
  const words = new Set<string>();
  for (const w of text.toLowerCase().match(/[\p{L}][\p{L}\p{N}_]{2,}/gu) ?? []) {
    if (!STOP.has(w)) words.add(w);
    if (words.size >= max) break;
  }
  return [...words];
}
