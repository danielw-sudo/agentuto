export interface LinearFitResult {
  slope: number;
  intercept: number;
  rSquared: number;
  equation: string;
}

export interface ExponentialFitResult {
  a: number; // y = a * exp(b * x)
  b: number; // decay/growth rate
  rSquared: number;
  equation: string;
}

/**
 * Classical Ordinary Least Squares Linear Regression: y = mx + b
 */
export function linearRegression(x: number[], y: number[]): LinearFitResult {
  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0, equation: 'Insufficient data' };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
    sumYY += y[i] * y[i];
  }

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) {
    return { slope: 0, intercept: sumY / n, rSquared: 0, equation: 'x is constant' };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Correlation Coefficient R^2
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const yPred = slope * x[i] + intercept;
    ssTot += (y[i] - yMean) * (y[i] - yMean);
    ssRes += (y[i] - yPred) * (y[i] - yPred);
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  const sign = intercept >= 0 ? '+' : '-';
  const equation = `y = ${slope.toFixed(4)}x ${sign} ${Math.abs(intercept).toFixed(4)}`;

  return { slope, intercept, rSquared, equation };
}

/**
 * Exponential Decay / Growth Fit: y = a * e^(b * x)
 * Linearized via ln(y) = ln(a) + b * x (filters y > 0)
 */
export function exponentialRegression(x: number[], y: number[]): ExponentialFitResult {
  const validX: number[] = [];
  const logY: number[] = [];

  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (y[i] > 1e-9) {
      validX.push(x[i]);
      logY.push(Math.log(y[i]));
    }
  }

  if (validX.length < 2) {
    return { a: 0, b: 0, rSquared: 0, equation: 'Non-positive data points' };
  }

  const linear = linearRegression(validX, logY);
  const a = Math.exp(linear.intercept);
  const b = linear.slope;
  const equation = `y = ${a.toFixed(4)} · e^(${b.toFixed(4)}x)`;

  return { a, b, rSquared: linear.rSquared, equation };
}
