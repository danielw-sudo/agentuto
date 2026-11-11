import React, { useMemo, useState } from 'react';
import { SiteLayout, focusRing } from '../../ui/site/SiteLayout';
import { TutorialStep } from '../kit/TutorialStep';
import { COMMUNITY } from '../../community';
import {
  binaryEntropy,
  buildHuffmanCode,
  encode,
  entropy,
  drawSymbols,
  foldTo27,
  huffmanLengths,
} from './entropy';

const DEFAULT_PARAGRAPH =
  'how much information does a sentence carry when we write in english some letters like e and t appear far more often than q or z if a code assigns short bit sequences to frequent symbols and longer sequences to rare ones the average message shrinks claude shannon showed that entropy sets the ultimate limit on this compression no lossless code can beat it';

function formatBits(val: number): string {
  if (Math.abs(val) < 1e-9) return '0.00';
  return val.toFixed(2);
}

const C3_SYMBOLS = ['a', 'b', 'c', 'd'];
const C3_CODE: Record<string, string> = { a: '0', b: '10', c: '110', d: '111' };
const C3_SOURCES = { ex510: [0.5, 0.25, 0.125, 0.125], uniform: [0.25, 0.25, 0.25, 0.25] };

// Huffman code for 27 equally likely symbols, measured from the engine rather than written by hand.
const UNIFORM27_L = huffmanLengths(new Array(27).fill(1)).reduce((s, l) => s + l, 0) / 27;

export const ShannonEntropyTutorial: React.FC = () => {
  // Step 1: Coin bias
  const [p, setP] = useState<number>(0.5);
  const [step1Prediction, setStep1Prediction] = useState<number | null>(null);
  // Feedback waits until the learner has moved the slider (predict, then try, then compare).
  const [step1Moved, setStep1Moved] = useState(false);

  // Step 2: C3 prefix code
  const [step2Preset, setStep2Preset] = useState<'ex510' | 'uniform'>('ex510');
  const [step2Prediction, setStep2Prediction] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(42);

  // Step 3: Text folding
  const [text, setText] = useState<string>(DEFAULT_PARAGRAPH);
  const [step3Prediction, setStep3Prediction] = useState<string | null>(null);

  // Step 4: Closing question
  const [step4Answer, setStep4Answer] = useState<string | null>(null);

  // Calculations for Step 1
  const step1H = binaryEntropy(p);

  // Calculations for Step 2
  const step2Data = useMemo(() => {
    const probs = C3_SOURCES[step2Preset];
    const H = entropy(probs);
    const symbols = drawSymbols(probs, 200, seed).map((k) => C3_SYMBOLS[k]);
    const counts = C3_SYMBOLS.map((s) => symbols.filter((x) => x === s).length);
    // Entropy of this draw's own letter mix: a code that meets Kraft can never average below it.
    const drawH = entropy(counts.map((c) => c / symbols.length));
    const bitString = symbols.map((s) => C3_CODE[s]).join('');
    const bitCount = bitString.length;
    const measuredL = bitCount / symbols.length;
    return { H, drawH, bitString, bitCount, measuredL };
  }, [step2Preset, seed]);

  // Calculations for Step 3
  const folded = useMemo(() => foldTo27(text), [text]);
  const step3Data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ch of folded) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
    const total = folded.length;
    if (total === 0) {
      return {
        H: 0,
        L: 0,
        bitCount: 0,
        code: {},
        counts: {},
        total: 0,
        sortedSymbols: [],
      };
    }
    const probs = Object.values(counts).map((c) => c / total);
    const H = entropy(probs);
    const code = buildHuffmanCode(counts);
    const encoded = encode(folded, code);
    const bitCount = encoded.length;
    const L = bitCount / total;

    const sortedSymbols = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

    return {
      H,
      L,
      bitCount,
      code,
      counts,
      total,
      sortedSymbols,
    };
  }, [folded]);

  return (
    <SiteLayout current="course" label="How many bits per letter? · Agentuto">
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14 space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <a href="#/" className={`hover:underline ${focusRing}`}>Courses</a>
          <span aria-hidden="true"> / </span>
          <a href="#/course/6.050J" className={`hover:underline ${focusRing}`}>6.050J</a>
          <span aria-hidden="true"> / </span>
          <span className="text-ink">How many bits per letter?</span>
        </nav>

        {/* Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[13px]">
            <span
              className="rounded-md px-2 py-0.5 font-medium"
              style={{ backgroundColor: 'var(--subject-computing-soft)', color: 'var(--subject-computing)' }}
            >
              Tutorial
            </span>
            <span className="text-muted">·</span>
            <a
              href="https://ocw.mit.edu/courses/6-050j-information-and-entropy-spring-2008/"
              target="_blank"
              rel="noreferrer"
              className={`rounded-md border border-line bg-card px-2 py-0.5 text-accent hover:border-accent ${focusRing}`}
            >
              MIT 6.050J
            </a>
          </div>
          <h1 className="font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">
            How many bits per letter?
          </h1>
          <p className="text-lg leading-relaxed text-muted sm:text-xl">
            Entropy <span className="font-mono text-ink">H</span> is the fewest bits per symbol any code can average,
            and a good code gets within one bit of it.
          </p>
          <p className="text-sm text-muted border-l-2 border-line pl-3">
            Source: D. J. C. MacKay, <em>Information Theory, Inference, and Learning Algorithms</em> (Cambridge University Press, 2003),
            chapters 2 and 5.
          </p>
        </header>

        {/* Step 1 */}
        <TutorialStep
          step={1}
          title="A coin"
          task="Set p = 0.1. MacKay gets 0.47 bits; do you?"
        >
          {/* Predict */}
          <div className="rounded-xl border border-line bg-sunken p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">1. Predict</h3>
            <p className="text-sm text-ink">
              Which coin bias produces the <strong>most uncertain</strong> outcome?
            </p>
            <div className="flex flex-wrap gap-2">
              {[0.1, 0.5, 0.9].map((bias) => (
                <button
                  key={bias}
                  type="button"
                  onClick={() => setStep1Prediction(bias)}
                  className={`min-h-9 rounded-lg px-4 font-mono text-sm transition-colors ${
                    step1Prediction === bias
                      ? 'bg-accent text-on-accent font-semibold'
                      : 'border border-line bg-card text-ink hover:border-accent'
                  } ${focusRing}`}
                >
                  p = {bias.toFixed(1)}
                </button>
              ))}
            </div>
            {step1Prediction !== null && (
              <p className="text-sm text-muted pt-1">
                {step1Moved
                  ? `You predicted p = ${step1Prediction.toFixed(1)}. Measured: ${[0.1, 0.5, 0.9]
                      .map((b) => `H₂(${b.toFixed(1)}) = ${formatBits(binaryEntropy(b))}`)
                      .join(', ')} bits.`
                  : 'Now move the slider below and compare.'}
              </p>
            )}
          </div>

          {/* Measure */}
          <div className="space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">2. Measure</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="step1-slider" className="font-medium text-ink">
                  Probability of heads <span className="font-mono text-accent">p = {p.toFixed(2)}</span>
                </label>
                <div className="font-mono text-sm">
                  H₂(p) = <span data-testid="step1-h" className="text-xl font-bold text-ink">{formatBits(step1H)}</span> <span className="text-muted">bits</span>
                </div>
              </div>
              <input
                id="step1-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={p}
                onChange={(e) => {
                  setP(parseFloat(e.target.value));
                  setStep1Moved(true);
                }}
                className="w-full accent-accent cursor-pointer"
              />
            </div>

            {/* SVG Curve */}
            <div className="rounded-xl border border-line bg-card p-4">
              <svg viewBox="0 0 320 124" className="mx-auto block w-full max-w-[26rem]" aria-label="Binary entropy function curve">
                {/* Horizontal baseline */}
                <line x1="20" y1="100" x2="300" y2="100" stroke="var(--line)" strokeWidth="1" />
                {/* 1 bit top line */}
                <line x1="20" y1="20" x2="300" y2="20" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 2" />
                <text x="14" y="24" fill="var(--muted)" fontSize="12" textAnchor="end" fontFamily="monospace">1</text>
                <text x="14" y="104" fill="var(--muted)" fontSize="12" textAnchor="end" fontFamily="monospace">0</text>
                <text x="20" y="119" fill="var(--muted)" fontSize="12" textAnchor="middle" fontFamily="monospace">0.0</text>
                <text x="160" y="119" fill="var(--muted)" fontSize="12" textAnchor="middle" fontFamily="monospace">0.5</text>
                <text x="300" y="119" fill="var(--muted)" fontSize="12" textAnchor="middle" fontFamily="monospace">1.0</text>

                {/* H2(p) Path */}
                {(() => {
                  let d = 'M 20 100';
                  for (let i = 1; i <= 100; i++) {
                    const frac = i / 100;
                    const hVal = binaryEntropy(frac);
                    const xCoord = 20 + frac * 280;
                    const yCoord = 100 - hVal * 80;
                    d += ` L ${xCoord.toFixed(1)} ${yCoord.toFixed(1)}`;
                  }
                  return (
                    <path
                      d={d}
                      fill="none"
                      style={{ stroke: 'var(--subject-computing)' }}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  );
                })()}

                {/* Marker */}
                {(() => {
                  const xCoord = 20 + p * 280;
                  const yCoord = 100 - step1H * 80;
                  return (
                    <g>
                      <line
                        x1={xCoord}
                        y1="100"
                        x2={xCoord}
                        y2={yCoord}
                        stroke="var(--subject-computing)"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={xCoord}
                        cy={yCoord}
                        r="5"
                        style={{ fill: 'var(--subject-computing)' }}
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>

            {Math.abs(p - 0.1) < 0.005 && (
              <p className="rounded-lg bg-sunken p-3 text-sm text-ink border border-line">
                At <span className="font-mono">p = 0.10</span>, the entropy is <span className="font-mono font-semibold">0.47 bits</span>, matching MacKay Example 9.5 (§9.5).
              </p>
            )}
          </div>
        </TutorialStep>

        {/* Step 2 */}
        <TutorialStep
          step={2}
          title="A code that fits"
          task="Predict whether C3 spends more than H on the uniform source, then draw."
        >
          {/* Predict */}
          <div className="rounded-xl border border-line bg-sunken p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">1. Predict</h3>
            <p className="text-sm text-ink">
              The prefix code <span className="font-mono">C₃ = &#123;a: 0, b: 10, c: 110, d: 111&#125;</span> was built
              for probabilities <span className="font-mono">&#123;1/2, 1/4, 1/8, 1/8&#125;</span>. If we send a <strong>uniform</strong> source
              instead (<span className="font-mono">&#123;1/4, 1/4, 1/4, 1/4&#125;</span>, where <span className="font-mono">H = 2.00</span>),
              will <span className="font-mono">C₃</span> spend more or fewer bits than <span className="font-mono">H</span>?
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'more', label: 'More: L > H' },
                { id: 'equal', label: 'Equal: L = H' },
                { id: 'less', label: 'Less: L < H' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStep2Prediction(opt.id)}
                  className={`min-h-9 rounded-lg px-4 text-sm transition-colors ${
                    step2Prediction === opt.id
                      ? 'bg-accent text-on-accent font-semibold'
                      : 'border border-line bg-card text-ink hover:border-accent'
                  } ${focusRing}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {step2Prediction && (
              <p className="text-sm text-muted pt-1">
                {step2Preset === 'uniform'
                  ? `You predicted ${
                      step2Prediction === 'more' ? 'L > H' : step2Prediction === 'equal' ? 'L = H' : 'L < H'
                    }. Measured on the uniform source: L = ${formatBits(step2Data.measuredL)}, H = ${formatBits(
                      step2Data.H,
                    )}, so L − H = ${formatBits(step2Data.measuredL - step2Data.H)} bits per symbol.`
                  : 'Now choose the uniform source below and draw.'}
              </p>
            )}
          </div>

          {/* Measure */}
          <div className="space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">2. Measure</h3>

            {/* Presets and Draw Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Distribution:</span>
                <button
                  type="button"
                  onClick={() => setStep2Preset('ex510')}
                  className={`min-h-8 rounded-md px-3 font-mono text-xs ${
                    step2Preset === 'ex510'
                      ? 'bg-accent text-on-accent font-semibold'
                      : 'border border-line bg-card text-ink hover:border-accent'
                  } ${focusRing}`}
                >
                  &#123;1/2, 1/4, 1/8, 1/8&#125; (Ex 5.10)
                </button>
                <button
                  type="button"
                  onClick={() => setStep2Preset('uniform')}
                  className={`min-h-8 rounded-md px-3 font-mono text-xs ${
                    step2Preset === 'uniform'
                      ? 'bg-accent text-on-accent font-semibold'
                      : 'border border-line bg-card text-ink hover:border-accent'
                  } ${focusRing}`}
                >
                  Uniform &#123;1/4 × 4&#125;
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSeed((s) => s + 1)}
                className={`min-h-8 rounded-md border border-line bg-card px-3 text-xs font-medium text-ink hover:border-accent ${focusRing}`}
              >
                New draw (200 symbols)
              </button>
            </div>

            {/* Readout comparisons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">Source entropy H</div>
                <div className="font-mono text-lg font-bold text-ink">
                  {formatBits(step2Data.H)} <span className="text-xs font-normal text-muted">bits/symbol</span>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">H of this draw</div>
                <div className="font-mono text-lg font-bold text-ink">
                  <span data-testid="step2-draw-h">{formatBits(step2Data.drawH)}</span>{' '}
                  <span className="text-xs font-normal text-muted">bits/symbol</span>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">Measured bits spent</div>
                <div className="font-mono text-lg font-bold text-ink">
                  {step2Data.bitCount} <span className="text-xs font-normal text-muted">bits (200 syms)</span>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">Measured average L</div>
                <div className="font-mono text-lg font-bold text-ink">
                  <span data-testid="step2-l">{formatBits(step2Data.measuredL)}</span>{' '}
                  <span className="text-xs font-normal text-muted">bits/symbol</span>
                </div>
              </div>
            </div>

            {/* Bit string preview */}
            <div className="rounded-xl border border-line bg-card p-4 space-y-1">
              <div className="text-xs text-muted">Encoded bit stream (first 64 bits):</div>
              <div className="font-mono text-xs break-all text-ink bg-sunken rounded p-2.5">
                {step2Data.bitString.slice(0, 64)}…
              </div>
            </div>

            <p className="text-sm text-muted leading-relaxed">
              Two hundred symbols never match the source exactly, so this draw has its own letter mix and its own entropy.
              The measured <span className="font-mono">L</span> is never below the draw&rsquo;s entropy; on average over many
              draws it comes to <span className="font-mono">Σ pᵢ lᵢ</span> for the source
              {step2Preset === 'ex510'
                ? ', which equals H for this source (MacKay Example 5.10).'
                : ', and the lengths of C₃ do not fit equal probabilities. Try a few draws.'}
            </p>
          </div>
        </TutorialStep>

        {/* Step 3 */}
        <TutorialStep
          step={3}
          title="Your own text"
          task="Predict where L lands between H and 5."
        >
          {/* Predict */}
          <div className="rounded-xl border border-line bg-sunken p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">1. Predict</h3>
            <p className="text-sm text-ink">
              Fixed-length coding requires <span className="font-mono">5 bits</span> per letter (since 2⁵ = 32 ≥ 27). Where will the
              Huffman code&rsquo;s average length <span className="font-mono">L</span> land relative to the source entropy <span className="font-mono">H</span>?
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'within1', label: 'Within 1 bit of H (H ≤ L < H + 1)' },
                { id: 'midway', label: 'Halfway between H and 5' },
                { id: 'over5', label: 'Above 5 bits' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStep3Prediction(opt.id)}
                  className={`min-h-9 rounded-lg px-4 text-sm transition-colors ${
                    step3Prediction === opt.id
                      ? 'bg-accent text-on-accent font-semibold'
                      : 'border border-line bg-card text-ink hover:border-accent'
                  } ${focusRing}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {step3Prediction && (
              <p className="text-sm text-muted pt-1">
                {step3Data.total > 0
                  ? `Measured on your text: L − H = ${formatBits(step3Data.L - step3Data.H)} bits and 5 − L = ${formatBits(
                      5 - step3Data.L,
                    )} bits per letter. Compare with your prediction.`
                  : 'Type some text below.'}
              </p>
            )}
          </div>

          {/* Measure */}
          <div className="space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">2. Measure</h3>

            {/* Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="user-text-input" className="block text-sm font-medium text-ink">
                Enter your text ({folded.length} folded symbols):
              </label>
              <textarea
                id="user-text-input"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`w-full rounded-xl border border-line bg-card p-3 font-mono text-sm text-ink focus:border-accent ${focusRing}`}
              />
              <p className="text-xs text-muted">
                Folding to 27 symbols: a–z case-folded, and every run of non-letters becomes one space.
              </p>
            </div>

            {/* Readout Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">Entropy H</div>
                <div className="font-mono text-xl font-bold text-ink">
                  <span data-testid="step3-h">{formatBits(step3Data.H)}</span>
                </div>
                <div className="text-[11px] text-muted">bits/letter</div>
              </div>
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">Huffman L</div>
                <div className="font-mono text-xl font-bold text-ink">
                  <span data-testid="step3-l">{formatBits(step3Data.L)}</span>
                </div>
                <div className="text-[11px] text-muted">bits/letter</div>
              </div>
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">Fixed-length</div>
                <div className="font-mono text-xl font-bold text-ink">5.00</div>
                <div className="text-[11px] text-muted">bits/letter</div>
              </div>
              <div className="rounded-xl border border-line bg-sunken p-3">
                <div className="text-xs text-muted">Compression</div>
                <div className="font-mono text-xl font-bold text-ink">
                  {step3Data.L > 0 ? `${((1 - step3Data.L / 5) * 100).toFixed(0)}%` : '0%'}
                </div>
                <div className="text-[11px] text-muted">vs 5-bit code</div>
              </div>
            </div>

            {/* Huffman Code Table */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                Huffman Code Table (Top symbols)
              </div>
              <div className="overflow-x-auto rounded-xl border border-line bg-card">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-line bg-sunken text-muted">
                    <tr>
                      <th className="px-3 py-2">Symbol</th>
                      <th className="px-3 py-2">Count</th>
                      <th className="px-3 py-2">Frequency</th>
                      <th className="px-3 py-2">Codeword</th>
                      <th className="px-3 py-2">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {step3Data.sortedSymbols.slice(0, 10).map((sym) => {
                      const count = step3Data.counts[sym];
                      const freq = count / step3Data.total;
                      const code = step3Data.code[sym] || '';
                      return (
                        <tr key={sym} className="hover:bg-sunken">
                          <td className="px-3 py-2 font-semibold text-ink">
                            {sym === ' ' ? '␣ [space]' : sym}
                          </td>
                          <td className="px-3 py-2 text-muted">{count}</td>
                          <td className="px-3 py-2 text-muted">{(freq * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-accent font-bold">{code}</td>
                          <td className="px-3 py-2 text-muted">{code.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TutorialStep>

        {/* Step 4 */}
        <TutorialStep
          step={4}
          title="Compare with English"
          task="Can any code average below H on this source?"
        >
          {/* Comparison Table */}
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-line bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-sunken font-mono text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Entropy H (bits)</th>
                    <th className="px-4 py-3">Huffman L (bits)</th>
                    <th className="px-4 py-3">Property</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono text-xs">
                  <tr className="hover:bg-sunken">
                    <td className="px-4 py-3 font-semibold text-ink font-sans">Your text (Step 3)</td>
                    <td className="px-4 py-3 text-ink">{formatBits(step3Data.H)}</td>
                    <td className="px-4 py-3 text-ink">{formatBits(step3Data.L)}</td>
                    <td className="px-4 py-3 text-muted font-sans">
                      {step3Data.total === 0
                        ? '—'
                        : step3Data.sortedSymbols.length === 1
                          ? 'One letter: H = 0, but a code still spends 1 bit'
                          : `L − H = ${formatBits(step3Data.L - step3Data.H)} bits`}
                    </td>
                  </tr>
                  <tr className="hover:bg-sunken">
                    <td className="px-4 py-3 font-semibold text-ink font-sans">English (MacKay Table 2.9)</td>
                    <td className="px-4 py-3 text-ink">4.11</td>
                    <td className="px-4 py-3 text-ink">4.15</td>
                    <td className="px-4 py-3 text-muted font-sans">L exceeds H by only 0.04 bits</td>
                  </tr>
                  <tr className="hover:bg-sunken">
                    <td className="px-4 py-3 font-semibold text-ink font-sans">Uniform 27 symbols</td>
                    <td className="px-4 py-3 text-ink">{formatBits(Math.log2(27))}</td>
                    <td className="px-4 py-3 text-ink" data-testid="uniform27-l">{formatBits(UNIFORM27_L)}</td>
                    <td className="px-4 py-3 text-muted font-sans">Maximum entropy log₂(27)</td>
                  </tr>
                  <tr className="hover:bg-sunken">
                    <td className="px-4 py-3 font-semibold text-ink font-sans">Fixed-length code</td>
                    <td className="px-4 py-3 text-muted">—</td>
                    <td className="px-4 py-3 text-ink">5.00</td>
                    <td className="px-4 py-3 text-muted font-sans">Requires ⌈log₂ 27⌉ = 5 bits</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Closing Question */}
          <div className="rounded-xl border border-line bg-sunken p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Closing Question</h3>
            <p className="text-sm text-ink font-medium">
              Can any code average below H on this source?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep4Answer('yes')}
                className={`min-h-9 rounded-lg px-4 text-sm transition-colors ${
                  step4Answer === 'yes'
                    ? 'border border-line bg-card text-muted'
                    : 'border border-line bg-card text-ink hover:border-accent'
                } ${focusRing}`}
              >
                Yes, with a smarter compression algorithm
              </button>
              <button
                type="button"
                onClick={() => setStep4Answer('no')}
                className={`min-h-9 rounded-lg px-4 text-sm transition-colors ${
                  step4Answer === 'no'
                    ? 'bg-accent text-on-accent font-semibold'
                    : 'border border-line bg-card text-ink hover:border-accent'
                } ${focusRing}`}
              >
                No, H is the fundamental limit
              </button>
            </div>
            {step4Answer && (
              <div className="pt-2 text-xs leading-relaxed text-ink border-t border-line">
                {step4Answer === 'no' ? (
                  <p>
                    <strong className="text-accent">No.</strong> Shannon&rsquo;s source coding theorem (1948; MacKay ch. 5) proves that
                    no uniquely decodable code can average fewer than <span className="font-mono">H</span> bits per symbol.
                  </p>
                ) : (
                  <p className="text-muted">
                    No: Shannon&rsquo;s source coding theorem (1948; MacKay ch. 5) establishes that <span className="font-mono">H</span> is
                    the mathematical lower bound on expected codeword length for any uniquely decodable symbol code.
                  </p>
                )}
              </div>
            )}
          </div>
        </TutorialStep>

        {/* Read More Links & Footer */}
        <section className="space-y-4 border-t border-line pt-8">
          <h2 className="font-display text-xl font-medium tracking-tight text-ink">Read more</h2>
          <ul className="list-none space-y-2 p-0 text-sm">
            <li>
              <a
                href="https://www.inference.org.uk/itila/book.html"
                target="_blank"
                rel="noreferrer"
                className={`font-medium text-accent underline underline-offset-4 ${focusRing}`}
              >
                David MacKay, <em>Information Theory, Inference, and Learning Algorithms</em> (Chapters 2 and 5)
              </a>
            </li>
            <li>
              <a
                href="https://ocw.mit.edu/courses/6-050j-information-and-entropy-spring-2008/"
                target="_blank"
                rel="noreferrer"
                className={`font-medium text-accent underline underline-offset-4 ${focusRing}`}
              >
                MIT OpenCourseWare 6.050J: Information and Entropy (Spring 2008)
              </a>
            </li>
            <li>
              <a
                href={COMMUNITY.physics}
                target="_blank"
                rel="noreferrer"
                className={`font-medium text-muted hover:text-ink underline underline-offset-4 ${focusRing}`}
              >
                Report a problem with this tutorial
              </a>
            </li>
          </ul>
        </section>
      </main>
    </SiteLayout>
  );
};
