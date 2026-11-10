import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import {
  SignalDetectionParams,
  SIGNAL_DETECTION_DEFAULT_PARAMS,
} from './SignalDetectionConfig';
import {
  dPrimeFromCounts,
  criterionFromCounts,
} from '../../../core/math/normalDistribution';

export interface BlockRecord {
  fa: number;
  h: number;
  dPrime: number;
  criterion: number;
  trials: number;
}

export interface SignalDetectionTrial {
  isSignal: boolean;
  x: number;
  decision: 'yes' | 'no';
  outcome: 'hit' | 'miss' | 'false_alarm' | 'correct_rejection';
}

export interface SignalDetectionState extends SimulationState {
  time: number;
  dPrime: number;
  criterion: number;
  signalProbability: number;
  trialRate: number;
  seed: number;
  trials: number;
  signalTrials: number;
  noiseTrials: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  hitRate: number;
  faRate: number;
  dPrimeMeasured: number;
  criterionMeasured: number;
  lastTrial: SignalDetectionTrial;
  history: BlockRecord[];
}

export class SignalDetectionEngine
  implements SimulationEngine<SignalDetectionParams, SignalDetectionState>
{
  private dPrime = 1.81;
  private criterion = 0.52;
  private signalProbability = 0.5;
  private trialRate = 20;
  private seed = 12345;

  private time = 0;
  private rngState = 12345;
  private hasSpare = false;
  private spare = 0;
  private trialCarry = 0;

  private trials = 0;
  private signalTrials = 0;
  private noiseTrials = 0;
  private hits = 0;
  private misses = 0;
  private falseAlarms = 0;
  private correctRejections = 0;

  private hitRate = 0;
  private faRate = 0;
  private dPrimeMeasured = 0;
  private criterionMeasured = 0;

  private history: BlockRecord[] = [];

  // Preallocated trial record to prevent allocation in step()
  private readonly lastTrial: SignalDetectionTrial = {
    isSignal: false,
    x: 0,
    decision: 'no',
    outcome: 'correct_rejection',
  };

  constructor() {
    this.init(SIGNAL_DETECTION_DEFAULT_PARAMS);
  }

  private random(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(this.rngState ^ (this.rngState >>> 15), 1 | this.rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private sampleNormal(): number {
    if (this.hasSpare) {
      this.hasSpare = false;
      return this.spare;
    }
    let u1 = this.random();
    while (u1 <= 1e-15) u1 = this.random();
    const u2 = this.random();
    const r = Math.sqrt(-2.0 * Math.log(u1));
    const theta = 2.0 * Math.PI * u2;
    this.spare = r * Math.sin(theta);
    this.hasSpare = true;
    return r * Math.cos(theta);
  }

  init(params: SignalDetectionParams): void {
    this.dPrime = params.dPrime;
    this.criterion = params.criterion;
    this.signalProbability = params.signalProbability;
    this.trialRate = params.trialRate;
    this.seed = params.seed ?? 12345;

    this.time = 0;
    this.rngState = this.seed | 0;
    this.hasSpare = false;
    this.spare = 0;
    this.trialCarry = 0;

    this.trials = 0;
    this.signalTrials = 0;
    this.noiseTrials = 0;
    this.hits = 0;
    this.misses = 0;
    this.falseAlarms = 0;
    this.correctRejections = 0;

    this.hitRate = 0;
    this.faRate = 0;
    this.dPrimeMeasured = 0;
    this.criterionMeasured = 0;

    this.history = [];

    this.lastTrial.isSignal = false;
    this.lastTrial.x = 0;
    this.lastTrial.decision = 'no';
    this.lastTrial.outcome = 'correct_rejection';
  }

  reset(params?: SignalDetectionParams): void {
    this.init(params ?? this.getParameters());
  }

  dispose(): void {
    // No external handles or unmanaged resources
  }

  setParameters(params: Partial<SignalDetectionParams>): void {
    const dPrimeChanged = params.dPrime !== undefined && params.dPrime !== this.dPrime;
    const criterionChanged = params.criterion !== undefined && params.criterion !== this.criterion;

    if (dPrimeChanged || criterionChanged) {
      // Start a new block: store previous block (FA, H) if any trials were run
      if (this.trials > 0) {
        this.history.push({
          fa: this.faRate,
          h: this.hitRate,
          dPrime: this.dPrime,
          criterion: this.criterion,
          trials: this.trials,
        });
      }

      // Reset block trial counts and measured values
      this.trials = 0;
      this.signalTrials = 0;
      this.noiseTrials = 0;
      this.hits = 0;
      this.misses = 0;
      this.falseAlarms = 0;
      this.correctRejections = 0;
      this.hitRate = 0;
      this.faRate = 0;
      this.dPrimeMeasured = 0;
      this.criterionMeasured = 0;
    }

    if (params.dPrime !== undefined) this.dPrime = params.dPrime;
    if (params.criterion !== undefined) this.criterion = params.criterion;
    if (params.signalProbability !== undefined) this.signalProbability = params.signalProbability;
    if (params.trialRate !== undefined) this.trialRate = params.trialRate;
    if (params.seed !== undefined && params.seed !== this.seed) {
      this.seed = params.seed;
      this.rngState = this.seed | 0;
      this.hasSpare = false;
    }
  }

  getParameters(): SignalDetectionParams {
    return {
      dPrime: this.dPrime,
      criterion: this.criterion,
      signalProbability: this.signalProbability,
      trialRate: this.trialRate,
      seed: this.seed,
    };
  }

  step(dt: number): void {
    this.time += dt;
    this.trialCarry += this.trialRate * dt;
    const count = Math.floor(this.trialCarry);
    this.trialCarry -= count;

    for (let i = 0; i < count; i += 1) {
      const isSignal = this.random() < this.signalProbability;
      const noise = this.sampleNormal();
      const x = isSignal ? noise + this.dPrime : noise;
      const yes = x > this.criterion;

      this.trials += 1;
      this.lastTrial.isSignal = isSignal;
      this.lastTrial.x = x;
      this.lastTrial.decision = yes ? 'yes' : 'no';

      if (isSignal) {
        this.signalTrials += 1;
        if (yes) {
          this.hits += 1;
          this.lastTrial.outcome = 'hit';
        } else {
          this.misses += 1;
          this.lastTrial.outcome = 'miss';
        }
      } else {
        this.noiseTrials += 1;
        if (yes) {
          this.falseAlarms += 1;
          this.lastTrial.outcome = 'false_alarm';
        } else {
          this.correctRejections += 1;
          this.lastTrial.outcome = 'correct_rejection';
        }
      }
    }

    if (count > 0) {
      this.hitRate = this.signalTrials > 0 ? this.hits / this.signalTrials : 0;
      this.faRate = this.noiseTrials > 0 ? this.falseAlarms / this.noiseTrials : 0;
      this.dPrimeMeasured = dPrimeFromCounts(
        this.hits,
        this.signalTrials,
        this.falseAlarms,
        this.noiseTrials
      );
      this.criterionMeasured = criterionFromCounts(this.falseAlarms, this.noiseTrials);
    }
  }

  getState(): SignalDetectionState {
    return {
      time: this.time,
      dPrime: this.dPrime,
      criterion: this.criterion,
      signalProbability: this.signalProbability,
      trialRate: this.trialRate,
      seed: this.seed,
      trials: this.trials,
      signalTrials: this.signalTrials,
      noiseTrials: this.noiseTrials,
      hits: this.hits,
      misses: this.misses,
      falseAlarms: this.falseAlarms,
      correctRejections: this.correctRejections,
      hitRate: this.hitRate,
      faRate: this.faRate,
      dPrimeMeasured: this.dPrimeMeasured,
      criterionMeasured: this.criterionMeasured,
      lastTrial: this.lastTrial,
      history: this.history,
    };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    return {
      t: this.time,
      trials: this.trials,
      signal_trials: this.signalTrials,
      noise_trials: this.noiseTrials,
      hits: this.hits,
      misses: this.misses,
      false_alarms: this.falseAlarms,
      correct_rejections: this.correctRejections,
      hit_rate: this.hitRate,
      fa_rate: this.faRate,
      d_prime_measured: this.dPrimeMeasured,
      criterion_measured: this.criterionMeasured,
    };
  }
}
