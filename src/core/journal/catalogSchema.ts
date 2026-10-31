import { SIMULATION_CATALOG } from '../../simulations';
import { JournalValidationError } from './validation';
import type { JournalParameterRange, JournalSandboxSchema } from './types';

/**
 * The bridge between the sandbox manifest and the Inquiry Log.
 *
 * This is the only file in `src/core/journal` that imports `src/simulations`. The journal itself
 * takes a `JournalSandboxSchema` port so the layering stays manifest → core, never core → manifest
 * (Art. 5.1: the manifest is the single source of truth, and everything else is derived from it).
 */

/** Parameter ranges and units for one sandbox, read from its own descriptors. */
export function schemaFromCatalog(
  sandboxId: string,
  channels?: readonly string[]
): JournalSandboxSchema {
  const registration = SIMULATION_CATALOG[sandboxId];
  if (!registration) {
    throw new JournalValidationError(
      'sandboxId',
      `unknown sandbox "${sandboxId}" (catalog has: ${Object.keys(SIMULATION_CATALOG).join(', ')})`
    );
  }

  const parameters: Record<string, JournalParameterRange> = {};
  for (const descriptor of registration.paramDescriptors) {
    parameters[descriptor.id] = {
      min: descriptor.min,
      max: descriptor.max,
      unit: descriptor.unit,
    };
  }

  return channels === undefined ? { sandboxId, parameters } : { sandboxId, parameters, channels };
}

/**
 * Telemetry channel names a sandbox actually emits, read from a real one-step engine run.
 *
 * Read rather than declared because the manifest has no channel list to read yet — a gap tracked in
 * the hand-off report. Running the engine keeps this honest: it reports what the sandbox emits, so
 * a channel that is renamed in the engine stops validating here instead of silently accepting a
 * stale name forever.
 */
export function channelsFromSandbox(sandboxId: string): string[] {
  const registration = SIMULATION_CATALOG[sandboxId];
  if (!registration) {
    throw new JournalValidationError('sandboxId', `unknown sandbox "${sandboxId}"`);
  }

  const engine = registration.createEngine();
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

/** Convenience: ranges from the manifest plus channels from a live run. */
export function fullSchemaFromCatalog(sandboxId: string): JournalSandboxSchema {
  return schemaFromCatalog(sandboxId, channelsFromSandbox(sandboxId));
}
