/**
 * Pure mathematics for Shannon entropy and Huffman coding.
 *
 * Source: D. J. C. MacKay, Information Theory, Inference, and Learning Algorithms
 * (Cambridge University Press, 2003), chapters 2, 5, and 9.
 */

/**
 * Shannon entropy H(P) in bits:
 *   H(P) = - \sum_{p_i > 0} p_i \log_2(p_i)
 */
export function entropy(p: number[]): number {
  let h = 0;
  for (const pi of p) {
    if (pi > 0) {
      h -= pi * Math.log2(pi);
    }
  }
  return Math.abs(h) < 1e-15 || Object.is(h, -0) ? 0 : h;
}

/**
 * Binary entropy function H_2(p) in bits:
 *   H_2(p) = -p \log_2(p) - (1-p) \log_2(1-p)
 */
export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return entropy([p, 1 - p]);
}

/**
 * Case-folds to lowercase a-z and collapses any run of non-letters to a single space.
 */
export function foldTo27(text: string): string {
  return text.toLowerCase().replace(/[^a-z]+/g, ' ');
}

/**
 * Computes Huffman codeword lengths for an array of weights.
 * Returns an array of integer lengths matching the input weights array order.
 */
export function huffmanLengths(weights: number[]): number[] {
  if (weights.length === 0) return [];
  if (weights.length === 1) return [1];

  type Item = { weight: number; indices: number[] };
  const depths = new Array<number>(weights.length).fill(0);
  const items: Item[] = weights.map((w, i) => ({ weight: w, indices: [i] }));

  while (items.length > 1) {
    items.sort((a, b) => a.weight - b.weight);
    const n1 = items.shift()!;
    const n2 = items.shift()!;
    for (const idx of n1.indices) depths[idx]++;
    for (const idx of n2.indices) depths[idx]++;
    items.push({
      weight: n1.weight + n2.weight,
      indices: [...n1.indices, ...n2.indices],
    });
  }

  return depths;
}

/**
 * Builds a prefix-free Huffman code dictionary mapping each symbol to a binary string.
 */
export function buildHuffmanCode(counts: Record<string, number>): Record<string, string> {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  if (entries.length === 0) return {};
  if (entries.length === 1) return { [entries[0][0]]: '0' };

  interface Tree {
    weight: number;
    symbol?: string;
    left?: Tree;
    right?: Tree;
    seq: number;
  }

  let counter = 0;
  const trees: Tree[] = entries.map(([symbol, weight]) => ({
    weight,
    symbol,
    seq: counter++,
  }));

  while (trees.length > 1) {
    trees.sort((a, b) => a.weight - b.weight || a.seq - b.seq);
    const left = trees.shift()!;
    const right = trees.shift()!;
    trees.push({
      weight: left.weight + right.weight,
      left,
      right,
      seq: counter++,
    });
  }

  const root = trees[0];
  const code: Record<string, string> = {};

  function walk(node: Tree, prefix: string) {
    if (node.symbol !== undefined) {
      code[node.symbol] = prefix || '0';
      return;
    }
    if (node.left) walk(node.left, prefix + '0');
    if (node.right) walk(node.right, prefix + '1');
  }

  walk(root, '');
  return code;
}

/** Park–Miller generator: the same seed gives the same draw, so a learner can repeat it. */
export function seededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Draws n symbols (indices into probs) from a seeded source. */
export function drawSymbols(probs: number[], n: number, seed: number): number[] {
  const rng = seededRng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng();
    let cumulative = 0;
    let chosen = probs.length - 1;
    for (let k = 0; k < probs.length; k++) {
      cumulative += probs[k];
      if (r <= cumulative) {
        chosen = k;
        break;
      }
    }
    out.push(chosen);
  }
  return out;
}

/**
 * Encodes text into a bit string using the prefix-free code dictionary.
 */
export function encode(text: string, code: Record<string, string>): string {
  let bits = '';
  for (const ch of text) {
    const c = code[ch];
    if (c !== undefined) bits += c;
  }
  return bits;
}

/**
 * Decodes a bit string back into text using the prefix-free code dictionary.
 */
export function decode(bits: string, code: Record<string, string>): string {
  const inv: Record<string, string> = {};
  for (const [k, v] of Object.entries(code)) inv[v] = k;

  let result = '';
  let cur = '';
  for (let i = 0; i < bits.length; i++) {
    cur += bits[i];
    if (inv[cur] !== undefined) {
      result += inv[cur];
      cur = '';
    }
  }
  return result;
}
