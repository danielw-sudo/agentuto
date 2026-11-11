import {
  entropy,
  binaryEntropy,
  foldTo27,
  huffmanLengths,
  buildHuffmanCode,
  encode,
  decode,
  drawSymbols,
} from '../../tutorials/shannon-entropy/entropy';

/**
 * Closed-form and external anchor verification for Shannon entropy and Huffman coding.
 *
 * Source: D. J. C. MacKay, Information Theory, Inference, and Learning Algorithms
 * (Cambridge University Press, 2003). https://www.inference.org.uk/itila/book.html
 */
export function runEntropyVerification(): void {
  // 1. Binary entropy (Example 9.5, §9.5)
  const h01 = binaryEntropy(0.1);
  if (Math.abs(h01 - 0.47) >= 0.005) {
    throw new Error(`binary entropy H2(0.1) = ${h01.toFixed(6)}, published answer 0.47 bits`);
  }
  if (Math.abs(h01 - 0.468996) >= 1e-5) {
    throw new Error(`binary entropy H2(0.1) = ${h01.toFixed(6)}, expected 0.468996`);
  }

  // Symmetry and maximum
  const h09 = binaryEntropy(0.9);
  if (Math.abs(h09 - 0.468996) >= 1e-5) {
    throw new Error(`binary entropy H2(0.9) = ${h09.toFixed(6)}, expected 0.468996`);
  }
  const h05 = binaryEntropy(0.5);
  if (h05 !== 1) {
    throw new Error(`binary entropy H2(0.5) = ${h05}, expected 1 exactly`);
  }

  // 2. Example 5.10: P = {1/2, 1/4, 1/8, 1/8}, code C3 = {0, 10, 110, 111}
  const p510 = [0.5, 0.25, 0.125, 0.125];
  const h510 = entropy(p510);
  if (Math.abs(h510 - 1.75) >= 1e-6) {
    throw new Error(`Example 5.10 H = ${h510}, expected 1.75`);
  }
  const len510 = huffmanLengths(p510);
  const l510 = p510.reduce((acc, p, i) => acc + p * len510[i], 0);
  if (Math.abs(l510 - 1.75) >= 1e-6) {
    throw new Error(`Example 5.10 L = ${l510}, expected 1.75`);
  }

  // 3. Example 5.15 (Huffman): P = {0.25, 0.25, 0.2, 0.15, 0.15}
  const p515 = [0.25, 0.25, 0.2, 0.15, 0.15];
  const h515 = entropy(p515);
  if (Math.abs(h515 - 2.2855) >= 0.005 || Math.abs(h515 - 2.285475) >= 1e-5) {
    throw new Error(`Example 5.15 H = ${h515}, expected 2.2855 (2.285475)`);
  }
  const len515 = huffmanLengths(p515);
  const sortedLen515 = [...len515].sort((a, b) => a - b);
  if (JSON.stringify(sortedLen515) !== JSON.stringify([2, 2, 2, 3, 3])) {
    throw new Error(`Example 5.15 lengths = [${len515.join(', ')}], expected multiset [2, 2, 2, 3, 3]`);
  }
  const l515 = p515.reduce((acc, p, i) => acc + p * len515[i], 0);
  if (Math.abs(l515 - 2.30) >= 0.005 || Math.abs(l515 - 2.30) >= 1e-6) {
    throw new Error(`Example 5.15 L = ${l515}, expected 2.30`);
  }

  // 4. Example 2.12 & 5.17: English letter probabilities (Table 2.9)
  const rawTable29 = [
    0.0575, 0.0128, 0.0263, 0.0285, 0.0913, 0.0173, 0.0133, 0.0313, 0.0599, 0.0006, 0.0084, 0.0335,
    0.0235, 0.0596, 0.0689, 0.0192, 0.0008, 0.0508, 0.0567, 0.0706, 0.0334, 0.0069, 0.0119, 0.0073,
    0.0164, 0.0007, 0.1928,
  ];
  const sum29 = rawTable29.reduce((a, b) => a + b, 0); // 1.0002
  const pTable29 = rawTable29.map((x) => x / sum29);
  const h29 = entropy(pTable29);
  if (Math.abs(h29 - 4.11) >= 0.005) {
    throw new Error(`Table 2.9 H = ${h29.toFixed(6)}, published answer ~4.11 bits`);
  }
  if (Math.abs(h29 - 4.108913) >= 1e-5) {
    throw new Error(`Table 2.9 H = ${h29.toFixed(6)}, expected 4.108913`);
  }
  const len29 = huffmanLengths(pTable29);
  const l29 = pTable29.reduce((acc, p, i) => acc + p * len29[i], 0);
  if (Math.abs(l29 - 4.15) >= 0.005) {
    throw new Error(`Table 2.9 Huffman L = ${l29.toFixed(6)}, published answer 4.15 bits`);
  }
  if (Math.abs(l29 - 4.145371) >= 1e-5) {
    throw new Error(`Table 2.9 Huffman L = ${l29.toFixed(6)}, expected 4.145371`);
  }

  // 5. Uniform 27 symbols
  const pUniform27 = new Array(27).fill(1 / 27);
  const hUniform27 = entropy(pUniform27);
  const wantUniform27 = Math.log2(27);
  if (Math.abs(hUniform27 - wantUniform27) >= 1e-6 || Math.abs(hUniform27 - 4.754888) >= 1e-5) {
    throw new Error(`uniform 27 symbols H = ${hUniform27}, expected log2(27) = 4.754888`);
  }
  // Huffman on 27 equal weights: 16 < 27 < 32, so 27 − (32 − 27) = 22 symbols get 5 bits and 5 get 4 bits.
  // L = (22·5 + 5·4) / 27 = 130/27 (step 4 of the tutorial shows this row).
  const lUniform27 = huffmanLengths(new Array(27).fill(1)).reduce((s, l) => s + l, 0) / 27;
  if (Math.abs(lUniform27 - 130 / 27) >= 1e-9) {
    throw new Error(`uniform 27 symbols Huffman L = ${lUniform27.toFixed(6)}, expected 130/27 = 4.814815`);
  }

  // 5b. Step 2 of the tutorial: C3 on a seeded draw. C3 meets Kraft with equality (1/2 + 1/4 + 1/8 + 1/8 = 1), so on
  // any draw its measured L = H(draw) + D(draw ‖ 2^−l) is at least the entropy of that draw's own letter mix, even
  // when it falls below the source's H.
  const c3 = { a: '0', b: '10', c: '110', d: '111' };
  const c3Symbols = ['a', 'b', 'c', 'd'];
  let belowSourceH = 0;
  for (const probs of [[0.5, 0.25, 0.125, 0.125], [0.25, 0.25, 0.25, 0.25]]) {
    for (let s = 1; s <= 200; s++) {
      const draw = drawSymbols(probs, 200, s).map((k) => c3Symbols[k]).join('');
      const counts = c3Symbols.map((sym) => [...draw].filter((x) => x === sym).length);
      if (counts.reduce((a, b) => a + b, 0) !== 200) throw new Error(`seed ${s}: draw has ${draw.length} symbols, not 200`);
      const hDraw = -counts.filter((c) => c > 0).reduce((acc, c) => acc + (c / 200) * Math.log2(c / 200), 0);
      const lDraw = encode(draw, c3).length / 200;
      if (lDraw < hDraw - 1e-12) throw new Error(`seed ${s}: C3 measured L = ${lDraw} is below the draw's entropy ${hDraw}`);
      if (lDraw < entropy(probs)) belowSourceH++;
    }
  }
  // The point of showing the draw's entropy: some draws do measure below the source's H.
  if (belowSourceH === 0) throw new Error('no seeded draw measured L below the source H; the step 2 explanation would be idle');

  // 6. Text "abracadabra"
  const foldedAbra = foldTo27('abracadabra');
  if (foldedAbra !== 'abracadabra') {
    throw new Error(`foldTo27("abracadabra") = "${foldedAbra}", expected "abracadabra"`);
  }
  const countsAbra: Record<string, number> = {};
  for (const c of foldedAbra) countsAbra[c] = (countsAbra[c] ?? 0) + 1;
  const nAbra = foldedAbra.length;
  const pAbra = Object.values(countsAbra).map((cnt) => cnt / nAbra);
  const hAbra = entropy(pAbra);
  if (Math.abs(hAbra - 2.040373) >= 1e-5) {
    throw new Error(`"abracadabra" H = ${hAbra.toFixed(6)}, expected 2.040373`);
  }
  const codeAbra = buildHuffmanCode(countsAbra);
  const encAbra = encode(foldedAbra, codeAbra);
  const lAbra = encAbra.length / nAbra;
  if (encAbra.length !== 23 || Math.abs(lAbra - 23 / 11) >= 1e-5) {
    throw new Error(`"abracadabra" Huffman L = ${encAbra.length}/11 = ${lAbra.toFixed(6)}, expected 23/11 = 2.090909`);
  }
  if (decode(encAbra, codeAbra) !== foldedAbra) {
    throw new Error('"abracadabra" decoding failed to recover original text');
  }

  // 7. Text "mississippi"
  const foldedMiss = foldTo27('mississippi');
  const countsMiss: Record<string, number> = {};
  for (const c of foldedMiss) countsMiss[c] = (countsMiss[c] ?? 0) + 1;
  const nMiss = foldedMiss.length;
  const pMiss = Object.values(countsMiss).map((cnt) => cnt / nMiss);
  const hMiss = entropy(pMiss);
  if (Math.abs(hMiss - 1.823068) >= 1e-5) {
    throw new Error(`"mississippi" H = ${hMiss.toFixed(6)}, expected 1.823068`);
  }
  const codeMiss = buildHuffmanCode(countsMiss);
  const encMiss = encode(foldedMiss, codeMiss);
  const lMiss = encMiss.length / nMiss;
  if (encMiss.length !== 21 || Math.abs(lMiss - 21 / 11) >= 1e-5) {
    throw new Error(`"mississippi" Huffman L = ${encMiss.length}/11 = ${lMiss.toFixed(6)}, expected 21/11 = 1.909091`);
  }
  if (decode(encMiss, codeMiss) !== foldedMiss) {
    throw new Error('"mississippi" decoding failed to recover original text');
  }

  // 8. One repeated symbol "aaaa"
  const hAaaa = entropy([1]);
  if (hAaaa !== 0 || Object.is(hAaaa, -0)) {
    throw new Error(`"aaaa" H = ${hAaaa}, expected 0 without negative sign`);
  }
  const formattedAaaa = hAaaa.toFixed(2);
  if (formattedAaaa === '-0.00') {
    throw new Error(`"aaaa" formatted H should not be "-0.00"`);
  }

  // 9. 200 seeded random distributions of 2 to 27 symbols
  // Linear congruential generator (LCG) for deterministic reproducible testing
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const alphabet = 'abcdefghijklmnopqrstuvwxyz ';

  for (let trial = 0; trial < 200; trial++) {
    const k = 2 + Math.floor(rand() * 26); // 2 to 27 symbols
    const weights: number[] = [];
    const counts: Record<string, number> = {};
    let sumW = 0;
    for (let i = 0; i < k; i++) {
      const sym = alphabet[i];
      const w = 1 + Math.floor(rand() * 100);
      weights.push(w);
      counts[sym] = w;
      sumW += w;
    }

    const p = weights.map((w) => w / sumW);
    const H = entropy(p);

    // Property: 0 <= H <= log2(k)
    const maxH = Math.log2(k);
    if (H < -1e-12 || H > maxH + 1e-12) {
      throw new Error(`trial ${trial}: H = ${H} violates 0 <= H <= log2(${k}) = ${maxH}`);
    }

    // Property: H <= L_Huffman < H + 1
    const lens = huffmanLengths(weights);
    const L = p.reduce((acc, prob, idx) => acc + prob * lens[idx], 0);

    if (L < H - 1e-12) {
      throw new Error(`trial ${trial}: L = ${L} < H = ${H} violates source coding theorem (L >= H)`);
    }
    if (L >= H + 1 + 1e-12) {
      throw new Error(`trial ${trial}: L = ${L} >= H + 1 = ${H + 1} violates Huffman bound (L < H + 1)`);
    }

    // Build tree, test prefix-freeness and round-trip
    const code = buildHuffmanCode(counts);
    const codewords = Object.values(code);

    // Prefix-free check
    for (let i = 0; i < codewords.length; i++) {
      for (let j = 0; j < codewords.length; j++) {
        if (i !== j && codewords[j].startsWith(codewords[i])) {
          throw new Error(
            `trial ${trial}: code is not prefix-free: "${codewords[i]}" is prefix of "${codewords[j]}"`
          );
        }
      }
    }

    // Encoded bit count equals sum(count_i * length_i)
    let expectedBits = 0;
    let sampleText = '';
    for (let i = 0; i < k; i++) {
      const sym = alphabet[i];
      const count = counts[sym];
      const codeword = code[sym];
      expectedBits += count * codeword.length;
      // add some symbols to sampleText to test encode/decode round trip
      sampleText += sym.repeat(Math.min(count, 3));
    }

    const encodedSample = encode(sampleText, code);
    const decodedSample = decode(encodedSample, code);
    if (decodedSample !== sampleText) {
      throw new Error(`trial ${trial}: round-trip decode failed: got "${decodedSample}", expected "${sampleText}"`);
    }

    // The encoder really spends Σ countᵢ × lengthᵢ bits on the full text (the page reports encode(...).length).
    let fullText = '';
    for (let i = 0; i < k; i++) fullText += alphabet[i].repeat(counts[alphabet[i]]);
    const encodedBits = encode(fullText, code).length;
    if (encodedBits !== expectedBits) {
      throw new Error(`trial ${trial}: encoded ${encodedBits} bits, but Σ countᵢ × lengthᵢ = ${expectedBits}`);
    }
    // The page builds its code with buildHuffmanCode; the bound above was checked on huffmanLengths. Both are optimal,
    // so ties may change codewords but not the total.
    const lensTotal = weights.reduce((acc, w, i) => acc + w * lens[i], 0);
    if (encodedBits !== lensTotal) {
      throw new Error(`trial ${trial}: buildHuffmanCode spends ${encodedBits} bits, huffmanLengths ${lensTotal}`);
    }
  }

  console.log(
    '✓ Shannon entropy and Huffman coding verified: MacKay anchors (H2(0.1)=0.47, Ex 5.10 H=L=1.75, Ex 5.15 L=2.30, Ex 2.12 H=4.11, Ex 5.17 L=4.15), uniform, text folds, prefix-freeness and H <= L < H+1 across 200 random trials'
  );
}
