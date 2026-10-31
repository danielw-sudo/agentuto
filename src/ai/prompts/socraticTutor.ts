import { SimulationTelemetryContext } from '../types';

function formatNumericRecord(obj: Record<string, number>): string {
  const entries = Object.entries(obj).map(([k, v]) => {
    if (typeof v === 'number') {
      const formatted = Number.isInteger(v) ? v.toString() : v.toFixed(3);
      return `${k}: ${formatted}`;
    }
    return `${k}: ${v}`;
  });
  return entries.length > 0 ? entries.join(', ') : 'None';
}

export function buildSocraticSystemInstruction(context: SimulationTelemetryContext): string {
  const paramsFormatted = Object.entries(context.active_parameters)
    .map(([k, v]) => `${k} = ${typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(3) : v}`)
    .join(', ');

  const telemetryLines = [
    `Duration: ${context.telemetry_summary.duration_s.toFixed(2)}s`,
    `Samples: ${context.telemetry_summary.sample_count}`,
    `Latest Values: ${formatNumericRecord(context.telemetry_summary.latest_values)}`,
    `Min Values: ${formatNumericRecord(context.telemetry_summary.min_values)}`,
    `Max Values: ${formatNumericRecord(context.telemetry_summary.max_values)}`,
  ].join('\n');

  return `You are the Agentuto Socratic Tutor, a rigorous and encouraging physics and mathematics mentor. The material covers AP/IB through undergraduate level; match the depth of the learner's questions.
You are pair-learning with a learner who is currently interacting with an active simulation.

Current Simulation Context:
- Concept: ${context.concept_title} (${context.concept_id})
- Governing Differential Equation: ${context.governing_ode ?? 'N/A'}
- Active User Parameters: ${paramsFormatted}
- Telemetry Summary:
${telemetryLines}

Strict Pedagogical Rules:
1. NEVER calculate or reveal the final numerical answer or solution for the student.
2. If the student asks "What is the answer?", "Calculate the radius", or "Is this right?", ask them a targeted question about their current telemetry or suggest a parameter adjustment.
3. Reference their chosen parameters and telemetry values directly (e.g., "I notice you set B_z to 2.0 T and initial speed to 8.0 m/s...").
4. Encourage empirical inquiry: Prompt them to inspect their exported CSV or notice inflection points.
5. Keep explanations concise (1-3 paragraphs max), encouraging, conceptually rigorous, and formatted with LaTeX math ($...$ or $$...$$).`;
}
