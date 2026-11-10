import React from 'react';
import { formatFormula } from '../../ui/formula';

function isElement(node: React.ReactNode, type: 'sub' | 'sup', text: string): boolean {
  if (!React.isValidElement(node)) return false;
  return node.type === type && (node.props as { children?: React.ReactNode }).children === text;
}

export function runFormulaVerification(): void {
  // 1. T_C / T_H -> 2 subscripts
  const tcTh = formatFormula('T_C / T_H');
  if (!Array.isArray(tcTh) || tcTh.length !== 4) {
    throw new Error(`formatFormula("T_C / T_H") expected 4 parts, got ${JSON.stringify(tcTh)}`);
  }
  if (tcTh[0] !== 'T' || !isElement(tcTh[1], 'sub', 'C') || tcTh[2] !== ' / T' || !isElement(tcTh[3], 'sub', 'H')) {
    throw new Error(`formatFormula("T_C / T_H") structure mismatch: ${JSON.stringify(tcTh)}`);
  }

  // 2. k_B -> 1 subscript
  const kB = formatFormula('k_B');
  if (!Array.isArray(kB) || kB.length !== 2 || kB[0] !== 'k' || !isElement(kB[1], 'sub', 'B')) {
    throw new Error(`formatFormula("k_B") mismatch: ${JSON.stringify(kB)}`);
  }

  // 3. V_{cm} -> 1 subscript with braces
  const vcm = formatFormula('V_{cm}');
  if (!Array.isArray(vcm) || vcm.length !== 2 || vcm[0] !== 'V' || !isElement(vcm[1], 'sub', 'cm')) {
    throw new Error(`formatFormula("V_{cm}") mismatch: ${JSON.stringify(vcm)}`);
  }

  // 4. C_d -> 1 subscript
  const cd = formatFormula('C_d');
  if (!Array.isArray(cd) || cd.length !== 2 || cd[0] !== 'C' || !isElement(cd[1], 'sub', 'd')) {
    throw new Error(`formatFormula("C_d") mismatch: ${JSON.stringify(cd)}`);
  }

  // 5. x^2 -> 1 superscript
  const x2 = formatFormula('x^2');
  if (!Array.isArray(x2) || x2.length !== 2 || x2[0] !== 'x' || !isElement(x2[1], 'sup', '2')) {
    throw new Error(`formatFormula("x^2") mismatch: ${JSON.stringify(x2)}`);
  }

  // 6. String with no markers -> plain string or single node
  const plain = formatFormula('F = ma');
  if (plain !== 'F = ma' && (!Array.isArray(plain) || plain.length !== 1 || plain[0] !== 'F = ma')) {
    throw new Error(`formatFormula("F = ma") mismatch: ${JSON.stringify(plain)}`);
  }

  console.log('  ✓ formatFormula turns _ and ^ into sub/sup elements and preserves plain text');
}
