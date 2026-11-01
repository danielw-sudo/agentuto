import { SIMULATION_CATALOG } from '../../simulations';
import { JournalValidationError } from './validation';
import type { JournalParameterRange, JournalSandboxSchema } from './types';

/**
 * The bridge between the sandbox manifest and the Inquiry Log.
 *
 * This is the only file in `src/core/journal` that imports `src/simulations`. The journal itself takes
 * a `JournalSandboxSchema` port so the layering stays manifest → core, never core → manifest
 * (Art. 5.1: the manifest is the single source of truth and everything else is derived from it).
 */

function requireRegistration(sandboxId: string) {
  const registration = SIMULATION_CATALOG[sandboxId];
  if (!registration) {
    throw new JournalValidationError(
      'sandboxId',
      `unknown sandbox "${sandboxId}" (catalog has: ${Object.keys(SIMULATION_CATALOG).join(', ')})`
    );
  }
  return registration;
}

/**
 * Everything the journal needs about one sandbox: parameter ranges and units from its own
 * descriptors, channel units from its own `telemetryUnits` declaration in the manifest.
 */
export function schemaFromCatalog(sandboxId: string): JournalSandboxSchema {
  const registration = requireRegistration(sandboxId);

  const parameters: Record<string, JournalParameterRange> = {};
  for (const descriptor of registration.paramDescriptors) {
    parameters[descriptor.id] = {
      min: descriptor.min,
      max: descriptor.max,
      unit: descriptor.unit,
    };
  }

  return {
    sandboxId,
    parameters,
    channels: { ...registration.telemetryUnits },
  };
}

/**
 * Telemetry channel names a sandbox actually emits, read from a real one-step engine run.
 *
 * Not used at runtime — `schemaFromCatalog` reads the declaration. This exists so the check in
 * `core/test/journal.test.ts` can hold the declaration against the engine and fail when the two
 * disagree in either direction (a declared channel the engine never emits, or an emitted channel
 * nobody declared, which is what an engine rename looks like).
 */
export async function engineChannelsFromSandbox(sandboxId: string): Promise<string[]> {
  const registration = requireRegistration(sandboxId);

  const { createEngine } = await registration.load();
  const engine = createEngine();
  try {
    engine.init(registration.defaultParams);
    engine.step(0.005);
    const snapshot = engine.getTelemetrySnapshot();
    return Object.keys(snapshot)
      .filter((channel) => channel !== 't' && typeof snapshot[channel] === 'number')
      .sort();
  } finally {
    engine.dispose();
  }
}
