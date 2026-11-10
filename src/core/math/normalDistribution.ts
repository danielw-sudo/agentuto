/**
 * Normal distribution mathematics and Signal Detection Theory estimators.
 */

const A = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
const B = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
const C = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];

const P_LOW = 0.02425;
const P_HIGH = 1 - P_LOW;
const SQRT_2PI = Math.sqrt(2 * Math.PI);
const SQRT_2 = Math.SQRT2;

export function erf(x: number): number {
  const p = 0.3275911;
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a[4] * t + a[3]) * t + a[2]) * t + a[1]) * t + a[0]) * t * Math.exp(-absX * absX);
  return sign * y;
}

export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / SQRT_2));
}

export function invNormalCdf(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  let x: number;
  if (p < P_LOW) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
        ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
  } else if (p <= P_HIGH) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
        (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
         ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
  }
  return x;
}

export function dPrimeFromCounts(h: number, nSig: number, fa: number, nNoise: number): number {
  if (nSig <= 0 || nNoise <= 0) return 0;
  let hr = h / nSig;
  if (hr <= 0) hr = 1 / (2 * nSig);
  else if (hr >= 1) hr = 1 - 1 / (2 * nSig);

  let far = fa / nNoise;
  if (far <= 0) far = 1 / (2 * nNoise);
  else if (far >= 1) far = 1 - 1 / (2 * nNoise);

  return invNormalCdf(hr) - invNormalCdf(far);
}

export function criterionFromCounts(fa: number, nNoise: number): number {
  if (nNoise <= 0) return 0;
  let far = fa / nNoise;
  if (far <= 0) far = 1 / (2 * nNoise);
  else if (far >= 1) far = 1 - 1 / (2 * nNoise);
  return -invNormalCdf(far);
}
